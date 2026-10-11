"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { backendApi } from "@/lib/api"
import { getAuthToken } from "@/lib/laravel-auth"
import { siteSettingsQueryKey, useSiteSettings } from "@/hooks/use-site-settings"
import { fetchServerTags, serverTagsQueryKey } from "@/components/admin/servers/server-tag-picker"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { serverAlign, type ServerAlign } from "@/lib/server-display"
import { toast } from "sonner"

function authHeaders(json = false): Record<string, string> {
    const token = getAuthToken()
    const headers: Record<string, string> = { Accept: "application/json" }
    if (json) headers["Content-Type"] = "application/json"
    if (token) headers.Authorization = `Bearer ${token}`
    return headers
}

export function ServerTagsButton() {
    const queryClient = useQueryClient()
    const tagsQuery = useQuery({
        queryKey: serverTagsQueryKey,
        queryFn: fetchServerTags,
    })
    const [open, setOpen] = useState(false)
    const [name, setName] = useState("")
    const [imageUrl, setImageUrl] = useState("")
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [fileKey, setFileKey] = useState(0)

    const createTag = useMutation({
        mutationFn: async () => {
            const form = new FormData()
            form.append("name", name.trim())
            if (imageUrl.trim()) form.append("image", imageUrl.trim())
            if (imageFile) form.append("imageFile", imageFile)
            const response = await fetch(backendApi("admin/server-tags"), {
                method: "POST",
                credentials: "include",
                headers: authHeaders(),
                body: form,
            })
            if (!response.ok) {
                const body = await response.json().catch(() => ({}))
                throw new Error(body.error || body.message || "Could not create the tag")
            }
            return response.json()
        },
        onSuccess: () => {
            setName("")
            setImageUrl("")
            setImageFile(null)
            setFileKey((key) => key + 1)
            queryClient.invalidateQueries({ queryKey: serverTagsQueryKey })
            toast.success("Tag created")
        },
        onError: (error: Error) => toast.error(error.message),
    })

    const deleteTag = useMutation({
        mutationFn: async (id: number) => {
            const response = await fetch(backendApi(`admin/server-tags/${id}`), {
                method: "DELETE",
                credentials: "include",
                headers: authHeaders(),
            })
            if (!response.ok) throw new Error("Could not delete the tag")
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: serverTagsQueryKey })
            queryClient.invalidateQueries({ queryKey: ["categories"] })
            queryClient.invalidateQueries({ queryKey: ["servers"] })
            toast.success("Tag deleted")
        },
        onError: (error: Error) => toast.error(error.message),
    })

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>Tags</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Tags</DialogTitle>
                </DialogHeader>
                <form
                    className="space-y-2"
                    onSubmit={(event) => {
                        event.preventDefault()
                        if (!name.trim()) return
                        createTag.mutate()
                    }}
                >
                    <Input
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Tag name, such as Europe"
                    />
                    <Input
                        value={imageUrl}
                        onChange={(event) => setImageUrl(event.target.value)}
                        placeholder="Image URL (optional)"
                    />
                    <Input
                        key={fileKey}
                        type="file"
                        accept="image/png,image/jpeg,image/gif,image/webp"
                        onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
                    />
                    <Button type="submit" disabled={createTag.isPending || name.trim() === ""}>
                        {createTag.isPending ? "Adding…" : "Add Tag"}
                    </Button>
                </form>
                <ul className="max-h-64 space-y-2 overflow-y-auto">
                    {(tagsQuery.data ?? []).map((tag) => (
                        <li key={tag.id} className="flex items-center justify-between gap-3 rounded-md border border-border/10 px-3 py-2">
                            <span className="flex items-center gap-2 text-sm">
                                {tag.image ? (
                                    <img src={tag.image} alt="" className="h-5 w-7 rounded-sm object-cover" />
                                ) : (
                                    <span className="h-5 w-7 rounded-sm bg-muted" />
                                )}
                                {tag.name}
                            </span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={deleteTag.isPending}
                                onClick={() => deleteTag.mutate(tag.id)}
                            >
                                Delete
                            </Button>
                        </li>
                    ))}
                    {tagsQuery.data && tagsQuery.data.length === 0 ? (
                        <li className="text-xs text-muted-foreground">No tags yet. Add a flag or region logo and a name.</li>
                    ) : null}
                </ul>
            </DialogContent>
        </Dialog>
    )
}

export function ServerTagsSettings() {
    const queryClient = useQueryClient()
    const siteSettings = useSiteSettings()
    const useTags = siteSettings.data?.serversUseTags === true
    const align = serverAlign(siteSettings.data?.serversAlign)

    const saveMode = useMutation({
        mutationFn: async (next: boolean) => {
            const response = await fetch(backendApi("admin/site-settings"), {
                method: "PATCH",
                credentials: "include",
                headers: authHeaders(true),
                body: JSON.stringify({ serversUseTags: next }),
            })
            if (!response.ok) throw new Error("Could not save the server list option")
            return response.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: siteSettingsQueryKey })
            toast.success(useTags ? "Servers are grouped by category again" : "Servers now show in one list with tags")
        },
        onError: (error: Error) => toast.error(error.message),
    })

    const saveAlign = useMutation({
        mutationFn: async (next: ServerAlign) => {
            const response = await fetch(backendApi("admin/site-settings"), {
                method: "PATCH",
                credentials: "include",
                headers: authHeaders(true),
                body: JSON.stringify({ serversAlign: next }),
            })
            if (!response.ok) throw new Error("Could not save the server alignment")
            return response.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: siteSettingsQueryKey })
            toast.success("Server alignment saved")
        },
        onError: (error: Error) => toast.error(error.message),
    })

    return (
        <section className="rounded-md border border-border/15 p-4 space-y-4">
            <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                    <h2 className="text-sm font-semibold">Show servers with tags</h2>
                    <p className="text-xs text-muted-foreground max-w-xl">
                        The public server list becomes one list instead of category groups. Each server shows the tags you assign, with an image and a name. The first server is the highest BattleMetrics rank, and if ranks match, the one with the most players.
                    </p>
                </div>
                <Switch
                    checked={useTags}
                    disabled={siteSettings.isLoading || saveMode.isPending}
                    onCheckedChange={(checked) => saveMode.mutate(checked)}
                />
            </div>
            <div className="max-w-sm space-y-2">
                <p className="text-sm font-medium">Alignment</p>
                <p className="text-xs text-muted-foreground">
                    Left to right starts with the first server on the left. Center keeps the row in the middle. Right to left starts with the first server on the right.
                </p>
                <Select
                    value={align}
                    disabled={siteSettings.isLoading || saveAlign.isPending}
                    onValueChange={(value) => saveAlign.mutate(serverAlign(value))}
                >
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ltr">Left to right</SelectItem>
                        <SelectItem value="center">Center</SelectItem>
                        <SelectItem value="rtl">Right to left</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </section>
    )
}
