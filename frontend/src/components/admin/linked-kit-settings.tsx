"use client"

import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { fetchServerTags } from "@/components/admin/servers/server-tag-picker"
import { KitInventory, KitInventoryEditor, type KitSlotItem } from "@/components/kit-inventory"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { backendApi } from "@/lib/api"
import { getAuthToken } from "@/lib/laravel-auth"
import { rustItemMap, type RustItemInfo } from "@/lib/rust-items"
import { prepareSanctumMutationHeaders } from "@/lib/sanctum-csrf"

type KitSource = "plugin" | "manual"
type KitScope = "site" | "server" | "tag"

type KitItem = KitSlotItem

type LinkedKit = {
    id?: number
    scope: KitScope
    serverId?: string | null
    tagId?: number | null
    label?: string
    kitName: string
    source: KitSource
    items: KitItem[]
    syncedAt?: string | null
}

type DraftKit = LinkedKit & { key: string }

type ServerOption = {
    server_id: string
    server_name: string
}

function newKey(): string {
    if (typeof crypto.randomUUID === "function") {
        return crypto.randomUUID()
    }
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function emptyKit(): DraftKit {
    return {
        key: `new-${newKey()}`,
        scope: "tag",
        serverId: "",
        tagId: null,
        kitName: "linked",
        source: "plugin",
        items: [],
    }
}

export function LinkedKitSettings() {
    const queryClient = useQueryClient()
    const [kits, setKits] = useState<DraftKit[]>([])

    const kitQuery = useQuery({
        queryKey: ["admin-linked-kit"],
        queryFn: () => fetchJson<{ kits?: LinkedKit[] }>("admin/link/kit"),
    })

    const serversQuery = useQuery({
        queryKey: ["linked-kit-servers"],
        queryFn: () => fetchJson<{ servers?: ServerOption[] }>("admin/servers"),
    })

    const tagsQuery = useQuery({
        queryKey: ["linked-kit-tags"],
        queryFn: fetchServerTags,
    })

    const rustItemsQuery = useQuery({
        queryKey: ["rust-items"],
        queryFn: async () => {
            const response = await fetch("/api/rust-items", { headers: { Accept: "application/json" }, cache: "no-store" })
            if (!response.ok) return rustItemMap([])
            const data = (await response.json()) as RustItemInfo[]
            return rustItemMap(Array.isArray(data) ? data : [])
        },
        staleTime: 60 * 60 * 1000,
    })

    useEffect(() => {
        const rows = kitQuery.data?.kits
        if (!rows) return
        setKits(
            rows.map((kit) => ({
                ...kit,
                key: String(kit.id ?? newKey()),
                serverId: kit.serverId ?? "",
                kitName: kit.kitName ?? "",
                items: (kit.items ?? []).map((item) => ({
                    shortname: item.shortname ?? "",
                    amount: item.amount ?? 1,
                    slot: item.slot ?? null,
                    condition: item.condition ?? null,
                })),
            })),
        )
    }, [kitQuery.data])

    const save = useMutation({
        mutationFn: async () => {
            const headers = await prepareSanctumMutationHeaders({ json: true, bearerToken: getAuthToken() })
            const response = await fetch(backendApi("admin/link/kit"), {
                method: "PUT",
                credentials: "include",
                headers,
                body: JSON.stringify({
                    kits: kits.map((kit) => ({
                        id: kit.id,
                        scope: kit.scope,
                        serverId: kit.serverId || null,
                        tagId: kit.scope === "tag" ? kit.tagId : null,
                        kitName: kit.kitName.trim() || "linked",
                        source: kit.source,
                        items: kit.source === "manual"
                            ? kit.items
                                .filter((item) => item.shortname.trim() !== "")
                                .map((item) => ({
                                    shortname: item.shortname.trim().toLowerCase(),
                                    amount: item.amount,
                                    slot: item.slot ?? null,
                                    condition: item.condition ?? null,
                                }))
                            : [],
                    })),
                }),
            })
            if (!response.ok) {
                const body = await response.json().catch(() => ({}))
                throw new Error(typeof body.message === "string" ? body.message : "Could not save the linked kits")
            }
            return response.json() as Promise<{ kits?: LinkedKit[] }>
        },
        onSuccess: async () => {
            toast.success("Linked kits saved")
            await queryClient.invalidateQueries({ queryKey: ["admin-linked-kit"] })
            await queryClient.invalidateQueries({ queryKey: ["link-kit"] })
        },
        onError: (error: Error) => {
            toast.error(error.message || "Could not save the linked kits")
        },
    })

    const servers = serversQuery.data?.servers ?? []
    const tags = tagsQuery.data ?? []

    const updateKit = (key: string, patch: Partial<DraftKit>) => {
        setKits((current) => current.map((kit) => (kit.key === key ? { ...kit, ...patch } : kit)))
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Linked kit</CardTitle>
                <CardDescription>
                    Players see these items on the Link page. Add one kit for a server tag, such as 100x or 3x, or for a single server.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {kits.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        No linked kits yet. Add one to show kit items on the Link page.
                    </p>
                ) : null}

                {kits.map((kit, index) => (
                    <div key={kit.key} className="space-y-4 rounded-lg border p-4">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium">
                                {kit.label && kit.id ? kit.label : `Kit ${index + 1}`}
                            </p>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setKits((current) => current.filter((row) => row.key !== kit.key))}
                                aria-label="Remove kit"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2 text-sm">
                                <p className="font-medium">Applies to</p>
                                <Select
                                    value={kit.scope}
                                    onValueChange={(value) => updateKit(kit.key, { scope: value as KitScope })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Applies to" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="tag">Server tag</SelectItem>
                                        <SelectItem value="server">One server</SelectItem>
                                        <SelectItem value="site">All servers</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {kit.scope === "tag" ? (
                                <div className="space-y-2 text-sm">
                                    <p className="font-medium">Tag</p>
                                    <Select
                                        value={kit.tagId != null ? String(kit.tagId) : undefined}
                                        onValueChange={(value) => updateKit(kit.key, { tagId: Number(value) })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={tags.length ? "Select a tag" : "No tags yet"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {tags.map((tag) => (
                                                <SelectItem key={tag.id} value={String(tag.id)}>
                                                    {tag.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ) : kit.scope === "server" || kit.source === "plugin" ? (
                                <div className="space-y-2 text-sm">
                                    <p className="font-medium">
                                        {kit.scope === "site" ? "Read the kit from" : "Server"}
                                    </p>
                                    <Select
                                        value={kit.serverId || undefined}
                                        onValueChange={(value) => updateKit(kit.key, { serverId: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={servers.length ? "Select a server" : "No servers yet"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {servers.map((server) => (
                                                <SelectItem key={server.server_id} value={server.server_id}>
                                                    {server.server_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ) : null}

                            <div className="space-y-2 text-sm">
                                <p className="font-medium">Kit contents</p>
                                <Select
                                    value={kit.source}
                                    onValueChange={(value) => updateKit(kit.key, { source: value as KitSource })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="plugin">Read from the game server</SelectItem>
                                        <SelectItem value="manual">Enter items here</SelectItem>
                                    </SelectContent>
                                </Select>
                                {kit.scope === "tag" ? (
                                    <p className="text-xs text-muted-foreground">
                                        Every server with this tag can report this kit. The Link page shows it under the tag name.
                                    </p>
                                ) : null}
                            </div>
                        </div>

                        <label className="block space-y-2 text-sm">
                            <span className="font-medium">Kit name</span>
                            <Input
                                value={kit.kitName}
                                onChange={(event) => updateKit(kit.key, { kitName: event.target.value })}
                                placeholder="linked"
                            />
                        </label>

                        {kit.source === "plugin" && kit.syncedAt ? (
                            <p className="text-xs text-muted-foreground">
                                Last reported {new Date(kit.syncedAt).toLocaleString()} · {kit.items.length} items
                            </p>
                        ) : null}

                        {kit.source === "manual" ? (
                            <KitInventoryEditor
                                items={kit.items}
                                catalog={rustItemsQuery.data}
                                onChange={(items) => updateKit(kit.key, { items })}
                            />
                        ) : (
                            <div className="space-y-2">
                                <p className="text-xs text-muted-foreground">
                                    This kit is filled by the game server. Switch to entering items here to place them yourself.
                                </p>
                                <div className="max-w-[800px]">
                                    <KitInventory items={kit.items} catalog={rustItemsQuery.data} />
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={() => setKits((current) => [...current, emptyKit()])}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add kit
                    </Button>
                    <Button type="button" onClick={() => save.mutate()} disabled={save.isPending || kitQuery.isLoading}>
                        {save.isPending ? "Saving..." : "Save linked kits"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}

async function fetchJson<T>(path: string): Promise<T> {
    const token = getAuthToken()
    const headers: Record<string, string> = { Accept: "application/json" }
    if (token) headers.Authorization = `Bearer ${token}`
    const response = await fetch(backendApi(path), { credentials: "include", headers })
    if (!response.ok) throw new Error("Request failed")
    return response.json() as Promise<T>
}
