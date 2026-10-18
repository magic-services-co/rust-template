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
    envValuesApplied?: number
    fieldsReencrypted: number
    fieldsLeftEncrypted: number
    reencrypted: boolean
    warnings: string[]
}

export function DatabaseImportPanel() {
    const [mode, setMode] = useState<ImportMode>("merge")
    const [databaseUrl, setDatabaseUrl] = useState("")
    const [nextauthSecret, setNextauthSecret] = useState("")
    const [oldEnv, setOldEnv] = useState("")
    const [confirm, setConfirm] = useState("")
    const [busy, setBusy] = useState(false)
    const [summary, setSummary] = useState<ImportSummary | null>(null)
    const confirmWord = mode === "replace" ? "REPLACE" : "MERGE"

    async function waitForImport(jobId: string): Promise<{ message?: string; summary?: ImportSummary }> {
        const started = Date.now()
        for (;;) {
            await new Promise((resolve) => setTimeout(resolve, 2000))
            const headers = await prepareSanctumMutationHeaders({ bearerToken: getAuthToken() })
            const response = await fetch(backendApi(`admin/system-control/import-database/${jobId}`), {
                credentials: "include",
                headers,
            })
            const data = (await response.json().catch(() => null)) as {
                success?: boolean
                status?: string
                message?: string
                summary?: ImportSummary
            } | null
            if (data?.status === "done") {
                return data
            }
            if (!response.ok || data?.status === "failed" || !data?.success) {
                throw new Error(data?.message || "Import failed")
            }
            if (data.status === "queued" && Date.now() - started > 30_000) {
                throw new Error("Import did not start.")
            }
        }
    }

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
                    nextauthSecret: nextauthSecret.trim(),
                    oldEnv,
                    confirm: confirm.trim(),
                }),
            })
            const started = (await response.json().catch(() => null)) as {
                success?: boolean
                pending?: boolean
                jobId?: string
                message?: string
                summary?: ImportSummary
            } | null
            if (!response.ok || !started?.success) {
                toast.error(started?.message || "Import failed")
                return
            }
            const data = started.pending && started.jobId ? await waitForImport(started.jobId) : started
            setSummary(data.summary ?? null)
            setDatabaseUrl("")
            setNextauthSecret("")
            setOldEnv("")
            setConfirm("")
            toast.success(data.message || "Import finished")
        } catch (error) {
            toast.error(error instanceof Error && error.message ? error.message : "Import failed")
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
                <Label htmlFor="import-nextauth-secret">Old NextAuth secret</Label>
                <Input
                    id="import-nextauth-secret"
                    type="password"
                    value={nextauthSecret}
                    onChange={(event) => setNextauthSecret(event.target.value)}
                    placeholder="NEXTAUTH_SECRET"
                    className="font-mono text-xs"
                    autoComplete="off"
                />
                <p className="text-muted-foreground text-xs">
                    Optional. The old template does not encrypt its database with this. Paste it only when a column was saved with NEXTAUTH_SECRET. If you paste the whole .env below, this can stay empty.
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="import-old-env">Old .env</Label>
                <textarea
                    id="import-old-env"
                    value={oldEnv}
                    onChange={(event) => setOldEnv(event.target.value)}
                    placeholder={"PAYNOW_KEY=\nSTEAM_SECRET=\nRUSTMAPS_API_KEY=\nDISCORD_CLIENT_ID=\nDISCORD_CLIENT_SECRET=\nDISCORD_BOT_TOKEN=\nR2_ACCESS_KEY_ID=\nR2_SECRET_ACCESS_KEY="}
                    className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-28 w-full rounded-md border px-3 py-2 font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                    autoComplete="off"
                    spellCheck={false}
                />
                <p className="text-muted-foreground text-xs">
                    PayNow, Steam, RustMaps, Discord, and R2 keys live in the old .env, not in the database. Empty settings on this site are filled from those lines. NEXTAUTH_SECRET in that file is used for the field above.
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
                {busy ? "Importing... this can take several minutes" : mode === "replace" ? "Replace with old data" : "Merge old data"}
            </Button>

            {summary ? (
                <div className="space-y-2 rounded-lg border p-4 text-sm">
                    <p className="font-medium">Import finished</p>
                    <ul className="text-muted-foreground space-y-1">
                        <li>{summary.tables} shared tables read</li>
                        <li>{summary.rowsCopied} rows copied</li>
                        {(summary.playersMerged ?? 0) > 0 ? <li>{summary.playersMerged} players added to users</li> : null}
                        {(summary.envValuesApplied ?? 0) > 0 ? <li>{summary.envValuesApplied} settings copied from the old .env</li> : null}
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
