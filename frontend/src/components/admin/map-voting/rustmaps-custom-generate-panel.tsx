"use client"

import { backendApi } from "@/lib/api"
import { getAuthToken } from "@/lib/laravel-auth"
import { useRustmapsGeneration } from "@/components/admin/map-voting/rustmaps-generation-context"
import { useQuery } from "@tanstack/react-query"
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

type SavedConfigRow = { id?: string | null; name?: string | null }

function authJsonHeaders(): Record<string, string> {
    const token = getAuthToken()
    const headers: Record<string, string> = { Accept: "application/json" }
    if (token) headers.Authorization = `Bearer ${token}`
    return headers
}

export type RustmapsCustomGeneratePanelProps = {
    enabled: boolean
    canAddMore: boolean
    onAppendRustmapsOption: (mapId: string) => void
    className?: string
}

export function RustmapsCustomGeneratePanel({
    enabled,
    canAddMore,
    onAppendRustmapsOption,
    className,
}: RustmapsCustomGeneratePanelProps) {
    const baseId = useId()
    const { isGenerating, startSavedConfigGeneration, registerAppendHandler } = useRustmapsGeneration()

    const [configName, setConfigName] = useState(() => {
        try {
            return sessionStorage.getItem("rust-template.rustmaps-last-saved-config") ?? ""
        } catch {
            return ""
        }
    })
    const [size, setSize] = useState("3500")
    const [seed, setSeed] = useState(() => String(Math.floor(Math.random() * 2_000_000_000)))
    const [staging, setStaging] = useState(false)

    const appendRef = useRef(onAppendRustmapsOption)
    appendRef.current = onAppendRustmapsOption

    useEffect(() => {
        if (!configName.trim()) return
        try {
            sessionStorage.setItem("rust-template.rustmaps-last-saved-config", configName)
        } catch {
            /* ignore */
        }
    }, [configName])

    useEffect(() => {
        if (!enabled) {
            registerAppendHandler(null)
            return
        }
        registerAppendHandler((mapId) => appendRef.current(mapId))
        return () => registerAppendHandler(null)
    }, [enabled, registerAppendHandler])

    const { data: savedConfigsRes, isLoading: loadingConfigs } = useQuery({
        queryKey: ["rustmapsSavedConfigs"],
        enabled,
        queryFn: async () => {
            const res = await fetch(backendApi("admin/map-voting/rustmaps/saved-configs"), {
                credentials: "include",
                headers: authJsonHeaders(),
            })
            if (!res.ok) {
                const j = await res.json().catch(() => ({}))
                throw new Error((j as { error?: string }).error || "Failed to load saved configs")
            }
            return res.json() as Promise<{ data?: SavedConfigRow[] | null }>
        },
    })

    const savedConfigRows = useMemo(() => {
        const rows = savedConfigsRes?.data
        if (!Array.isArray(rows)) return [] as SavedConfigRow[]
        return rows.filter((r) => typeof r?.name === "string" && r.name.trim() !== "")
    }, [savedConfigsRes])

    const runGenerate = useCallback(async () => {
        if (!canAddMore) {
            toast.error("Maximum 20 map options allowed.")
            return
        }
        const name = configName.trim()
        if (!name) {
            toast.error("Select a saved config.")
            return
        }
        const sizeNum = Number(size)
        const seedNum = Number(seed)
        if (!Number.isFinite(sizeNum) || !Number.isFinite(seedNum)) {
            toast.error("Size and seed must be numbers.")
            return
        }

        await startSavedConfigGeneration({
            configName: name,
            size: sizeNum,
            seed: seedNum,
            staging,
        })
    }, [canAddMore, configName, seed, size, staging, startSavedConfigGeneration])

    if (!enabled) return null

    return (
        <div
            className={cn(
                "rounded-lg border border-border/60 bg-muted/20 p-4 space-y-4",
                className
            )}
        >
            <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 shrink-0 text-amber-500" />
                <p className="text-sm font-medium">Generate from org custom configs</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor={`${baseId}-saved-config`}>Saved config</Label>
                    {loadingConfigs ? (
                        <p className="text-sm text-muted-foreground">Loading saved configs…</p>
                    ) : savedConfigRows.length > 0 ? (
                        <Select
                            value={
                                configName && savedConfigRows.some((r) => r.name?.trim() === configName)
                                    ? configName
                                    : undefined
                            }
                            onValueChange={(v) => setConfigName(v)}
                            disabled={isGenerating || loadingConfigs}
                        >
                            <SelectTrigger id={`${baseId}-saved-config`}>
                                <SelectValue placeholder="Select a saved config" />
                            </SelectTrigger>
                            <SelectContent className="z-[250]" position="popper">
                                {savedConfigRows.map((r) => {
                                    const n = r.name!.trim()
                                    return (
                                        <SelectItem key={r.id ?? n} value={n}>
                                            {n}
                                        </SelectItem>
                                    )
                                })}
                            </SelectContent>
                        </Select>
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            No saved configs found. Add configs in your RustMaps organization dashboard, then refresh this page.
                        </p>
                    )}
                </div>
                <div className="space-y-2">
                    <Label htmlFor={`${baseId}-size`}>Map size</Label>
                    <Input
                        id={`${baseId}-size`}
                        type="number"
                        inputMode="numeric"
                        value={size}
                        onChange={(e) => setSize(e.target.value)}
                        disabled={isGenerating}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor={`${baseId}-seed`}>Seed</Label>
                    <Input
                        id={`${baseId}-seed`}
                        type="number"
                        inputMode="numeric"
                        value={seed}
                        onChange={(e) => setSeed(e.target.value)}
                        disabled={isGenerating}
                    />
                </div>
                <div className="flex items-center justify-between gap-2 sm:col-span-2 rounded-md border px-3 py-2">
                    <div className="space-y-0.5">
                        <Label htmlFor={`${baseId}-staging`} className="text-sm font-medium">
                            Staging branch
                        </Label>
                        <p className="text-xs text-muted-foreground">Matches RustMaps mapParameters.staging</p>
                    </div>
                    <Switch id={`${baseId}-staging`} checked={staging} onCheckedChange={setStaging} disabled={isGenerating} />
                </div>
            </div>

            <Button
                type="button"
                disabled={
                    isGenerating ||
                    !canAddMore ||
                    loadingConfigs ||
                    savedConfigRows.length === 0 ||
                    !configName.trim()
                }
                onClick={() => void runGenerate()}
            >
                {isGenerating ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating…
                    </>
                ) : (
                    <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate &amp; add to poll
                    </>
                )}
            </Button>
        </div>
    )
}
