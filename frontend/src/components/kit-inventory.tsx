"use client"

import { forwardRef, useMemo, useRef, useState, type ReactNode } from "react"
import { PopoverAnchor } from "@radix-ui/react-popover"

import { Input } from "@/components/ui/input"
import { NumberInput } from "@/components/ui/number-input"
import { Popover, PopoverContent } from "@/components/ui/popover"
import { lootyItemImageUrl } from "@/lib/looty-item-image"
import type { RustItemInfo } from "@/lib/rust-items"

export type KitSlotItem = {
    shortname: string
    amount: number
    slot?: string | null
    condition?: number | null
}

const WEAR_SLOTS = [
    { id: "head", label: "Head" },
    { id: "face", label: "Face" },
    { id: "chest", label: "Chest" },
    { id: "legs", label: "Legs" },
    { id: "hands", label: "Hands" },
    { id: "feet", label: "Feet" },
    { id: "backpack", label: "Backpack" },
] as const

const MAIN_SLOTS = 24
const BELT_SLOTS = 6

function wearId(id: string) {
    return `wear:${id}`
}

function mainId(index: number) {
    return `main:${index}`
}

function beltId(index: number) {
    return `belt:${index}`
}

export function layoutKitItems(items: KitSlotItem[]): Map<string, KitSlotItem> {
    const placed = new Map<string, KitSlotItem>()
    const loose: KitSlotItem[] = []
    for (const item of items) {
        const slot = item.slot && !placed.has(item.slot) ? item.slot : null
        if (slot && isKnownSlot(slot)) {
            placed.set(slot, { ...item, slot })
        } else {
            loose.push(item)
        }
    }
    let main = 0
    for (const item of loose) {
        while (main < MAIN_SLOTS && placed.has(mainId(main))) main += 1
        if (main >= MAIN_SLOTS) break
        const slot = mainId(main)
        placed.set(slot, { ...item, slot })
        main += 1
    }
    return placed
}

function isKnownSlot(slot: string) {
    if (/^wear:(head|face|chest|legs|hands|feet|backpack)$/.test(slot)) return true
    const main = /^main:(\d+)$/.exec(slot)
    if (main) return Number(main[1]) < MAIN_SLOTS
    const belt = /^belt:(\d+)$/.exec(slot)
    if (belt) return Number(belt[1]) < BELT_SLOTS
    return false
}

function firstEmptySlot(placed: Map<string, KitSlotItem>) {
    for (let index = 0; index < MAIN_SLOTS; index += 1) {
        if (!placed.has(mainId(index))) return mainId(index)
    }
    for (let index = 0; index < BELT_SLOTS; index += 1) {
        if (!placed.has(beltId(index))) return beltId(index)
    }
    for (const slot of WEAR_SLOTS) {
        if (!placed.has(wearId(slot.id))) return wearId(slot.id)
    }
    return null
}

export function moveKitItem(items: KitSlotItem[], from: string, to: string) {
    if (from === to) return items
    const placed = layoutKitItems(items)
    const moving = placed.get(from)
    if (!moving) return items
    const target = placed.get(to)
    if (target) {
        placed.set(from, { ...target, slot: from })
    } else {
        placed.delete(from)
    }
    placed.set(to, { ...moving, slot: to })
    return [...placed.values()]
}

function conditionRatio(item: KitSlotItem, info?: RustItemInfo) {
    if (!info?.durability || info.conditionMax <= 0) return null
    const current = item.condition == null ? info.conditionMax : item.condition
    return Math.max(0, Math.min(1, current / info.conditionMax))
}

function conditionValue(condition: number | null | undefined, max: number) {
    if (max <= 0) return 0
    if (condition == null) return max
    return Math.round(Math.max(0, Math.min(max, condition)) * 100) / 100
}

function searchCatalog(catalog: Map<string, RustItemInfo> | undefined, needle: string) {
    const term = needle.trim().toLowerCase()
    if (!term || !catalog) return []
    const rank = (item: RustItemInfo) => {
        const name = item.name.toLowerCase()
        if (item.shortname === term || name === term) return 0
        if (item.shortname.startsWith(term) || name.startsWith(term)) return 1
        if (item.shortname.includes(term)) return 2
        return 3
    }
    return [...catalog.values()]
        .filter((item) => item.name.toLowerCase().includes(term) || item.shortname.includes(term))
        .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name))
        .slice(0, 8)
}

function LootyCredit({ className = "" }: { className?: string }) {
    return (
        <p className={`text-xs text-muted-foreground ${className}`}>
            Item images and information from <a href="https://looty.cc" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground">Looty</a>.
        </p>
    )
}

function conditionColor(ratio: number) {
    if (ratio > 0.6) return "#8ed43a"
    if (ratio > 0.3) return "#e2b93b"
    return "#d4533a"
}

function ClothingGlyph({ id }: { id: (typeof WEAR_SLOTS)[number]["id"] }) {
    const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }
    if (id === "head") {
        return (
            <svg viewBox="0 0 24 24" className="size-7" aria-hidden>
                <circle cx="12" cy="9" r="3.2" {...common} />
                <path d="M7.5 19.5c.6-2.8 2.4-4.2 4.5-4.2s3.9 1.4 4.5 4.2" {...common} />
            </svg>
        )
    }
    if (id === "face") {
        return (
            <svg viewBox="0 0 24 24" className="size-7" aria-hidden>
                <path d="M5 10.5h14v2.2c0 2.4-1.6 4-3.4 4H8.4c-1.8 0-3.4-1.6-3.4-4V10.5Z" {...common} />
                <path d="M8 10.5 9.2 8M16 10.5 14.8 8" {...common} />
            </svg>
        )
    }
    if (id === "chest") {
        return (
            <svg viewBox="0 0 24 24" className="size-7" aria-hidden>
                <path d="M8 6.5 12 9l4-2.5 2 2.2V18H6V8.7l2-2.2Z" {...common} />
            </svg>
        )
    }
    if (id === "legs") {
        return (
            <svg viewBox="0 0 24 24" className="size-7" aria-hidden>
                <path d="M8 5h8l.6 6.2-1.8 8.3h-2.2L12 12.5 9.4 19.5H7.2L5.4 11.2 8 5Z" {...common} />
            </svg>
        )
    }
    if (id === "hands") {
        return (
            <svg viewBox="0 0 24 24" className="size-7" aria-hidden>
                <path d="M8 11V6.8M11 11V5.5M14 11V6.2M17 11.2V8" {...common} />
                <path d="M7 11.2h11.2v2.2c0 3.2-2 5.6-5.6 5.6S7 16.6 7 13.4v-2.2Z" {...common} />
            </svg>
        )
    }
    if (id === "feet") {
        return (
            <svg viewBox="0 0 24 24" className="size-7" aria-hidden>
                <path d="M7 15.5c.2-3 1.6-5 3.2-5h1.2c2.2 0 3.4 1.6 4.2 3.2 1 .4 2.2 1.2 2.2 2.6 0 1.4-1.2 2.2-2.6 2.2H8.2c-1.6 0-2.7-1-2.7-2.4 0-.3.1-.5.2-.6h1.3Z" {...common} />
            </svg>
        )
    }
    return (
        <svg viewBox="0 0 24 24" className="size-7" aria-hidden>
            <path d="M7 9.5h10v9H7v-9Z" {...common} />
            <path d="M9 9.5V8a3 3 0 0 1 6 0v1.5M7 13h10" {...common} />
        </svg>
    )
}

const SlotFace = forwardRef<
    HTMLDivElement,
    {
        title?: string
        selected?: boolean
        ratio?: number | null
        children?: ReactNode
        interactive?: boolean
        filled?: boolean
        onClick?: () => void
        onPointerDown?: () => void
        onDropItem?: (from: string) => void
        slot: string
    }
>(function SlotFace({ title, selected, ratio, children, interactive, filled, onClick, onPointerDown, onDropItem, slot }, ref) {
    return (
        <div
            ref={ref}
            role={interactive ? "button" : undefined}
            tabIndex={interactive ? 0 : undefined}
            title={title}
            draggable={Boolean(interactive && filled)}
            onDragStart={(event) => {
                if (!interactive) return
                event.dataTransfer.setData("text/plain", slot)
                event.dataTransfer.effectAllowed = "move"
            }}
            onDragOver={(event) => {
                if (!interactive) return
                event.preventDefault()
            }}
            onDrop={(event) => {
                if (!interactive || !onDropItem) return
                event.preventDefault()
                onDropItem(event.dataTransfer.getData("text/plain"))
            }}
            onPointerDown={onPointerDown}
            onClick={onClick}
            onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") onClick?.()
            }}
            className="relative aspect-square overflow-hidden"
            style={{
                backgroundColor: "rgba(118, 124, 130, 0.34)",
                boxShadow: selected ? "inset 0 0 0 2px #ba9142" : undefined,
                cursor: interactive ? "pointer" : undefined,
            }}
        >
            {ratio != null ? (
                <span
                    aria-hidden
                    className="absolute bottom-0 left-0 w-[3px]"
                    style={{ height: `${Math.max(8, ratio * 100)}%`, backgroundColor: conditionColor(ratio) }}
                />
            ) : null}
            {children}
        </div>
    )
})

function ItemContents({ item, info }: { item: KitSlotItem; info?: RustItemInfo }) {
    const [failed, setFailed] = useState(false)
    const name = info?.name || item.shortname
    const showAmount = !info?.durability || item.amount > 1
    return (
        <>
            {failed ? (
                <span className="absolute inset-x-1 top-2 text-center text-[10px] leading-3 text-white/70">{name}</span>
            ) : (
                <img
                    src={info?.imageUrl || lootyItemImageUrl(item.shortname)}
                    alt={name}
                    draggable={false}
                    className="pointer-events-none absolute inset-[8%] size-[84%] object-contain"
                    onError={() => setFailed(true)}
                />
            )}
            {showAmount ? (
                <span
                    className="pointer-events-none absolute bottom-1 right-1.5 text-[13px] font-semibold leading-none tabular-nums text-white"
                    style={{ textShadow: "0 1px 2px rgba(0,0,0,0.9)" }}
                >
                    x{item.amount.toLocaleString("en-US")}
                </span>
            ) : null}
        </>
    )
}

export function KitInventory({
    items,
    catalog,
    interactive = false,
    selectedSlot,
    onSelect,
    onMove,
    config,
    showCredit = true,
}: {
    items: KitSlotItem[]
    catalog?: Map<string, RustItemInfo>
    interactive?: boolean
    selectedSlot?: string | null
    onSelect?: (slot: string | null) => void
    onMove?: (from: string, to: string) => void
    config?: ReactNode
    showCredit?: boolean
}) {
    const placed = useMemo(() => layoutKitItems(items), [items])
    const dragged = useRef(false)
    const selecting = useRef(false)

    const renderSlot = (slot: string, empty?: ReactNode) => {
        const item = placed.get(slot)
        const info = item ? catalog?.get(item.shortname) : undefined
        const face = (
            <SlotFace
                slot={slot}
                title={item ? info?.name || item.shortname : undefined}
                selected={selectedSlot === slot}
                ratio={item ? conditionRatio(item, info) : null}
                interactive={interactive}
                filled={Boolean(item)}
                onDropItem={(from) => {
                    dragged.current = true
                    onMove?.(from, slot)
                }}
                onPointerDown={() => {
                    if (!selectedSlot) return
                    selecting.current = true
                    const clear = () => {
                        window.removeEventListener("pointerup", clear)
                        queueMicrotask(() => {
                            selecting.current = false
                        })
                    }
                    window.addEventListener("pointerup", clear)
                }}
                onClick={() => {
                    if (dragged.current) {
                        dragged.current = false
                        selecting.current = false
                        return
                    }
                    if (!interactive) return
                    onSelect?.(selectedSlot === slot ? null : slot)
                }}
            >
                {item ? <ItemContents item={item} info={info} /> : empty}
            </SlotFace>
        )
        if (selectedSlot === slot) {
            return (
                <PopoverAnchor key={slot} asChild>
                    {face}
                </PopoverAnchor>
            )
        }
        return (
            <div key={slot} className="contents">
                {face}
            </div>
        )
    }

    return (
        <>
        <Popover
            modal={false}
            open={Boolean(config) && Boolean(selectedSlot)}
            onOpenChange={(open) => {
                if (open) return
                if (selecting.current || dragged.current) return
                onSelect?.(null)
            }}
        >
        <div className="flex items-start gap-1">
            <div className="flex w-[calc((100%-1.5rem)/7)] shrink-0 flex-col gap-1" aria-label="Clothing">
                {WEAR_SLOTS.map((slot) =>
                    renderSlot(
                        wearId(slot.id),
                        <span className="absolute inset-0 flex items-center justify-center text-white/40">
                            <ClothingGlyph id={slot.id} />
                        </span>,
                    ),
                )}
            </div>
            <div className="min-w-0 flex-1">
                <div className="grid grid-cols-6 gap-1" aria-label="Inventory">
                    {Array.from({ length: MAIN_SLOTS }, (_, index) => renderSlot(mainId(index)))}
                </div>
                <div className="mt-2 grid grid-cols-6 gap-1" aria-label="Hotbar">
                    {Array.from({ length: BELT_SLOTS }, (_, index) => renderSlot(beltId(index)))}
                </div>
            </div>
        </div>
        {config ? (
            <PopoverContent
                side="right"
                align="start"
                className="w-72 space-y-3 p-3"
                onOpenAutoFocus={(event) => {
                    event.preventDefault()
                    const content = event.currentTarget
                    if (!(content instanceof HTMLElement)) return
                    content.querySelector<HTMLInputElement>('input[aria-label="Search items for this slot"]')?.focus()
                }}
                onCloseAutoFocus={(event) => event.preventDefault()}
            >
                {config}
            </PopoverContent>
        ) : null}
        </Popover>
        {showCredit ? <LootyCredit className="mt-2 text-right" /> : null}
        </>
    )
}

export function KitInventoryEditor({
    items,
    catalog,
    onChange,
}: {
    items: KitSlotItem[]
    catalog?: Map<string, RustItemInfo>
    onChange: (items: KitSlotItem[]) => void
}) {
    const [query, setQuery] = useState("")
    const [slotQuery, setSlotQuery] = useState("")
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
    const placed = useMemo(() => layoutKitItems(items), [items])
    const selected = selectedSlot ? placed.get(selectedSlot) : undefined
    const selectedInfo = selected ? catalog?.get(selected.shortname) : undefined

    const matches = useMemo(() => searchCatalog(catalog, query), [catalog, query])
    const slotMatches = useMemo(() => searchCatalog(catalog, slotQuery), [catalog, slotQuery])

    const commit = (next: KitSlotItem[]) => onChange(layoutKitItems(next).size ? [...layoutKitItems(next).values()] : next)

    const addItem = (info: RustItemInfo, slot?: string | null) => {
        const target = slot && !placed.has(slot) ? slot : firstEmptySlot(placed)
        if (!target) return
        const next = [
            ...placed.values(),
            {
                shortname: info.shortname,
                amount: 1,
                slot: target,
                condition: info.durability ? info.conditionMax : null,
            },
        ]
        commit(next)
        setSelectedSlot(null)
        setQuery("")
        setSlotQuery("")
    }

    const updateSelected = (patch: Partial<KitSlotItem>) => {
        if (!selectedSlot || !selected) return
        const next = [...placed.values()].map((item) => (item.slot === selectedSlot ? { ...item, ...patch, slot: selectedSlot } : item))
        commit(next)
    }

    return (
        <div className="space-y-3">
            <div className="relative">
                <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search items to add"
                    aria-label="Search items"
                />
                {matches.length > 0 ? (
                    <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md">
                        {matches.map((item) => (
                            <button
                                key={item.shortname}
                                type="button"
                                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                                onClick={() => addItem(item)}
                            >
                                <img src={item.imageUrl} alt="" className="size-8 object-contain" />
                                <span className="min-w-0">
                                    <span className="block truncate">{item.name}</span>
                                    <span className="block truncate text-xs text-muted-foreground">{item.shortname}</span>
                                </span>
                            </button>
                        ))}
                    </div>
                ) : null}
            </div>

            <div className="max-w-[800px]">
                <KitInventory
                    items={items}
                    catalog={catalog}
                    interactive
                    showCredit={false}
                    selectedSlot={selectedSlot}
                    onSelect={(slot) => {
                        setSlotQuery("")
                        setSelectedSlot(slot)
                    }}
                    onMove={(from, to) => {
                        onChange(moveKitItem(items, from, to))
                        setSelectedSlot((current) => (current === from ? to : current))
                    }}
                    config={
                        !selected && selectedSlot ? (
                            <div className="space-y-2">
                                <Input
                                    autoFocus
                                    value={slotQuery}
                                    onChange={(event) => setSlotQuery(event.target.value)}
                                    placeholder="Search items"
                                    aria-label="Search items for this slot"
                                />
                                {slotMatches.length > 0 ? (
                                    <div className="max-h-64 overflow-auto">
                                        {slotMatches.map((item) => (
                                            <button
                                                key={item.shortname}
                                                type="button"
                                                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                                                onClick={() => addItem(item, selectedSlot)}
                                            >
                                                <img src={item.imageUrl} alt="" className="size-8 object-contain" />
                                                <span className="min-w-0">
                                                    <span className="block truncate">{item.name}</span>
                                                    <span className="block truncate text-xs text-muted-foreground">{item.shortname}</span>
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                ) : slotQuery.trim() ? (
                                    <p className="px-2 text-xs text-muted-foreground">No items match.</p>
                                ) : (
                                    <p className="px-2 text-xs text-muted-foreground">Type an item name to add it here.</p>
                                )}
                            </div>
                        ) : selected ? (
                            <>
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-sm font-medium">{selectedInfo?.name || selected.shortname}</p>
                                    <button
                                        type="button"
                                        className="text-xs text-muted-foreground transition-colors hover:text-red-500!"
                                        onClick={() => {
                                            onChange([...placed.values()].filter((item) => item.slot !== selectedSlot))
                                            setSelectedSlot(null)
                                        }}
                                    >
                                        Remove
                                    </button>
                                </div>
                                <label className="block space-y-1 text-sm">
                                    <span>Amount</span>
                                    <NumberInput
                                        min={1}
                                        max={selectedInfo?.stackable ?? 100000}
                                        value={selected.amount}
                                        aria-label="Amount"
                                        onValueChange={(amount) => updateSelected({ amount })}
                                    />
                                </label>
                                {selectedInfo?.durability ? (
                                    <label className="block space-y-1 text-sm">
                                        <span>Durability</span>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="range"
                                                min={0}
                                                max={selectedInfo.conditionMax}
                                                step={1}
                                                value={conditionValue(selected.condition, selectedInfo.conditionMax)}
                                                onChange={(event) =>
                                                    updateSelected({
                                                        condition: conditionValue(Number(event.target.value), selectedInfo.conditionMax),
                                                    })
                                                }
                                                className="w-full"
                                                aria-label="Durability"
                                            />
                                            <NumberInput
                                                min={0}
                                                max={selectedInfo.conditionMax}
                                                className="w-32 shrink-0"
                                                value={conditionValue(selected.condition, selectedInfo.conditionMax)}
                                                aria-label="Durability"
                                                onValueChange={(condition) =>
                                                    updateSelected({
                                                        condition: conditionValue(condition, selectedInfo.conditionMax),
                                                    })
                                                }
                                            />
                                        </div>
                                    </label>
                                ) : null}
                            </>
                        ) : null
                    }
                />
            </div>

            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="text-xs text-muted-foreground">
                    Click an empty slot to add an item. Drag an item to move it. Click an item to set the amount, and durability when it has it.
                </p>
                <LootyCredit className="shrink-0" />
            </div>
        </div>
    )
}
