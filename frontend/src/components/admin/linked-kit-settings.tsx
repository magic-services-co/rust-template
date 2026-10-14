"use client"

import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { backendApi } from "@/lib/api"

type KitSource = "plugin" | "manual"
type KitScope = "site" | "server" | "tag"

type KitItem = {
    shortname: string
    amount: number
}

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

type TagOption = {
    id: number
    name: string
}

const selectClass =
    "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"

function emptyKit(): DraftKit {
    return {
        key: `new-${crypto.randomUUID()}`,
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
        queryFn: () => backendApi.get("admin/link/kit").json<{ kits?: LinkedKit[] }>(),
    })

    const serversQuery = useQuery({
        queryKey: ["linked-kit-servers"],
        queryFn: () =>
            backendApi.get("servers").json<{
                data?: { servers?: ServerOption[] }[]
            }>(),
    })

    const tagsQuery = useQuery({
        queryKey: ["linked-kit-tags"],
        queryFn: () => backendApi.get("admin/server-tags").json<{ tags?: TagOption[] }>(),
    })

    useEffect(() => {
        const rows = kitQuery.data?.kits
        if (!rows) return
        setKits(
            rows.map((kit) => ({
                ...kit,
                key: String(kit.id ?? crypto.randomUUID()),
                serverId: kit.serverId ?? "",
                items: kit.items ?? [],
            })),
        )
    }, [kitQuery.data])

    const save = useMutation({
        mutationFn: () =>
            backendApi
                .put("admin/link/kit", {
                    json: {
                        kits: kits.map((kit) => ({
                            id: kit.id,
                            scope: kit.scope,
                            serverId: kit.serverId || null,
                            tagId: kit.scope === "tag" ? kit.tagId : null,
                            kitName: kit.kitName.trim() || "linked",
                            source: kit.source,
                            items: kit.source === "manual" ? kit.items : [],
                        })),
                    },
                })
                .json<{ kits?: LinkedKit[] }>(),
        onSuccess: async () => {
            toast.success("Linked kits saved")
            await queryClient.invalidateQueries({ queryKey: ["admin-linked-kit"] })
            await queryClient.invalidateQueries({ queryKey: ["link-kit"] })
        },
        onError: async (error) => {
            const message = await errorMessage(error)
            toast.error(message ?? "Could not save the linked kits")
        },
    })

    const servers =
        serversQuery.data?.data?.flatMap((category) => category.servers ?? []) ?? []
    const tags = tagsQuery.data?.tags ?? []

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
                            <label className="space-y-2 text-sm">
                                <span className="font-medium">Applies to</span>
                                <select
                                    className={selectClass}
                                    value={kit.scope}
                                    onChange={(event) =>
                                        updateKit(kit.key, { scope: event.target.value as KitScope })
                                    }
                                >
                                    <option value="tag">Server tag</option>
                                    <option value="server">One server</option>
                                    <option value="site">All servers</option>
                                </select>
                            </label>

                            {kit.scope === "tag" ? (
                                <label className="space-y-2 text-sm">
                                    <span className="font-medium">Tag</span>
                                    <select
                                        className={selectClass}
                                        value={kit.tagId ?? ""}
                                        onChange={(event) =>
                                            updateKit(kit.key, {
                                                tagId: event.target.value ? Number(event.target.value) : null,
                                            })
                                        }
                                    >
                                        <option value="">Select a tag</option>
                                        {tags.map((tag) => (
                                            <option key={tag.id} value={tag.id}>
                                                {tag.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            ) : kit.scope === "server" || kit.source === "plugin" ? (
                                <label className="space-y-2 text-sm">
                                    <span className="font-medium">
                                        {kit.scope === "site" ? "Read the kit from" : "Server"}
                                    </span>
                                    <select
                                        className={selectClass}
                                        value={kit.serverId ?? ""}
                                        onChange={(event) => updateKit(kit.key, { serverId: event.target.value })}
                                    >
                                        <option value="">Select a server</option>
                                        {servers.map((server) => (
                                            <option key={server.server_id} value={server.server_id}>
                                                {server.server_name}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            ) : null}
                        </div>

                        <div className="space-y-2">
                            <p className="text-sm font-medium">Kit contents</p>
                            <div className="flex flex-wrap gap-4 text-sm">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        checked={kit.source === "plugin"}
                                        onChange={() => updateKit(kit.key, { source: "plugin" })}
                                    />
                                    Read from the game server
                                </label>
                                <label className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        checked={kit.source === "manual"}
                                        onChange={() => updateKit(kit.key, { source: "manual" })}
                                    />
                                    Enter items here
                                </label>
                            </div>
                            {kit.scope === "tag" ? (
                                <p className="text-xs text-muted-foreground">
                                    Every server with this tag can report this kit. The Link page shows it under the tag name.
                                </p>
                            ) : null}
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
                            <div className="space-y-2">
                                {kit.items.map((item, itemIndex) => (
                                    <div key={`${kit.key}-${itemIndex}`} className="flex gap-2">
                                        <Input
                                            value={item.shortname}
                                            placeholder="shortname"
                                            onChange={(event) => {
                                                const items = kit.items.slice()
                                                items[itemIndex] = { ...item, shortname: event.target.value }
                                                updateKit(kit.key, { items })
                                            }}
                                        />
                                        <Input
                                            type="number"
                                            min={1}
                                            className="w-28"
                                            value={item.amount}
                                            onChange={(event) => {
                                                const items = kit.items.slice()
                                                items[itemIndex] = {
                                                    ...item,
                                                    amount: Number(event.target.value) || 1,
                                                }
                                                updateKit(kit.key, { items })
                                            }}
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={() =>
                                                updateKit(kit.key, {
                                                    items: kit.items.filter((_, current) => current !== itemIndex),
                                                })
                                            }
                                        >
                                            Remove
                                        </Button>
                                    </div>
                                ))}
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() =>
                                        updateKit(kit.key, {
                                            items: [...kit.items, { shortname: "", amount: 1 }],
                                        })
                                    }
                                >
                                    Add item
                                </Button>
                            </div>
                        ) : null}
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

async function errorMessage(error: unknown): Promise<string | null> {
    if (!error || typeof error !== "object" || !("response" in error)) return null
    const response = (error as { response?: { json?: () => Promise<{ message?: string }> } }).response
    if (!response?.json) return null
    try {
        const body = await response.json()
        return body.message ?? null
    } catch {
        return null
    }
}
