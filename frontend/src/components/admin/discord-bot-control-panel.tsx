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
import { Bot, Loader2, Play, Square, RotateCw, Save, RefreshCw, Circle, Settings2, FolderOpen, FileCode, Plus, Trash2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

function GitHubIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
            <path d="M12 .5C5.65.5.5 5.65.5 12.02c0 5.1 3.29 9.42 7.86 10.95.58.1.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.28-1.7-1.28-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.64 1.59.24 2.76.12 3.05.74.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.4-5.25 5.69.41.36.78 1.06.78 2.14 0 1.55-.01 2.8-.01 3.18 0 .31.21.67.8.56A10.52 10.52 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
        </svg>
    )
}
import Link from "next/link"

const API_BASE = "/api"

const ACTIVITY_TYPES = ["Custom", "Playing", "Listening", "Watching", "Competing", "Streaming"]

type MapVoteRow = { guild: string; channel: string }
type RoleMapRow = { slug: string; roles: string }
type SupportCategoryOption = { slug: string; name: string }
type DiscordRoleOption = { id: string; name: string; guildId: string }

function textList(value: unknown): string[] {
    if (Array.isArray(value)) return value.map((item) => String(item))
    if (typeof value === "string") return value.split(",").map((item) => item.trim())
    return []
}

function cleanTextList(value: unknown): string[] {
    return textList(value).map((item) => item.trim()).filter(Boolean)
}

function mapVoteRows(value: unknown): MapVoteRow[] {
    if (!Array.isArray(value)) return [{ guild: "", channel: "" }]
    const rows = value.map((row) => {
        const item = row && typeof row === "object" ? (row as Record<string, unknown>) : {}
        return { guild: String(item.guild ?? ""), channel: String(item.channel ?? "") }
    })
    return rows.length > 0 ? rows : [{ guild: "", channel: "" }]
}

function roleMapRows(value: unknown): RoleMapRow[] {
    if (!value || typeof value !== "object" || Array.isArray(value)) return [{ slug: "", roles: "" }]
    const rows = Object.entries(value as Record<string, unknown>).map(([slug, roles]) => ({
        slug,
        roles: Array.isArray(roles) ? roles.map(String).join(", ") : "",
    }))
    return rows.length > 0 ? rows : [{ slug: "", roles: "" }]
}

function roleMapFromRows(rows: RoleMapRow[]): Record<string, string[]> {
    const map: Record<string, string[]> = {}
    for (const row of rows) {
        const slug = row.slug.trim()
        if (!slug) continue
        map[slug] = row.roles.split(",").map((item) => item.trim()).filter(Boolean)
    }
    return map
}

function withRoleId(value: unknown, roleId: string): string[] {
    const ids = cleanTextList(value)
    if (!ids.includes(roleId)) ids.push(roleId)
    return ids
}

function withRoleIdText(value: string, roleId: string): string {
    const ids = value.split(",").map((item) => item.trim()).filter(Boolean)
    if (!ids.includes(roleId)) ids.push(roleId)
    return ids.join(", ")
}

function DiscordRolePicker({
    roles,
    refreshing,
    onRefresh,
    onPick,
}: {
    roles: DiscordRoleOption[]
    refreshing: boolean
    onRefresh: () => void
    onPick: (roleId: string) => void
}) {
    const duplicateNames = new Set(
        roles.filter((role, index) => roles.some((other, otherIndex) => otherIndex !== index && other.name === role.name)).map((role) => role.name)
    )
    const [pickKey, setPickKey] = useState(0)
    return (
        <div className="flex gap-2">
            <Select
                key={pickKey}
                disabled={roles.length === 0}
                onValueChange={(roleId) => {
                    onPick(roleId)
                    setPickKey((key) => key + 1)
                }}
            >
                <SelectTrigger>
                    <SelectValue placeholder={roles.length > 0 ? "Add a Discord role" : "No Discord roles loaded"} />
                </SelectTrigger>
                <SelectContent>
                    {roles.map((role) => (
                        <SelectItem key={`${role.guildId}:${role.id}`} value={role.id}>
                            {duplicateNames.has(role.name) ? `${role.name} (${role.guildId})` : role.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Button type="button" variant="outline" size="icon" title="Refresh Discord roles" onClick={onRefresh} disabled={refreshing}>
                <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
        </div>
    )
}

function RoleIdListField({
    id,
    label,
    value,
    onChange,
    roles,
    refreshing,
    onRefresh,
}: {
    id: string
    label: string
    value: unknown
    onChange: (ids: string[]) => void
    roles: DiscordRoleOption[]
    refreshing: boolean
    onRefresh: () => void
}) {
    return (
        <div className="space-y-2 sm:col-span-2">
            <Label htmlFor={id}>{label}</Label>
            <DiscordRolePicker roles={roles} refreshing={refreshing} onRefresh={onRefresh} onPick={(roleId) => onChange(withRoleId(value, roleId))} />
            <Input
                id={id}
                placeholder="Or type role IDs, separated by commas"
                value={textList(value).join(", ")}
                onChange={(e) => onChange(e.target.value.split(",").map((item) => item.trim()))}
            />
        </div>
    )
}

function RoleMapFields({
    label,
    rows,
    onChange,
    categories,
    roles,
    refreshing,
    onRefresh,
}: {
    label: string
    rows: RoleMapRow[]
    onChange: (rows: RoleMapRow[]) => void
    categories: SupportCategoryOption[]
    roles: DiscordRoleOption[]
    refreshing: boolean
    onRefresh: () => void
}) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
                <Label>{label}</Label>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onChange([...rows, { slug: "", roles: "" }])}
                >
                    <Plus className="mr-1 size-3.5" />
                    Add
                </Button>
            </div>
            {rows.map((row, index) => {
                const knownSlug = categories.some((category) => category.slug === row.slug)
                return (
                    <div key={index} className="space-y-2 rounded-md border border-border/15 p-3">
                        <div className="flex justify-end">
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                title="Remove"
                                onClick={() =>
                                    onChange(rows.length === 1 ? [{ slug: "", roles: "" }] : rows.filter((_, i) => i !== index))
                                }
                            >
                                <Trash2 className="size-4" />
                            </Button>
                        </div>
                        <Select
                            value={knownSlug ? row.slug : undefined}
                            onValueChange={(slug) =>
                                onChange(rows.map((item, i) => (i === index ? { ...item, slug } : item)))
                            }
                            disabled={categories.length === 0}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={categories.length > 0 ? "Select a support category" : "No support categories found"} />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map((category) => (
                                    <SelectItem key={category.slug} value={category.slug}>
                                        {category.name} ({category.slug})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Input
                            placeholder="Or type a category slug"
                            value={row.slug}
                            onChange={(e) =>
                                onChange(rows.map((item, i) => (i === index ? { ...item, slug: e.target.value } : item)))
                            }
                        />
                        <DiscordRolePicker
                            roles={roles}
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            onPick={(roleId) =>
                                onChange(rows.map((item, i) => (i === index ? { ...item, roles: withRoleIdText(item.roles, roleId) } : item)))
                            }
                        />
                        <Input
                            placeholder="Or type role IDs, separated by commas"
                            value={row.roles}
                            onChange={(e) =>
                                onChange(rows.map((item, i) => (i === index ? { ...item, roles: e.target.value } : item)))
                            }
                        />
                    </div>
                )
            })}
        </div>
    )
}

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
    const [mapVotes, setMapVotes] = useState<MapVoteRow[]>([{ guild: "", channel: "" }])
    const [accessRoles, setAccessRoles] = useState<RoleMapRow[]>([{ slug: "", roles: "" }])
    const [pingRoles, setPingRoles] = useState<RoleMapRow[]>([{ slug: "", roles: "" }])
    const [supportCategories, setSupportCategories] = useState<SupportCategoryOption[]>([])
    const [discordRoles, setDiscordRoles] = useState<DiscordRoleOption[]>([])
    const [rolesRefreshing, setRolesRefreshing] = useState(false)
    const [rolesMessage, setRolesMessage] = useState<string | null>(null)
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
            const config = json.config_prefilled ?? json.config ?? {}
            setData(json)
            setConfigForm(config)
            setMapVotes(mapVoteRows(config.MAP_VOTES_CHANNELS))
            setAccessRoles(roleMapRows(config.TICKET_CATEGORY_ACCESS_ROLES))
            setPingRoles(roleMapRows(config.TICKET_CATEGORY_PING_ROLES))
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

    const configuredGuildIds = cleanTextList(configForm.GUILD_IDS)
    const guildKey = configuredGuildIds.join(",")

    const loadDiscordRoles = useCallback(async (guildIds: string[], refresh: boolean) => {
        if (guildIds.length === 0) {
            setDiscordRoles([])
            setRolesMessage("Add a server ID to load Discord roles. You can still type a role ID.")
            return
        }
        setRolesRefreshing(true)
        setRolesMessage(null)
        try {
            const lists = await Promise.all(guildIds.map(async (guildId) => {
                const res = await fetch(`${API_BASE}/admin/discord/roles?guildId=${encodeURIComponent(guildId)}`, {
                    method: refresh ? "POST" : "GET",
                    credentials: "include",
                    headers: { Accept: "application/json" },
                })
                const json = await res.json().catch(() => ({}))
                if (!res.ok) {
                    throw new Error(typeof json.error === "string" ? json.error : "Could not load Discord roles")
                }
                const roles = Array.isArray(json.roles) ? json.roles : []
                return roles.map((role: { id?: string; name?: string }) => ({
                    id: String(role.id ?? ""),
                    name: role.name || String(role.id ?? ""),
                    guildId,
                })).filter((role: DiscordRoleOption) => role.id !== "")
            }))
            const loaded = lists.flat()
            setDiscordRoles(loaded)
            if (loaded.length === 0) {
                setRolesMessage("No Discord roles are stored yet. Refresh to pull them from Discord.")
            }
        } catch (err) {
            setRolesMessage(err instanceof Error ? err.message : "Could not load Discord roles")
        } finally {
            setRolesRefreshing(false)
        }
    }, [])

    useEffect(() => {
        if (!configOpen) return
        let cancelled = false
        ;(async () => {
            const res = await fetch(`${API_BASE}/admin/ticket-settings`, {
                credentials: "include",
                headers: { Accept: "application/json" },
            })
            if (!res.ok || cancelled) return
            const json = await res.json().catch(() => [])
            if (!cancelled && Array.isArray(json)) {
                setSupportCategories(
                    json
                        .map((category: { slug?: string; name?: string }) => ({
                            slug: String(category.slug ?? ""),
                            name: category.name || String(category.slug ?? ""),
                        }))
                        .filter((category: SupportCategoryOption) => category.slug !== "")
                )
            }
        })()
        return () => {
            cancelled = true
        }
    }, [configOpen])

    useEffect(() => {
        if (!configOpen) return
        void loadDiscordRoles(configuredGuildIds, false)
    }, [configOpen, guildKey, loadDiscordRoles])

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
            config: {
                ...configForm,
                GUILD_IDS: cleanTextList(configForm.GUILD_IDS),
                VIEW_MEMBERS_ROLES: cleanTextList(configForm.VIEW_MEMBERS_ROLES),
                SYNC_USERS_PERMS: cleanTextList(configForm.SYNC_USERS_PERMS),
                TICKET_SUPPORT_ROLE_IDS: cleanTextList(configForm.TICKET_SUPPORT_ROLE_IDS),
                MAP_VOTES_CHANNELS: mapVotes
                    .map((row) => ({ guild: row.guild.trim(), channel: row.channel.trim() }))
                    .filter((row) => row.guild !== "" || row.channel !== ""),
                TICKET_CATEGORY_ACCESS_ROLES: roleMapFromRows(accessRoles),
                TICKET_CATEGORY_PING_ROLES: roleMapFromRows(pingRoles),
                ROLE_SYNC_ENABLED: Boolean(configForm.ROLE_SYNC_ENABLED),
                SET_DISCORD_NAME_TO_STEAM_NAME: Boolean(configForm.SET_DISCORD_NAME_TO_STEAM_NAME),
                "UPDATE_CHECK_FREQUENCY (MINUTES)":
                    Number(configForm["UPDATE_CHECK_FREQUENCY (MINUTES)"]) || 1,
            },
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
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Bot configuration</DialogTitle>
                        <DialogDescription>
                            These fields are written to the bot config when you Start or Restart. Get Discord values from{" "}
                            <Link href={urls.discord_settings} className="text-primary underline" onClick={() => setConfigOpen(false)}>
                                Discord settings
                            </Link>
                            , and create an API key in{" "}
                            <Link href={urls.api_keys} className="text-primary underline" onClick={() => setConfigOpen(false)}>
                                API Keys
                            </Link>
                            .
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                        <section className="space-y-4">
                            <h3 className="text-sm font-medium">Connection</h3>
                            <div className="grid gap-4 sm:grid-cols-2">
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
                                    <Label htmlFor="modal_link_bot_token">LINK_BOT_TOKEN</Label>
                                    <Input
                                        id="modal_link_bot_token"
                                        type="password"
                                        value={(configForm.LINK_BOT_TOKEN as string) ?? ""}
                                        onChange={(e) => updateConfig("LINK_BOT_TOKEN", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="modal_support_bot_token">SUPPORT_BOT_TOKEN</Label>
                                    <Input
                                        id="modal_support_bot_token"
                                        type="password"
                                        value={(configForm.SUPPORT_BOT_TOKEN as string) ?? ""}
                                        onChange={(e) => updateConfig("SUPPORT_BOT_TOKEN", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor="modal_guild_ids">GUILD_IDS</Label>
                                    <Input
                                        id="modal_guild_ids"
                                        placeholder="Server IDs, separated by commas"
                                        value={textList(configForm.GUILD_IDS).join(", ")}
                                        onChange={(e) => updateConfig("GUILD_IDS", e.target.value.split(",").map((item) => item.trim()))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="modal_api_key">API_KEY</Label>
                                    <Input
                                        id="modal_api_key"
                                        type="password"
                                        placeholder="Linking Bot API key"
                                        value={(configForm.API_KEY as string) ?? ""}
                                        onChange={(e) => updateConfig("API_KEY", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="modal_api_endpoint">API_ENDPOINT</Label>
                                    <Input
                                        id="modal_api_endpoint"
                                        placeholder="https://yourdomain.com/api"
                                        value={(configForm.API_ENDPOINT as string) ?? ""}
                                        onChange={(e) => updateConfig("API_ENDPOINT", e.target.value)}
                                    />
                                </div>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h3 className="text-sm font-medium">Roles</h3>
                            {rolesMessage && (
                                <p className="text-xs text-muted-foreground">{rolesMessage}</p>
                            )}
                            <div className="grid gap-4 sm:grid-cols-2">
                                <RoleIdListField
                                    id="modal_view_members"
                                    label="VIEW_MEMBERS_ROLES"
                                    value={configForm.VIEW_MEMBERS_ROLES}
                                    onChange={(ids) => updateConfig("VIEW_MEMBERS_ROLES", ids)}
                                    roles={discordRoles}
                                    refreshing={rolesRefreshing}
                                    onRefresh={() => void loadDiscordRoles(configuredGuildIds, true)}
                                />
                                <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor="modal_sync_perms">SYNC_USERS_PERMS</Label>
                                    <Input
                                        id="modal_sync_perms"
                                        placeholder="ManageRoles"
                                        value={textList(configForm.SYNC_USERS_PERMS).join(", ")}
                                        onChange={(e) => updateConfig("SYNC_USERS_PERMS", e.target.value.split(",").map((item) => item.trim()))}
                                    />
                                </div>
                            </div>
                            <div className="flex items-center justify-between gap-4 rounded-md border border-border/15 px-3 py-2">
                                <Label htmlFor="modal_role_sync">ROLE_SYNC_ENABLED</Label>
                                <Switch
                                    id="modal_role_sync"
                                    checked={Boolean(configForm.ROLE_SYNC_ENABLED)}
                                    onCheckedChange={(checked) => updateConfig("ROLE_SYNC_ENABLED", checked)}
                                />
                            </div>
                            <div className="flex items-center justify-between gap-4 rounded-md border border-border/15 px-3 py-2">
                                <Label htmlFor="modal_steam_name">SET_DISCORD_NAME_TO_STEAM_NAME</Label>
                                <Switch
                                    id="modal_steam_name"
                                    checked={Boolean(configForm.SET_DISCORD_NAME_TO_STEAM_NAME)}
                                    onCheckedChange={(checked) => updateConfig("SET_DISCORD_NAME_TO_STEAM_NAME", checked)}
                                />
                            </div>
                        </section>

                        <section className="space-y-3">
                            <div className="flex items-center justify-between gap-2">
                                <h3 className="text-sm font-medium">MAP_VOTES_CHANNELS</h3>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setMapVotes((rows) => [...rows, { guild: "", channel: "" }])}
                                >
                                    <Plus className="mr-1 size-3.5" />
                                    Add
                                </Button>
                            </div>
                            {mapVotes.map((row, index) => (
                                <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                                    <Input
                                        placeholder="Guild ID"
                                        value={row.guild}
                                        onChange={(e) =>
                                            setMapVotes((rows) => rows.map((item, i) => (i === index ? { ...item, guild: e.target.value } : item)))
                                        }
                                    />
                                    <Input
                                        placeholder="Channel ID"
                                        value={row.channel}
                                        onChange={(e) =>
                                            setMapVotes((rows) => rows.map((item, i) => (i === index ? { ...item, channel: e.target.value } : item)))
                                        }
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        title="Remove"
                                        onClick={() =>
                                            setMapVotes((rows) => (rows.length === 1 ? [{ guild: "", channel: "" }] : rows.filter((_, i) => i !== index)))
                                        }
                                    >
                                        <Trash2 className="size-4" />
                                    </Button>
                                </div>
                            ))}
                        </section>

                        <section className="space-y-4">
                            <h3 className="text-sm font-medium">Presence</h3>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="modal_update_freq">UPDATE_CHECK_FREQUENCY (MINUTES)</Label>
                                    <Input
                                        id="modal_update_freq"
                                        type="number"
                                        min={1}
                                        value={(configForm["UPDATE_CHECK_FREQUENCY (MINUTES)"] as number) ?? 1}
                                        onChange={(e) =>
                                            updateConfig("UPDATE_CHECK_FREQUENCY (MINUTES)", parseInt(e.target.value, 10) || 1)
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="modal_embed_hex">EMBED_HEX</Label>
                                    <Input
                                        id="modal_embed_hex"
                                        placeholder="0099FF"
                                        value={(configForm.EMBED_HEX as string) ?? "0099FF"}
                                        onChange={(e) => updateConfig("EMBED_HEX", e.target.value.replace(/^#/, ""))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="modal_activity_type">ACTIVITY_TYPE</Label>
                                    <Select
                                        value={ACTIVITY_TYPES.includes(String(configForm.ACTIVITY_TYPE ?? "Custom")) ? String(configForm.ACTIVITY_TYPE ?? "Custom") : "Custom"}
                                        onValueChange={(value) => updateConfig("ACTIVITY_TYPE", value)}
                                    >
                                        <SelectTrigger id="modal_activity_type">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ACTIVITY_TYPES.map((type) => (
                                                <SelectItem key={type} value={type}>{type}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="modal_status_text">STATUS_TEXT</Label>
                                    <Input
                                        id="modal_status_text"
                                        placeholder="{USERS_AMOUNT} users linked!"
                                        value={(configForm.STATUS_TEXT as string) ?? ""}
                                        onChange={(e) => updateConfig("STATUS_TEXT", e.target.value)}
                                    />
                                </div>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h3 className="text-sm font-medium">Tickets</h3>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="modal_ticket_panel">TICKET_PANEL_TYPE</Label>
                                    <Select
                                        value={(configForm.TICKET_PANEL_TYPE as string) === "buttons" ? "buttons" : "dropdown"}
                                        onValueChange={(value) => updateConfig("TICKET_PANEL_TYPE", value)}
                                    >
                                        <SelectTrigger id="modal_ticket_panel">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="dropdown">dropdown</SelectItem>
                                            <SelectItem value="buttons">buttons</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="modal_ticket_mode">TICKET_MODE</Label>
                                    <Select
                                        value={(configForm.TICKET_MODE as string) === "dm" ? "dm" : "channel"}
                                        onValueChange={(value) => updateConfig("TICKET_MODE", value)}
                                    >
                                        <SelectTrigger id="modal_ticket_mode">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="channel">channel</SelectItem>
                                            <SelectItem value="dm">dm</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <RoleIdListField
                                    id="modal_ticket_support"
                                    label="TICKET_SUPPORT_ROLE_IDS"
                                    value={configForm.TICKET_SUPPORT_ROLE_IDS}
                                    onChange={(ids) => updateConfig("TICKET_SUPPORT_ROLE_IDS", ids)}
                                    roles={discordRoles}
                                    refreshing={rolesRefreshing}
                                    onRefresh={() => void loadDiscordRoles(configuredGuildIds, true)}
                                />
                                <div className="space-y-2">
                                    <Label htmlFor="modal_ticket_dm_guild">TICKET_DM_GUILD_ID</Label>
                                    <Input
                                        id="modal_ticket_dm_guild"
                                        value={(configForm.TICKET_DM_GUILD_ID as string) ?? ""}
                                        onChange={(e) => updateConfig("TICKET_DM_GUILD_ID", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="modal_ticket_dm_category">TICKET_DM_CHANNEL_CATEGORY_ID</Label>
                                    <Input
                                        id="modal_ticket_dm_category"
                                        value={(configForm.TICKET_DM_CHANNEL_CATEGORY_ID as string) ?? ""}
                                        onChange={(e) => updateConfig("TICKET_DM_CHANNEL_CATEGORY_ID", e.target.value)}
                                    />
                                </div>
                            </div>
                            <RoleMapFields
                                label="TICKET_CATEGORY_ACCESS_ROLES"
                                rows={accessRoles}
                                onChange={setAccessRoles}
                                categories={supportCategories}
                                roles={discordRoles}
                                refreshing={rolesRefreshing}
                                onRefresh={() => void loadDiscordRoles(configuredGuildIds, true)}
                            />
                            <RoleMapFields
                                label="TICKET_CATEGORY_PING_ROLES"
                                rows={pingRoles}
                                onChange={setPingRoles}
                                categories={supportCategories}
                                roles={discordRoles}
                                refreshing={rolesRefreshing}
                                onRefresh={() => void loadDiscordRoles(configuredGuildIds, true)}
                            />
                        </section>

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
