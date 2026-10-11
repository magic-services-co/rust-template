"use client"

import { backendApi } from "@/lib/api"
import { getAuthToken } from "@/lib/laravel-auth"
import { lootyItemImageUrl } from "@/lib/looty-item-image"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Loader2, Plus, Trash2 } from "lucide-react"

type KitItem = { shortname: string; amount: number }
type KitSource = "plugin" | "manual"
type KitConfig = {
    serverId?: string | null
    kitName?: string
    source?: KitSource
    items?: KitItem[]
    syncedAt?: string | null
}
type ServerOption = { server_id: string; server_name: string }

function authHeaders(): Record<string, string> {
    const token = getAuthToken()
    const headers: Record<string, string> = { Accept: "application/json" }
    if (token) headers.Authorization = `Bearer ${token}`
    return headers
}

export function LinkedKitSettings() {
    const queryClient = useQueryClient()
    const [source, setSource] = useState<KitSource>("plugin")
    const [serverId, setServerId] = useState("")
    const [kitName, setKitName] = useState("linked")
    const [items, setItems] = useState<KitItem[]>([])

    const { data, isLoading } = useQuery({
        queryKey: ["admin-link-kit"],
        queryFn: async () => {
            const response = await fetch(backendApi("admin/link/kit"), { credentials: "include", headers: authHeaders() })
            if (!response.ok) throw new Error("Failed to load linked kit")
            return (await response.json()) as KitConfig
        },
    })

    const serversQuery = useQuery({
        queryKey: ["admin-link-kit-servers"],
        queryFn: async () => {
            const response = await fetch(backendApi("servers"), { headers: { Accept: "application/json" } })
            if (!response.ok) return [] as ServerOption[]
            const body = (await response.json()) as { data?: { servers?: ServerOption[] }[] }
            const options: ServerOption[] = []
            for (const category of body.data ?? []) {
                for (const server of category.servers ?? []) {
                    if (server.server_id) options.push(server)
                }
            }
            return options
        },
    })

    useEffect(() => {
        if (!data) return
        setSource(data.source === "manual" ? "manual" : "plugin")
        setServerId(data.serverId ?? "")
        setKitName(data.kitName || "linked")
        setItems(data.items ?? [])
    }, [data])

    const mutation = useMutation({
        mutationFn: async () => {
            const response = await fetch(backendApi("admin/link/kit"), {
                method: "PUT",
                credentials: "include",
                headers: { ...authHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify({
                    source,
                    serverId: serverId || null,
                    kitName: kitName.trim() || "linked",
                    items: source === "manual" ? items.filter((item) => item.shortname.trim() && item.amount > 0) : undefined,
                }),
            })
            if (!response.ok) {
                const err = await response.json().catch(() => null)
                throw new Error(err?.message || "Failed to save linked kit")
            }
            return (await response.json()) as KitConfig
        },
        onSuccess: (saved) => {
            queryClient.setQueryData(["admin-link-kit"], saved)
            void queryClient.invalidateQueries({ queryKey: ["link-kit"] })
            toast.success("Linked kit saved")
        },
        onError: (error: Error) => toast.error(error.message),
    })

    return (
        <Card className="mt-6">
            <CardHeader>
                <CardTitle className="text-lg">Linked kit</CardTitle>
                <CardDescription>
                    Shown on the Link page. MagicCore Harmony reads this kit from the server&apos;s Kits data file, or you can list the items here.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
                <div className="flex flex-wrap gap-4 text-sm">
                    <label className="flex items-center gap-2">
                        <input type="radio" name="linked-kit-source" checked={source === "plugin"} onChange={() => setSource("plugin")} />
                        From the game server
                    </label>
                    <label className="flex items-center gap-2">
                        <input type="radio" name="linked-kit-source" checked={source === "manual"} onChange={() => setSource("manual")} />
                        Edit items
                    </label>
                </div>
                {source === "plugin" ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="linked-kit-server">Server</Label>
                            <select
                                id="linked-kit-server"
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                                value={serverId}
                                onChange={(event) => setServerId(event.target.value)}
                            >
                                <option value="">Select a server</option>
                                {(serversQuery.data ?? []).map((server) => (
                                    <option key={server.server_id} value={server.server_id}>
                                        {server.server_name || server.server_id}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="linked-kit-name">Kit name</Label>
                            <Input id="linked-kit-name" value={kitName} onChange={(event) => setKitName(event.target.value)} placeholder="linked" />
                        </div>
                        <p className="text-sm text-muted-foreground sm:col-span-2">
                            The Harmony mod on that server checks <code className="text-xs">oxide/data/Kits/kits_data.json</code> (or the Carbon copy) about every 5 minutes.
                            {data?.syncedAt ? ` Last report: ${new Date(data.syncedAt).toLocaleString()}.` : " Nothing has been reported yet."}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {items.map((item, index) => (
                            <div key={index} className="flex items-center gap-2">
                                {item.shortname.trim() ? (
                                    <img src={lootyItemImageUrl(item.shortname)} alt="" className="size-8 object-contain" />
                                ) : (
                                    <span className="size-8" />
                                )}
                                <Input
                                    value={item.shortname}
                                    placeholder="rifle.ak"
                                    onChange={(event) => {
                                        const next = [...items]
                                        next[index] = { ...item, shortname: event.target.value }
                                        setItems(next)
                                    }}
                                />
                                <Input
                                    type="number"
                                    min={1}
                                    className="w-28"
                                    value={item.amount}
                                    onChange={(event) => {
                                        const next = [...items]
                                        next[index] = { ...item, amount: Number(event.target.value) || 1 }
                                        setItems(next)
                                    }}
                                />
                                <Button type="button" variant="ghost" size="icon" onClick={() => setItems(items.filter((_, i) => i !== index))}>
                                    <Trash2 className="size-4" />
                                </Button>
                            </div>
                        ))}
                        <Button type="button" variant="outline" onClick={() => setItems([...items, { shortname: "", amount: 1 }])}>
                            <Plus className="mr-2 size-4" />
                            Add item
                        </Button>
                    </div>
                )}
                {source === "plugin" && (data?.items?.length ?? 0) > 0 ? (
                    <p className="text-sm text-muted-foreground">{data?.items?.length} items currently on the Link page.</p>
                ) : null}
                <Button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
                    {mutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                    Save
                </Button>
            </CardContent>
        </Card>
    )
}
