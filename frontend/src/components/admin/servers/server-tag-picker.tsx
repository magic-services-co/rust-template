"use client"

import { useQuery } from "@tanstack/react-query"
import { backendApi } from "@/lib/api"
import { getAuthToken } from "@/lib/laravel-auth"
import { Checkbox } from "@/components/ui/checkbox"
import type { ServerTag } from "@/hooks/use-server-data"

export const serverTagsQueryKey = ["server-tags"] as const

export async function fetchServerTags(): Promise<ServerTag[]> {
    const token = getAuthToken()
    const headers: Record<string, string> = { Accept: "application/json" }
    if (token) headers.Authorization = `Bearer ${token}`
    const response = await fetch(backendApi("admin/server-tags"), {
        credentials: "include",
        headers,
    })
    if (!response.ok) {
        throw new Error("Failed to load tags")
    }
    const json = await response.json()
    return Array.isArray(json?.tags) ? json.tags : []
}

export function ServerTagPicker({
    value,
    onChange,
}: {
    value: number[]
    onChange: (ids: number[]) => void
}) {
    const { data: tags = [], isLoading } = useQuery({
        queryKey: serverTagsQueryKey,
        queryFn: fetchServerTags,
    })

    const toggle = (id: number, checked: boolean) => {
        onChange(checked ? [...value, id] : value.filter((current) => current !== id))
    }

    return (
        <div className="space-y-2">
            <p className="text-sm font-medium">Tags</p>
            {isLoading ? (
                <p className="text-xs text-muted-foreground">Loading tags…</p>
            ) : tags.length === 0 ? (
                <p className="text-xs text-muted-foreground">No tags yet. Create one above, then assign it here.</p>
            ) : (
                <div className="flex flex-col gap-2">
                    {tags.map((tag) => (
                        <label key={tag.id} className="flex items-center gap-2 text-sm">
                            <Checkbox
                                checked={value.includes(tag.id)}
                                onCheckedChange={(checked) => toggle(tag.id, checked === true)}
                            />
                            {tag.image ? (
                                <img src={tag.image} alt="" className="h-4 w-6 rounded-sm object-cover" />
                            ) : null}
                            <span>{tag.name}</span>
                        </label>
                    ))}
                </div>
            )}
        </div>
    )
}
