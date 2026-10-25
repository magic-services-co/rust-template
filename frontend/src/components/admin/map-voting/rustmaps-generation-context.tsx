"use client"

import { backendApi } from "@/lib/api"
import { getAuthToken } from "@/lib/laravel-auth"
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react"
import { createPortal } from "react-dom"
import { toast } from "sonner"
import { ExternalLink, Loader2 } from "lucide-react"

function authJsonHeaders(): Record<string, string> {
    const token = getAuthToken()
    const headers: Record<string, string> = { Accept: "application/json" }
    if (token) headers.Authorization = `Bearer ${token}`
    return headers
}

function mapPreviewReady(json: unknown): boolean {
    if (!json || typeof json !== "object") return false
    const data = (json as { data?: { imageUrl?: string } }).data
    return Boolean(data?.imageUrl && String(data.imageUrl).trim() !== "")
}

function extractMapIdFromGenerate(json: unknown): string | null {
    if (!json || typeof json !== "object") return null
    const data = (json as { data?: { mapId?: string; id?: string } }).data
    if (!data) return null
    const mapId = data.mapId ?? data.id
    return mapId != null && String(mapId).trim() !== "" ? String(mapId).trim() : null
}

const RUSTMAPS_QUEUE_URL = "https://rustmaps.com/dashboard"

function rustmapsMapPageUrl(mapId: string): string {
    const segment = mapId.trim().replace(/\//g, "_")
    return `https://rustmaps.com/map/${encodeURIComponent(segment)}`
}

const QUEUED_MAP_STORAGE_KEY = "rust-template.rustmaps-map-voting-queued-map"
const QUEUED_MAP_MAX_AGE_MS = 4 * 60 * 60 * 1000

type PersistedQueuedMap = { mapId: string; savedAt: number }

function persistQueuedMap(mapId: string): void {
    try {
        const data: PersistedQueuedMap = { mapId, savedAt: Date.now() }
        sessionStorage.setItem(QUEUED_MAP_STORAGE_KEY, JSON.stringify(data))
    } catch {
        /* quota / private mode */
    }
}

function readPersistedQueuedMap(): PersistedQueuedMap | null {
    try {
        const raw = sessionStorage.getItem(QUEUED_MAP_STORAGE_KEY)
        if (!raw) return null
        const p = JSON.parse(raw) as PersistedQueuedMap
        if (!p?.mapId || typeof p.mapId !== "string" || p.mapId.trim() === "") {
            sessionStorage.removeItem(QUEUED_MAP_STORAGE_KEY)
            return null
        }
        if (Date.now() - (typeof p.savedAt === "number" ? p.savedAt : 0) > QUEUED_MAP_MAX_AGE_MS) {
            sessionStorage.removeItem(QUEUED_MAP_STORAGE_KEY)
            return null
        }
        return { mapId: p.mapId.trim(), savedAt: p.savedAt }
    } catch {
        return null
    }
}

function clearPersistedQueuedMap(): void {
    try {
        sessionStorage.removeItem(QUEUED_MAP_STORAGE_KEY)
    } catch {
        /* ignore */
    }
}

async function pollUntilMapHasPreview(mapId: string): Promise<void> {
    const headers = { ...authJsonHeaders(), Accept: "application/json" }
    const maxAttempts = 90
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const url = `${backendApi("admin/map-voting/rustmaps/map")}?mapId=${encodeURIComponent(mapId)}`
        const res = await fetch(url, { credentials: "include", headers })
        const json = await res.json().catch(() => ({}))
        if (mapPreviewReady(json)) return
        if (res.status === 401 || res.status === 403) {
            throw new Error((json as { error?: string }).error || "RustMaps API unauthorized")
        }
        await new Promise((r) => setTimeout(r, 2000))
    }
    throw new Error("Timed out waiting for RustMaps to finish generating this map.")
}

export type SavedConfigGenerationArgs = {
    configName: string
    size: number
    seed: number
    staging: boolean
}

type GenerationHud = null | { phase: "starting" } | { phase: "queued"; mapId: string }

type RustmapsGenerationContextValue = {
    isGenerating: boolean
    startSavedConfigGeneration: (args: SavedConfigGenerationArgs) => Promise<void>
    registerAppendHandler: (fn: ((id: string) => void) | null) => void
}

const RustmapsGenerationContext = createContext<RustmapsGenerationContextValue | null>(null)

export function RustmapsGenerationProvider({ children }: { children: ReactNode }) {
    const [generationHud, setGenerationHud] = useState<GenerationHud>(null)
    const appendRef = useRef<((id: string) => void) | null>(null)
    const pendingMapIds = useRef<string[]>([])
    const inFlightRef = useRef(false)
    const mountedRef = useRef(true)

    useEffect(() => {
        mountedRef.current = true
        return () => {
            mountedRef.current = false
        }
    }, [])

    const safeSetHud = useCallback((next: GenerationHud) => {
        if (mountedRef.current) {
            setGenerationHud(next)
        }
    }, [])

    const deliverMap = useCallback((mapId: string) => {
        if (appendRef.current) {
            appendRef.current(mapId)
            return true
        }
        pendingMapIds.current.push(mapId)
        return false
    }, [])

    const registerAppendHandler = useCallback((fn: ((id: string) => void) | null) => {
        appendRef.current = fn
        if (!fn || pendingMapIds.current.length === 0) return
        const queued = pendingMapIds.current.splice(0)
        queued.forEach((mapId) => fn(mapId))
        toast.success(queued.length === 1 ? "Map added to the poll." : `${queued.length} maps added to the poll.`)
    }, [])

    useEffect(() => {
        let cancelled = false
        const persisted = readPersistedQueuedMap()
        if (!persisted) return undefined

        inFlightRef.current = true
        safeSetHud({ phase: "queued", mapId: persisted.mapId })

        void (async () => {
            try {
                await pollUntilMapHasPreview(persisted.mapId)
                if (cancelled) return
                clearPersistedQueuedMap()
                if (deliverMap(persisted.mapId)) {
                    toast.success("Map added to the poll. Save the vote when you are done.")
                } else {
                    toast.message(
                        `Map ready (id: ${persisted.mapId}). It will be added when you open Create or Edit vote.`,
                        { duration: 12_000 }
                    )
                }
            } catch (e) {
                if (!cancelled) {
                    clearPersistedQueuedMap()
                    toast.error(e instanceof Error ? e.message : "Could not resume map generation")
                }
            } finally {
                safeSetHud(null)
                inFlightRef.current = false
            }
        })()

        return () => {
            cancelled = true
        }
    }, [safeSetHud, deliverMap])

    const startSavedConfigGeneration = useCallback(async (args: SavedConfigGenerationArgs) => {
        if (inFlightRef.current) {
            toast.message("A map generation is already in progress.")
            return
        }

        inFlightRef.current = true
        safeSetHud({ phase: "starting" })
        let wroteQueuePersistence = false
        try {
            const res = await fetch(backendApi("admin/map-voting/rustmaps/generate-from-config"), {
                method: "POST",
                credentials: "include",
                headers: { ...authJsonHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify({
                    configName: args.configName,
                    mapParameters: {
                        size: Math.trunc(args.size),
                        seed: Math.trunc(args.seed),
                        staging: args.staging,
                    },
                }),
            })
            const json = await res.json().catch(() => ({}))

            if (!(res.status === 200 || res.status === 201 || res.status === 409)) {
                const msg =
                    (json as { error?: string; meta?: { message?: string } }).meta?.message ||
                    (json as { error?: string }).error ||
                    `RustMaps request failed (${res.status})`
                throw new Error(msg)
            }

            if (mapPreviewReady(json)) {
                const id =
                    (json as { data?: { id?: string; mapId?: string } }).data?.id ??
                    (json as { data?: { mapId?: string } }).data?.mapId ??
                    extractMapIdFromGenerate(json)
                if (id) {
                    clearPersistedQueuedMap()
                    if (deliverMap(String(id))) {
                        toast.success("Map is ready and was added to the poll.")
                    } else {
                        toast.message(
                            `Map is ready (id: ${String(id)}). It will be added when you open Create or Edit vote.`,
                            { duration: 10_000 }
                        )
                    }
                    return
                }
            }

            const mapId = extractMapIdFromGenerate(json)
            if (!mapId) {
                const msg =
                    (json as { error?: string; meta?: { message?: string } }).meta?.message ||
                    (json as { error?: string }).error ||
                    "RustMaps did not return a map id."
                throw new Error(msg)
            }

            safeSetHud({ phase: "queued", mapId })
            persistQueuedMap(mapId)
            wroteQueuePersistence = true
            await pollUntilMapHasPreview(mapId)
            clearPersistedQueuedMap()
            wroteQueuePersistence = false

            if (deliverMap(mapId)) {
                toast.success("Map added to the poll. Save the vote when you are done.")
            } else {
                toast.message(
                    `Map ready (id: ${mapId}). It will be added when you open Create or Edit vote.`,
                    { duration: 12_000 }
                )
            }
        } catch (e) {
            if (wroteQueuePersistence) {
                clearPersistedQueuedMap()
            }
            toast.error(e instanceof Error ? e.message : "Generation failed")
        } finally {
            safeSetHud(null)
            inFlightRef.current = false
        }
    }, [safeSetHud, deliverMap])

    const value = useMemo(
        () => ({
            isGenerating: generationHud !== null,
            startSavedConfigGeneration,
            registerAppendHandler,
        }),
        [generationHud, startSavedConfigGeneration, registerAppendHandler]
    )

    const hud =
        generationHud &&
        typeof document !== "undefined" &&
        createPortal(
            <div
                className="pointer-events-auto fixed bottom-4 right-4 z-[200] w-[min(22rem,calc(100vw-2rem))] rounded-lg border bg-popover text-popover-foreground shadow-lg"
                role="status"
                aria-live="polite"
            >
                <div className="flex items-start gap-3 p-3">
                    <Loader2 className="h-5 w-5 shrink-0 animate-spin text-amber-500 mt-0.5" aria-hidden />
                    <div className="min-w-0 flex-1 space-y-2">
                        <p className="text-sm font-medium leading-tight">Generating map</p>
                        {generationHud.phase === "queued" ? (
                            <p className="text-xs font-mono break-all text-muted-foreground" title={generationHud.mapId}>
                                {generationHud.mapId}
                            </p>
                        ) : (
                            <p className="text-xs text-muted-foreground">Submitting to RustMaps…</p>
                        )}
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                            <a
                                href={RUSTMAPS_QUEUE_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
                            >
                                Generation queue
                                <ExternalLink className="h-3 w-3" aria-hidden />
                            </a>
                            {generationHud.phase === "queued" ? (
                                <a
                                    href={rustmapsMapPageUrl(generationHud.mapId)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
                                >
                                    Map page
                                    <ExternalLink className="h-3 w-3" aria-hidden />
                                </a>
                            ) : null}
                        </div>
                    </div>
                </div>
            </div>,
            document.body
        )

    return (
        <RustmapsGenerationContext.Provider value={value}>
            {children}
            {hud}
        </RustmapsGenerationContext.Provider>
    )
}

export function useRustmapsGeneration(): RustmapsGenerationContextValue {
    const ctx = useContext(RustmapsGenerationContext)
    if (!ctx) {
        throw new Error("useRustmapsGeneration must be used within RustmapsGenerationProvider")
    }
    return ctx
}
