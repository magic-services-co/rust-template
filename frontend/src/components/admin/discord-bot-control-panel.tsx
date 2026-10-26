"use client"

import { useCallback, useEffect, useState, useRef } from "react"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Bot, ChevronDown, Loader2, Play, Square, RotateCw, Save, RefreshCw, Circle, Settings2, FolderOpen, FileCode } from "lucide-react"

function GitHubIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
            <path d="M12 .5C5.65.5.5 5.65.5 12.02c0 5.1 3.29 9.42 7.86 10.95.58.1.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.28-1.7-1.28-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.64 1.59.24 2.76.12 3.05.74.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.4-5.25 5.69.41.36.78 1.06.78 2.14 0 1.55-.01 2.8-.01 3.18 0 .31.21.67.8.56A10.52 10.52 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
        </svg>
    )
}
import Link from "next/link"

const API_BASE = "/api"

interface DiscordBotState {
    config: Record<string, unknown>
    config_prefilled: Record<string, unknown>
    docker_container_name: string
    docker_image: string
    status: string
    status_label: string
    status_color_class: string
    can_start: boolean
    can_stop: boolean
    can_restart: boolean
    repo_url?: string
    source_path?: string | null
    urls?: { discord_settings: string; api_keys: string }
}

export function DiscordBotControlPanel() {
    const [data, setData] = useState<DiscordBotState | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [notice, setNotice] = useState<string | null>(null)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [saveSuccess, setSaveSuccess] = useState(false)
    const [logs, setLogs] = useState<string>("")
    const [liveLogs, setLiveLogs] = useState(true)
    const logsEndRef = useRef<HTMLPreElement>(null)
    const [configOpen, setConfigOpen] = useState(false)
    const [configForm, setConfigForm] = useState<Record<string, unknown>>({})
    const [filesPath, setFilesPath] = useState("")
    const [filesList, setFilesList] = useState<{ name: string; dir: boolean; path: string }[]>([])
    const [filesLoading, setFilesLoading] = useState(false)
    const [fileContentOpen, setFileContentOpen] = useState(false)
    const [fileContent, setFileContent] = useState({ path: "", content: "" })
    const [ideOpen, setIdeOpen] = useState(false)
    const [ideFilePath, setIdeFilePath] = useState("")
    const [ideContent, setIdeContent] = useState("")
    const [ideDirty, setIdeDirty] = useState(false)
    const [ideSaving, setIdeSaving] = useState(false)

    const fetchState = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/admin/system-control/discord-bot`, {
                credentials: "include",
                headers: { Accept: "application/json" },
            })
            if (!res.ok) {
                setError(res.status === 401 ? "Unauthorized" : "Failed to load")
                setData(null)
                return
            }
            const json = await res.json()
            setData(json)
            setConfigForm(json.config_prefilled ?? json.config ?? {})
            setError(null)
        } catch {
            setError("Failed to load")
            setData(null)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchState()
    }, [fetchState])

    const apiCall = async (
        method: string,
        path: string,
        body?: unknown
    ): Promise<{ success?: boolean; error?: string; message?: string; status?: string }> => {
        const res = await fetch(`${API_BASE}${path}`, {
            method,
            credentials: "include",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            body: body ? JSON.stringify(body) : undefined,
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) return { error: json.error || "Request failed" }
        return json
    }

    const handleSave = async (): Promise<boolean> => {
        setActionLoading("save")
        setSaveSuccess(false)
        const result = await apiCall("PUT", "/admin/system-control/discord-bot", {
            config: configForm,
        })
        setActionLoading(null)
        if (result.error) {
            setError(result.error)
            return false
        }
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 2000)
        fetchState()
        return true
    }

    const handleStart = async () => {
        setActionLoading("start")
        const result = await apiCall("POST", "/admin/system-control/discord-bot/start")
        setActionLoading(null)
        if (result.error) {
            setNotice(null)
            setError(result.error)
        } else {
            setError(null)
            setNotice(result.message ?? null)
            fetchState()
        }
    }

    const handleStop = async () => {
        setActionLoading("stop")
        const result = await apiCall("POST", "/admin/system-control/discord-bot/stop")
        setActionLoading(null)
        if (result.error) {
            setNotice(null)
            setError(result.error)
        } else {
            setError(null)
            setNotice(result.message ?? null)
            fetchState()
        }
    }

    const handleRestart = async () => {
        setActionLoading("restart")
        const result = await apiCall("POST", "/admin/system-control/discord-bot/restart")
        setActionLoading(null)
        if (result.error) {
            setNotice(null)
            setError(result.error)
        } else {
            setError(null)
            setNotice(result.message ?? null)
            fetchState()
        }
    }

    const handleBuildFromGitHub = async () => {
        setActionLoading("build")
        const result = await apiCall("POST", "/admin/system-control/discord-bot/build-from-github")
        setActionLoading(null)
        if (result.error) {
            setNotice(null)
            setError(result.error)
        } else {
            setError(null)
            setNotice(result.message ?? null)
            fetchState()
            loadFiles(filesPath)
        }
    }

    const loadFiles = useCallback(async (path: string) => {
        setFilesLoading(true)
        try {
            const res = await fetch(
                `${API_BASE}/admin/system-control/discord-bot/files?path=${encodeURIComponent(path)}`,
                { credentials: "include" }
            )
            const json = await res.json().catch(() => ({}))
            if (json.items) {
                setFilesList(json.items)
                setFilesPath(path)
            } else setFilesList([])
        } catch {
            setFilesList([])
        } finally {
            setFilesLoading(false)
        }
    }, [])

    const openFile = async (path: string) => {
        try {
            const res = await fetch(
                `${API_BASE}/admin/system-control/discord-bot/file?path=${encodeURIComponent(path)}`,
                { credentials: "include" }
            )
            const json = await res.json().catch(() => ({}))
            if (json.content !== undefined) {
                setFileContent({ path, content: json.content })
                setFileContentOpen(true)
            }
        } catch {
            // ignore
        }
    }

    const openFileInIde = async (path: string) => {
        try {
            const res = await fetch(
                `${API_BASE}/admin/system-control/discord-bot/file?path=${encodeURIComponent(path)}`,
                { credentials: "include" }
            )
            const json = await res.json().catch(() => ({}))
            if (json.content !== undefined) {
                setIdeFilePath(path)
                setIdeContent(json.content)
                setIdeDirty(false)
            }
        } catch {
            // ignore
        }
    }

    const saveIdeFile = async () => {
        if (!ideFilePath) return
        setIdeSaving(true)
        try {
            const res = await fetch(`${API_BASE}/admin/system-control/discord-bot/file`, {
                method: "PUT",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ path: ideFilePath, content: ideContent }),
            })
            const json = await res.json().catch(() => ({}))
            if (json.success) {
                setIdeDirty(false)
            } else {
                setError(json.error ?? "Save failed")
            }
        } finally {
            setIdeSaving(false)
        }
    }

    const repoUrlDisplay = (data?.repo_url ?? "").replace(/\.git$/, "").replace(/^https:\/\//, "")
    const sourcePath = data?.source_path ?? null
    const urls = data?.urls ?? { discord_settings: "/admin/settings/discord", api_keys: "/admin/settings/api-keys" }

    const handleRefreshLogs = useCallback(async () => {
        try {
            const res = await fetch(
                `${API_BASE}/admin/system-control/discord-bot/logs?tail=500`,
                { credentials: "include" }
            )
            const json = await res.json().catch(() => ({}))
            setLogs(json.logs ?? "")
        } catch {
            setLogs("")
        }
    }, [])

    const status = data?.status ?? "missing"
    const isRunning = status === "running"
    useEffect(() => {
        if (!isRunning || !liveLogs) return
        handleRefreshLogs()
        const interval = setInterval(handleRefreshLogs, 2000)
        return () => clearInterval(interval)
    }, [isRunning, liveLogs, handleRefreshLogs])

    useEffect(() => {
        logsEndRef.current?.scrollTo({ top: logsEndRef.current.scrollHeight, behavior: "smooth" })
    }, [logs])

    const updateConfig = (key: string, value: unknown) => {
        setConfigForm((prev) => ({ ...prev, [key]: value }))
    }

    const guildIdsStr = Array.isArray(configForm.GUILD_IDS)
        ? (configForm.GUILD_IDS as string[]).join(", ")
        : typeof configForm.GUILD_IDS === "string"
          ? configForm.GUILD_IDS
          : ""

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (error && !data) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <p className="text-destructive">{error}</p>
                    <Button variant="outline" className="mt-2" onClick={() => fetchState()}>
                        Retry
                    </Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            {error && (
                <p className="whitespace-pre-wrap break-words text-sm text-destructive">{error}</p>
            )}
            {notice && (
                <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{notice}</p>
            )}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex items-center gap-3">
                        <Bot className="size-8 text-muted-foreground" />
                        <div>
                            <CardTitle>Linking Bot</CardTitle>
                            <CardDescription>
                                Run the bot from the GitHub repo. Build the image from GitHub, then Start.
                            </CardDescription>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${data?.status_color_class ?? "bg-muted text-muted-foreground"}`}
                        >
                            {data?.status_label ?? "Unknown"}
                        </span>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => fetchState()}
                            disabled={loading}
                        >
                            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                    <Button
                        onClick={handleStart}
                        disabled={!data?.can_start || actionLoading !== null}
                    >
                        {actionLoading === "start" ? (
                            <Loader2 className="mr-2 size-4 animate-spin" />
                        ) : (
                            <Play className="mr-2 size-4" />
                        )}
                        Start
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleStop}
                        disabled={!data?.can_stop || actionLoading !== null}
                    >
                        {actionLoading === "stop" ? (
                            <Loader2 className="mr-2 size-4 animate-spin" />
                        ) : (
                            <Square className="mr-2 size-4" />
                        )}
                        Stop
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={handleRestart}
                        disabled={!data?.can_restart || actionLoading !== null}
                    >
                        {actionLoading === "restart" ? (
                            <Loader2 className="mr-2 size-4 animate-spin" />
                        ) : (
                            <RotateCw className="mr-2 size-4" />
                        )}
                        Restart
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => setConfigOpen(true)}
                    >
                        <Settings2 className="mr-2 size-4" />
                        Configuration
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleBuildFromGitHub}
                        disabled={actionLoading !== null}
                    >
                        {actionLoading === "build" ? (
                            <Loader2 className="mr-2 size-4 animate-spin" />
                        ) : (
                            <GitHubIcon className="mr-2 size-4" />
                        )}
                        Build from GitHub
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="flex items-center gap-2">
                        <FolderOpen className="size-4" />
                        Project files
                    </CardTitle>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            setIdeOpen(true)
                            loadFiles("")
                        }}
                        disabled={filesLoading}
                    >
                        {filesLoading ? <Loader2 className="size-4 animate-spin" /> : "Open IDE"}
                    </Button>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                        Browse files from the cloned repo. Run &quot;Build from GitHub&quot; first to clone the repo.
                    </p>
                    <div className="rounded-md border border-border/15 bg-muted/30 min-h-[200px] max-h-[320px] overflow-auto">
                        {filesList.length === 0 && !filesLoading ? (
                            <p className="p-4 text-sm text-muted-foreground">
                                No files. Click Open IDE to browse, or Build from GitHub to clone the repo.
                            </p>
                        ) : (
                            <ul className="p-2 space-y-0.5">
                                {filesPath ? (
                                    <li>
                                        <button
                                            type="button"
                                            className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded hover:bg-muted text-sm"
                                            onClick={() => loadFiles(filesPath.replace(/\/[^/]+$/, "") || "")}
                                        >
                                            <FolderOpen className="size-4 text-amber-500" />
                                            ..
                                        </button>
                                    </li>
                                ) : null}
                                {filesList.map((item) => (
                                    <li key={item.path}>
                                        {item.dir ? (
                                            <button
                                                type="button"
                                                className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded hover:bg-muted text-sm"
                                                onClick={() => loadFiles(item.path)}
                                            >
                                                <FolderOpen className="size-4 text-amber-500" />
                                                {item.name}
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded hover:bg-muted text-sm font-mono"
                                                onClick={() => openFile(item.path)}
                                            >
                                                <FileCode className="size-4 text-zinc-500" />
                                                {item.name}
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </CardContent>
            </Card>
            <Dialog open={fileContentOpen} onOpenChange={setFileContentOpen}>
                <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="font-mono text-sm truncate">{fileContent.path}</DialogTitle>
                    </DialogHeader>
                    <pre className="flex-1 overflow-auto rounded bg-zinc-950 p-4 text-xs font-mono text-zinc-300 whitespace-pre-wrap">
                        {fileContent.content}
                    </pre>
                </DialogContent>
            </Dialog>

            <Dialog open={ideOpen} onOpenChange={(open) => { setIdeOpen(open); if (!open) setIdeFilePath("") }}>
                <DialogContent className="max-w-[95vw] w-full h-[90vh] flex flex-col p-0 gap-0">
                    <div className="flex items-center justify-between border-b px-4 py-2 bg-muted/50">
                        <DialogTitle className="text-base font-medium">IDE — Bot source on this site</DialogTitle>
                        <Button variant="ghost" size="sm" onClick={() => setIdeOpen(false)}>Close</Button>
                    </div>
                    <div className="flex flex-1 min-h-0">
                        <div className="w-64 shrink-0 border-r overflow-auto bg-muted/20 p-2">
                            <p className="text-xs text-muted-foreground mb-2 font-medium">Files</p>
                            {filesPath ? (
                                <button
                                    type="button"
                                    className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded hover:bg-muted text-sm"
                                    onClick={() => loadFiles(filesPath.replace(/\/[^/]+$/, "") || "")}
                                >
                                    <FolderOpen className="size-4 text-amber-500" />
                                    ..
                                </button>
                            ) : null}
                            {filesList.map((item) => (
                                <div key={item.path}>
                                    {item.dir ? (
                                        <button
                                            type="button"
                                            className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded hover:bg-muted text-sm"
                                            onClick={() => loadFiles(item.path)}
                                        >
                                            <FolderOpen className="size-4 text-amber-500" />
                                            {item.name}
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            className={`flex items-center gap-2 w-full text-left px-2 py-1.5 rounded hover:bg-muted text-sm font-mono truncate ${ideFilePath === item.path ? "bg-primary/10 text-primary" : ""}`}
                                            onClick={() => openFileInIde(item.path)}
                                        >
                                            <FileCode className="size-4 text-zinc-500 shrink-0" />
                                            <span className="truncate">{item.name}</span>
                                        </button>
                                    )}
                                </div>
                            ))}
                            {filesList.length === 0 && !filesLoading && (
                                <p className="text-xs text-muted-foreground px-2">No files. Build from GitHub first.</p>
                            )}
                        </div>
                        <div className="flex-1 flex flex-col min-w-0">
                            {ideFilePath ? (
                                <>
                                    <div className="flex items-center justify-between border-b px-3 py-1.5 bg-muted/30">
                                        <span className="text-xs font-mono truncate text-muted-foreground">{ideFilePath}</span>
                                        <Button
                                            size="sm"
                                            disabled={!ideDirty || ideSaving}
                                            onClick={saveIdeFile}
                                        >
                                            {ideSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                                            {ideSaving ? " Saving…" : " Save"}
                                        </Button>
                                    </div>
                                    <textarea
                                        className="flex-1 w-full p-4 font-mono text-sm bg-zinc-950 text-zinc-300 resize-none focus:outline-none focus:ring-0"
                                        value={ideContent}
                                        onChange={(e) => { setIdeContent(e.target.value); setIdeDirty(true) }}
                                        spellCheck={false}
                                    />
                                </>
                            ) : (
                                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                                    Select a file from the list to view and edit.
                                </div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={configOpen} onOpenChange={setConfigOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Bot configuration</DialogTitle>
                        <DialogDescription>
                            Config is written to the container when you Start or Restart.                             Get Discord
                            values from{" "}
                            <Link href={urls.discord_settings} className="text-primary underline" onClick={() => setConfigOpen(false)}>
                                Discord settings
                            </Link>
                            ; create an API key in{" "}
                            <Link href={urls.api_keys} className="text-primary underline" onClick={() => setConfigOpen(false)}>
                                API Keys
                            </Link>
                            .
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="modal_api_key">API Key</Label>
                                <Input
                                    id="modal_api_key"
                                    type="password"
                                    placeholder="Linking Bot API key"
                                    value={(configForm.API_KEY as string) ?? ""}
                                    onChange={(e) => updateConfig("API_KEY", e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="modal_bot_token">BOT_TOKEN</Label>
                                <Input
                                    id="modal_bot_token"
                                    type="password"
                                    placeholder="Discord bot token"
                                    value={(configForm.BOT_TOKEN as string) ?? ""}
                                    onChange={(e) => updateConfig("BOT_TOKEN", e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="modal_client_id">CLIENT_ID</Label>
                                <Input
                                    id="modal_client_id"
                                    placeholder="Discord application client ID"
                                    value={(configForm.CLIENT_ID as string) ?? ""}
                                    onChange={(e) => updateConfig("CLIENT_ID", e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="modal_guild_ids">GUILD_IDS (comma-separated)</Label>
                                <Input
                                    id="modal_guild_ids"
                                    placeholder="e.g. 123456789, 987654321"
                                    value={guildIdsStr}
                                    onChange={(e) =>
                                        updateConfig(
                                            "GUILD_IDS",
                                            e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                                        )
                                    }
                                />
                            </div>
                            <div className="space-y-2 sm:col-span-2">
                                <Label htmlFor="modal_api_endpoint">API_ENDPOINT</Label>
                                <Input
                                    id="modal_api_endpoint"
                                    placeholder="https://yourdomain.com/api"
                                    value={(configForm.API_ENDPOINT as string) ?? ""}
                                    onChange={(e) => updateConfig("API_ENDPOINT", e.target.value)}
                                />
                            </div>
                        </div>

                        <Collapsible>
                            <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                                <ChevronDown className="size-4" />
                                Advanced options
                            </CollapsibleTrigger>
                            <CollapsibleContent className="mt-4 space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="modal_update_freq">UPDATE_CHECK_FREQUENCY (minutes)</Label>
                                        <Input
                                            id="modal_update_freq"
                                            type="number"
                                            min={1}
                                            value={
                                                (configForm["UPDATE_CHECK_FREQUENCY (MINUTES)"] as number) ?? 1
                                            }
                                            onChange={(e) =>
                                                updateConfig(
                                                    "UPDATE_CHECK_FREQUENCY (MINUTES)",
                                                    parseInt(e.target.value, 10) || 1
                                                )
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="modal_embed_hex">EMBED_HEX (no #)</Label>
                                        <Input
                                            id="modal_embed_hex"
                                            placeholder="0099FF"
                                            value={(configForm.EMBED_HEX as string) ?? "0099FF"}
                                            onChange={(e) => updateConfig("EMBED_HEX", e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="modal_activity_type">ACTIVITY_TYPE</Label>
                                        <Input
                                            id="modal_activity_type"
                                            placeholder="Custom, Playing, etc."
                                            value={(configForm.ACTIVITY_TYPE as string) ?? "Custom"}
                                            onChange={(e) => updateConfig("ACTIVITY_TYPE", e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2 sm:col-span-2">
                                        <Label htmlFor="modal_status_text">STATUS_TEXT ({`{USERS_AMOUNT}`} = linked count)</Label>
                                        <Input
                                            id="modal_status_text"
                                            placeholder="{USERS_AMOUNT} users linked!"
                                            value={(configForm.STATUS_TEXT as string) ?? ""}
                                            onChange={(e) => updateConfig("STATUS_TEXT", e.target.value)}
                                        />
                                    </div>
                                </div>
                            </CollapsibleContent>
                        </Collapsible>

                        <div className="flex items-center gap-2 pt-2">
                            <Button
                                onClick={async () => {
                                    const ok = await handleSave()
                                    if (ok) setTimeout(() => setConfigOpen(false), 1200)
                                }}
                                disabled={actionLoading !== null}
                            >
                                {actionLoading === "save" ? (
                                    <Loader2 className="mr-2 size-4 animate-spin" />
                                ) : (
                                    <Save className="mr-2 size-4" />
                                )}
                                Save config
                            </Button>
                            {saveSuccess && (
                                <span className="text-sm text-emerald-600 dark:text-emerald-400">
                                    Saved.
                                </span>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <div className="rounded-lg border border-border/15 bg-zinc-950 shadow-inner overflow-hidden">
                <div className="flex items-center justify-between gap-2 border-b border-zinc-800 bg-zinc-900/80 px-4 py-2">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-zinc-300">Console</span>
                        {isRunning && (
                            <button
                                type="button"
                                onClick={() => setLiveLogs((v) => !v)}
                                className={`flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium transition-colors ${liveLogs ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-700 text-zinc-400"}`}
                            >
                                <Circle className={`size-1.5 fill-current ${liveLogs ? "animate-pulse" : ""}`} />
                                {liveLogs ? "Live" : "Paused"}
                            </button>
                        )}
                    </div>
                </div>
                <pre
                    ref={logsEndRef}
                    className="min-h-[calc(100vh-20rem)] max-h-[calc(100vh-12rem)] overflow-auto p-4 text-[13px] font-mono leading-relaxed text-zinc-300 whitespace-pre-wrap selection:bg-zinc-700"
                >
                    {logs}
                </pre>
            </div>
        </div>
    )
}
