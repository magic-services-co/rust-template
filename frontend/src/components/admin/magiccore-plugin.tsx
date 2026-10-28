"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { backendApi } from "@/lib/api"
import { getAuthToken } from "@/lib/laravel-auth"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

type MagicCoreRelease = {
    version?: string
    releasedAt?: string | null
    notes?: string[]
    added?: string[]
    changed?: string[]
    removed?: string[]
    dllReady?: boolean
    pluginReady?: boolean
}

type BuildKind = "harmony" | "oxide"

const builds = {
    harmony: {
        label: "Harmony mod",
        endpoint: "admin/system-control/harmony",
        download: "admin/system-control/harmony/download",
        accept: "application/octet-stream, application/zip, */*",
        fallbackName: "MagicCore.dll",
        button: "Download MagicCore.dll",
        success: "Harmony mod download started",
        error: "Could not download the Harmony mod",
        loadError: "Could not load the Harmony changelog",
    },
    oxide: {
        label: "Oxide / Carbon plugin",
        endpoint: "admin/system-control/oxide-plugin",
        download: "admin/system-control/oxide-plugin/download",
        accept: "text/plain, */*",
        fallbackName: "MagicCore.cs",
        button: "Download MagicCore.cs",
        success: "Oxide / Carbon plugin download started",
        error: "Could not download the Oxide / Carbon plugin",
        loadError: "Could not load the Oxide / Carbon changelog",
    },
} as const

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

function authHeaders(accept = "application/json"): Record<string, string> {
    const token = getAuthToken()
    const headers: Record<string, string> = { Accept: accept }
    if (token) headers.Authorization = `Bearer ${token}`
    return headers
}

function filenameFromDisposition(header: string | null, fallback: string): string {
    if (!header) return fallback
    const match = /filename\*?=(?:UTF-8''|")?([^\";]+)/i.exec(header)
    if (!match?.[1]) return fallback
    try {
        return decodeURIComponent(match[1].replace(/"/g, ""))
    } catch {
        return match[1].replace(/"/g, "")
    }
}

async function assertDownload(kind: BuildKind, blob: Blob, contentType: string | null): Promise<void> {
    if (kind === "oxide") {
        const text = await blob.slice(0, 8000).text()
        if (!text.includes("namespace Oxide.Plugins") || !text.includes("class MagicCore")) {
            throw new Error("The download was not MagicCore.cs")
        }
        return
    }

    if (contentType && /json|text\/html|text\/plain/i.test(contentType)) {
        throw new Error("The download was not the Harmony mod")
    }
    const prefix = new Uint8Array(await blob.slice(0, 2).arrayBuffer())
    const isDll = prefix[0] === 0x4d && prefix[1] === 0x5a && blob.size >= 1024
    const isZip = prefix[0] === 0x50 && prefix[1] === 0x4b && blob.size >= 64
    if (!isDll && !isZip) {
        throw new Error("The download was not a MagicCore.dll")
    }
}

export function MagicCoreDownloadButton({ kind }: { kind: BuildKind }) {
    const build = builds[kind]
    const [pending, setPending] = useState(false)

    const download = async () => {
        setPending(true)
        try {
            const response = await fetch(backendApi(build.download), {
                credentials: "include",
                headers: authHeaders(build.accept),
            })
            if (!response.ok) {
                const body = await response.json().catch(() => ({}))
                throw new Error(body.error || body.message || build.error)
            }
            const blob = await response.blob()
            await assertDownload(kind, blob, response.headers.get("content-type"))
            const filename = filenameFromDisposition(response.headers.get("content-disposition"), build.fallbackName)
            const url = URL.createObjectURL(blob)
            const link = document.createElement("a")
            link.href = url
            link.download = filename
            link.click()
            URL.revokeObjectURL(url)
            toast.success(build.success)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : build.error)
        } finally {
            setPending(false)
        }
    }

    return (
        <Button type="button" variant="secondary" disabled={pending} onClick={() => void download()}>
            {pending ? "Preparing…" : build.button}
        </Button>
    )
}

export function MagicCoreChangelog({ kind }: { kind: BuildKind }) {
    const build = builds[kind]
    const query = useQuery({
        queryKey: ["admin", "magiccore", kind],
        queryFn: async () => {
            const response = await fetch(backendApi(build.endpoint), {
                credentials: "include",
                headers: authHeaders(),
            })
            if (!response.ok) {
                const body = await response.json().catch(() => ({}))
                throw new Error(body.error || body.message || build.loadError)
            }
            return response.json() as Promise<{ release?: MagicCoreRelease }>
        },
    })

    const release = query.data?.release
    const hasNotes = Boolean(
        release &&
            ((release.notes?.length ?? 0) > 0 ||
                (release.added?.length ?? 0) > 0 ||
                (release.changed?.length ?? 0) > 0 ||
                (release.removed?.length ?? 0) > 0)
    )
    const waiting =
        kind === "harmony"
            ? release?.dllReady === false
            : release?.pluginReady === false

    return (
        <div className="space-y-4">
            <div className="space-y-1 text-sm">
                {query.isLoading ? <p className="text-muted-foreground">Loading the changelog…</p> : null}
                {query.isError ? (
                    <p className="text-muted-foreground">
                        {query.error instanceof Error ? query.error.message : build.loadError}
                    </p>
                ) : null}
                {release ? (
                    <p>
                        Version <span className="font-medium">{release.version}</span>
                        {release.releasedAt ? <span className="text-muted-foreground"> · {release.releasedAt}</span> : null}
                    </p>
                ) : null}
            </div>
            {release ? (
                <div className="space-y-3">
                    <h3 className="text-sm font-medium">Changelog</h3>
                    {hasNotes ? (
                        <>
                            <ReleaseList title="Notes" items={release.notes} />
                            <ReleaseList title="Added" items={release.added} />
                            <ReleaseList title="Changed" items={release.changed} />
                            <ReleaseList title="Removed" items={release.removed} />
                        </>
                    ) : (
                        <p className="text-muted-foreground text-sm">No notes for this release.</p>
                    )}
                </div>
            ) : null}
            <p className="text-sm text-muted-foreground">
                Servers running an older copy of this build download the new one on their own. From the server console,{" "}
                <span className="text-foreground">magiccore.update</span> checks and applies it now.
                {waiting
                    ? kind === "harmony"
                        ? " This site is not serving MagicCore.dll yet, so servers will see the notes and wait until the built mod is published."
                        : " This site is not serving MagicCore.cs yet, so servers will see the notes and wait until the plugin is published."
                    : ""}
            </p>
        </div>
    )
}
