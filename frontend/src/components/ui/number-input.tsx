"use client"

import * as React from "react"
import { ChevronDown, ChevronUp } from "lucide-react"

import { cn } from "@/lib/utils"

export interface NumberInputProps
    extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange" | "min" | "max" | "step"> {
    value: number
    min?: number
    max?: number
    step?: number
    onValueChange: (value: number) => void
}

const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
    ({ className, value, min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY, step = 1, onValueChange, disabled, onKeyDown, onBlur, ...props }, ref) => {
        const [draft, setDraft] = React.useState<string | null>(null)
        const draftRef = React.useRef<string | null>(null)
        const shown = draft ?? String(value)

        const writeDraft = (next: string | null) => {
            draftRef.current = next
            setDraft(next)
        }

        const clamp = (next: number) => {
            const base = Number.isFinite(next) ? next : value
            const snapped = step > 0 ? Math.round(base / step) * step : base
            const rounded = Math.round(snapped * 1000) / 1000
            return Math.min(max, Math.max(min, rounded))
        }

        const commit = (raw: string) => {
            const parsed = raw.trim() === "" || !Number.isFinite(Number(raw)) ? value : Number(raw)
            const next = clamp(parsed)
            writeDraft(null)
            if (next !== value) onValueChange(next)
        }

        const stepBy = (direction: 1 | -1) => {
            const raw = draftRef.current
            const base = raw != null && raw.trim() !== "" && Number.isFinite(Number(raw)) ? Number(raw) : value
            writeDraft(null)
            onValueChange(clamp(base + direction * step))
        }

        return (
            <div
                className={cn(
                    "flex h-10 w-full items-stretch overflow-hidden rounded-md border border-input/15 bg-background/30 ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
                    disabled && "cursor-not-allowed opacity-50",
                    className,
                )}
            >
                <input
                    ref={ref}
                    type="text"
                    inputMode="decimal"
                    disabled={disabled}
                    value={shown}
                    onChange={(event) => writeDraft(event.target.value.replace(/[^\d.-]/g, ""))}
                    onBlur={(event) => {
                        const next = event.relatedTarget
                        if (next instanceof Node && event.currentTarget.parentElement?.contains(next)) return
                        commit(draftRef.current ?? String(value))
                        onBlur?.(event)
                    }}
                    onKeyDown={(event) => {
                        if (event.key === "ArrowUp") {
                            event.preventDefault()
                            stepBy(1)
                        } else if (event.key === "ArrowDown") {
                            event.preventDefault()
                            stepBy(-1)
                        } else if (event.key === "Enter") {
                            event.currentTarget.blur()
                        }
                        onKeyDown?.(event)
                    }}
                    className="min-w-0 flex-1 bg-transparent px-2 text-sm tabular-nums outline-none placeholder:text-muted-foreground/60 disabled:cursor-not-allowed"
                    {...props}
                />
                <div className="flex w-7 shrink-0 flex-col border-l border-input/15">
                    <button
                        type="button"
                        tabIndex={-1}
                        disabled={disabled || value >= max}
                        aria-label={props["aria-label"] ? `Increase ${props["aria-label"]}` : "Increase"}
                        className="flex flex-1 items-center justify-center text-foreground/70 transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                        onClick={() => stepBy(1)}
                    >
                        <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                        type="button"
                        tabIndex={-1}
                        disabled={disabled || value <= min}
                        aria-label={props["aria-label"] ? `Decrease ${props["aria-label"]}` : "Decrease"}
                        className="flex flex-1 items-center justify-center border-t border-input/15 text-foreground/70 transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                        onClick={() => stepBy(-1)}
                    >
                        <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>
        )
    },
)
NumberInput.displayName = "NumberInput"

export { NumberInput }
