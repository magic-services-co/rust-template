"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { backendApi } from "@/lib/api"
import { getAuthToken } from "@/lib/laravel-auth"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

type HarmonyRelease = {
    version?: string
    releasedAt?: string | null
    notes?: string[]
    added?: string[]
    changed?: string[]
    removed?: string[]
    dllReady?: boolean
}

function ReleaseList({ title, items }: { title: string; items?: string[] }) {
    if (!items || items.length === 0) return null
    return (
        <div>
            <h3 className="mb-1 text-sm font-medium">{title}</h3>
            <ul className="text-muted-foreground list-inside list-disc text-sm">
                {items.map((line) => (
                    <li key={line}>{line}</li>
                ))}
            </ul>
        </div>
    )
}

function authHeaders(): Record<string, string> {
    const token = getAuthToken()
    const headers: Record<string, string> = { Accept: "application/json" }
    if (token) headers.Authorization = `Bearer ${token}`
    return headers
}

function filenameFromDisposition(header: string | null): string {
    if (!header) return "MagicCore-Harmony.zip"
    const match = /filename\*?=(?:UTF-8''|")?([^\";]+)/i.exec(header)
    if (!match?.[1]) return "MagicCore-Harmony.zip"
    try {
        return decodeURIComponent(match[1].replace(/"/g, ""))
    } catch {
        return match[1].replace(/"/g, "")
    }
}

export function HarmonyModDownloadButton() {
    const [pending, setPending] = useState(false)

    const download = async () => {
        setPending(true)
        try {
            const response = await fetch(backendApi("admin/system-control/harmony/download"), {
                credentials: "include",
                headers: authHeaders(),
            })
            if (!response.ok) {
                const body = await response.json().catch(() => ({}))
                throw new Error(body.error || body.message || "Could not download the Harmony mod")
            }
            const blob = await response.blob()
            const filename = filenameFromDisposition(response.headers.get("content-disposition"))
            const url = URL.createObjectURL(blob)
            const link = document.createElement("a")
            link.href = url
            link.download = filename
            link.click()
            URL.revokeObjectURL(url)
            toast.success("Harmony mod download started")
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not download the Harmony mod")
        } finally {
            setPending(false)
        }
    }

    return (
        <Button type="button" variant="secondary" disabled={pending} onClick={() => void download()}>
            {pending ? "Preparing…" : "Download"}
        </Button>
    )
}

export function HarmonyModRelease() {
    const query = useQuery({
        queryKey: ["admin", "harmony-mod"],
        queryFn: async () => {
            const response = await fetch(backendApi("admin/system-control/harmony"), {
                credentials: "include",
                headers: authHeaders(),
            })
            if (!response.ok) {
                const body = await response.json().catch(() => ({}))
                throw new Error(body.error || body.message || "Could not load the Harmony mod")
            }
            return response.json() as Promise<{ release?: HarmonyRelease }>
        },
    })

    const release = query.data?.release
    const notes = [
        ...(release?.notes ?? []),
        ...(release?.added ?? []),
        ...(release?.changed ?? []),
        ...(release?.removed ?? []),
    ]

    return (
        <div className="space-y-4">
            <div className="space-y-1 text-sm">
                {query.isLoading ? <p className="text-muted-foreground">Loading the current release…</p> : null}
                {query.isError ? <p className="text-muted-foreground">{query.error instanceof Error ? query.error.message : "Could not load the Harmony mod"}</p> : null}
                {release ? (
                    <p>
                        Version <span className="font-medium">{release.version}</span>
                        {release.releasedAt ? <span className="text-muted-foreground"> · {release.releasedAt}</span> : null}
                    </p>
                ) : null}
            </div>
            {release && notes.length > 0 ? (
                <div className="space-y-3">
                    <ReleaseList title="Notes" items={release.notes} />
                    <ReleaseList title="Added" items={release.added} />
                    <ReleaseList title="Changed" items={release.changed} />
                    <ReleaseList title="Removed" items={release.removed} />
                </div>
            ) : null}
            <p className="text-sm text-muted-foreground">
                Servers running an older copy download this version on their own. From the server console, <span className="text-foreground">rusttemplate.update</span> checks and applies it now.
                {release && release.dllReady === false ? " This site is not serving MagicCore.dll yet, so servers will see the notes and wait until the built mod is published." : ""}
            </p>
        </div>
    )
}
