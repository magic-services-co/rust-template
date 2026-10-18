"use client"

import { useState, type FormEvent } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { backendApi } from "@/lib/api"
import { getAuthToken } from "@/lib/laravel-auth"
import { prepareSanctumMutationHeaders } from "@/lib/sanctum-csrf"

type ImportMode = "replace" | "merge"

type ImportSummary = {
    mode: ImportMode
    tables: number
    tablesCleared: number
    rowsCopied: number
    rowsMerged: number
    rowsSkipped: number
    playersMerged?: number
    fieldsReencrypted: number
    fieldsLeftEncrypted: number
    reencrypted: boolean
    warnings: string[]
}

export function DatabaseImportPanel() {
    const [mode, setMode] = useState<ImportMode>("merge")
    const [databaseUrl, setDatabaseUrl] = useState("")
    const [previousAppKey, setPreviousAppKey] = useState("")
    const [confirm, setConfirm] = useState("")
    const [busy, setBusy] = useState(false)
    const [summary, setSummary] = useState<ImportSummary | null>(null)
    const confirmWord = mode === "replace" ? "REPLACE" : "MERGE"

    async function onSubmit(event: FormEvent) {
        event.preventDefault()
        setSummary(null)
        setBusy(true)
        try {
            const headers = await prepareSanctumMutationHeaders({ json: true, bearerToken: getAuthToken() })
            const response = await fetch(backendApi("admin/system-control/import-database"), {
                method: "POST",
                credentials: "include",
                headers,
                body: JSON.stringify({
                    databaseUrl: databaseUrl.trim(),
                    mode,
                    previousAppKey: previousAppKey.trim(),
                    confirm: confirm.trim(),
                }),
            })
            const data = (await response.json().catch(() => null)) as { success?: boolean; message?: string; summary?: ImportSummary } | null
            if (!response.ok || !data?.success) {
                toast.error(data?.message || "Import failed")
                return
            }
            setSummary(data.summary ?? null)
            setDatabaseUrl("")
            setPreviousAppKey("")
            setConfirm("")
            toast.success(data.message || "Import finished")
        } catch {
            toast.error("Import failed")
        } finally {
            setBusy(false)
        }
    }

    return (
        <form onSubmit={onSubmit} className="max-w-2xl space-y-6">
            <fieldset className="space-y-3">
                <legend className="text-sm font-medium">How to bring the old data in</legend>
                <label className="flex cursor-pointer gap-3 rounded-lg border p-4">
                    <input
                        type="radio"
                        name="import-mode"
                        className="mt-1"
                        checked={mode === "merge"}
                        onChange={() => {
                            setMode("merge")
                            setConfirm("")
                            setSummary(null)
                        }}
                    />
                    <span>
                        <span className="block font-medium">Merge</span>
                        <span className="text-muted-foreground block text-sm">
                            Keep what is already on this site. Add old rows that are not here yet, and fill blank fields from the old database when both sides have the same row.
                        </span>
                    </span>
                </label>
                <label className="flex cursor-pointer gap-3 rounded-lg border p-4">
                    <input
                        type="radio"
                        name="import-mode"
                        className="mt-1"
                        checked={mode === "replace"}
                        onChange={() => {
                            setMode("replace")
                            setConfirm("")
                            setSummary(null)
                        }}
                    />
                    <span>
                        <span className="block font-medium">Replace</span>
                        <span className="text-muted-foreground block text-sm">
                            Remove this site’s rows from tables that exist in both databases and use the old rows instead. Tables that exist only on this v2 site are emptied. The license key on this site is kept.
                        </span>
                    </span>
                </label>
            </fieldset>

            <div className="space-y-2">
                <Label htmlFor="import-database-url">Old MySQL URL</Label>
                <Input
                    id="import-database-url"
                    type="password"
                    value={databaseUrl}
                    onChange={(event) => setDatabaseUrl(event.target.value)}
                    placeholder="mysql://user:password@host:3306/database_name"
                    className="font-mono text-xs"
                    autoComplete="off"
                    required
                />
                <p className="text-muted-foreground text-xs">
                    URL-encode special characters in the password. The source must be this same product, with User and SiteSettings tables.
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="import-app-key">Old app key</Label>
                <Input
                    id="import-app-key"
                    type="password"
                    value={previousAppKey}
                    onChange={(event) => setPreviousAppKey(event.target.value)}
                    placeholder="base64:..."
                    className="font-mono text-xs"
                    autoComplete="off"
                />
                <p className="text-muted-foreground text-xs">
                    Optional. Paste APP_KEY from the old site’s .env. Encrypted values, such as Steam, PayNow, RustMaps, and panel keys, are read with that key and saved again with this site’s key. Leave this blank if both sites use the same app key.
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="import-confirm">Type {confirmWord} to confirm</Label>
                <Input
                    id="import-confirm"
                    value={confirm}
                    onChange={(event) => setConfirm(event.target.value)}
                    placeholder={confirmWord}
                    autoComplete="off"
                    required
                />
            </div>

            <Button type="submit" disabled={busy || confirm.trim() !== confirmWord || !databaseUrl.trim()}>
                {busy ? "Importing..." : mode === "replace" ? "Replace with old data" : "Merge old data"}
            </Button>

            {summary ? (
                <div className="space-y-2 rounded-lg border p-4 text-sm">
                    <p className="font-medium">Import finished</p>
                    <ul className="text-muted-foreground space-y-1">
                        <li>{summary.tables} shared tables read</li>
                        <li>{summary.rowsCopied} rows copied</li>
                        {(summary.playersMerged ?? 0) > 0 ? <li>{summary.playersMerged} players added to users</li> : null}
                        {summary.mode === "merge" ? <li>{summary.rowsMerged} rows filled from the old database</li> : null}
                        {summary.tablesCleared > 0 ? <li>{summary.tablesCleared} v2-only tables emptied</li> : null}
                        {summary.rowsSkipped > 0 ? <li>{summary.rowsSkipped} rows skipped</li> : null}
                        {summary.reencrypted ? <li>{summary.fieldsReencrypted} encrypted fields rewritten</li> : null}
                        {summary.reencrypted && summary.fieldsLeftEncrypted > 0 ? (
                            <li>{summary.fieldsLeftEncrypted} encrypted fields could not be read with that key</li>
                        ) : null}
                    </ul>
                    {summary.warnings.length > 0 ? (
                        <ul className="space-y-1 text-red-500">
                            {summary.warnings.map((warning, index) => (
                                <li key={`${index}-${warning}`}>{warning}</li>
                            ))}
                        </ul>
                    ) : null}
                </div>
            ) : null}
        </form>
    )
}
