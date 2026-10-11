"use client"

import { backendApi } from "@/lib/api"
import { getAuthToken } from "@/lib/laravel-auth"
import { defaultCookieBannerCopy, type CookieBannerCopy } from "@/hooks/use-cookie-consent"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

const CATEGORY_KEYS = ["necessary", "analytics", "marketing", "preferences"] as const

function authHeaders(): Record<string, string> {
    const token = getAuthToken()
    const headers: Record<string, string> = { Accept: "application/json" }
    if (token) headers.Authorization = `Bearer ${token}`
    return headers
}

export function CookieBannerEditor() {
    const queryClient = useQueryClient()
    const [copy, setCopy] = useState<CookieBannerCopy>(defaultCookieBannerCopy)

    const { data, isLoading } = useQuery({
        queryKey: ["cookie-banner-copy"],
        queryFn: async () => {
            const response = await fetch(backendApi("admin/cookie-consent/copy"), {
                credentials: "include",
                headers: authHeaders(),
            })
            if (!response.ok) throw new Error("Failed to load cookie banner copy")
            const body = (await response.json()) as { copy?: CookieBannerCopy }
            return body.copy ?? defaultCookieBannerCopy
        },
    })

    useEffect(() => {
        if (data) setCopy(data)
    }, [data])

    const mutation = useMutation({
        mutationFn: async () => {
            const response = await fetch(backendApi("admin/cookie-consent/copy"), {
                method: "PUT",
                credentials: "include",
                headers: { ...authHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify(copy),
            })
            if (!response.ok) {
                const err = await response.json().catch(() => null)
                throw new Error(err?.message || "Failed to save cookie banner")
            }
            return (await response.json()) as { copy: CookieBannerCopy }
        },
        onSuccess: (saved) => {
            queryClient.setQueryData(["cookie-banner-copy"], saved.copy)
            toast.success("Cookie banner updated")
        },
        onError: (error: Error) => toast.error(error.message),
    })

    const setField = (key: keyof CookieBannerCopy, value: string) => {
        setCopy((current) => ({ ...current, [key]: value }))
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Banner text</CardTitle>
                <CardDescription>
                    Shown on the cookie banner, the preferences dialog, and the footer link. Use {"{site}"} in the message for the site name.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
                <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Kicker" value={copy.kicker} onChange={(value) => setField("kicker", value)} />
                    <Field label="Footer link" value={copy.footerLabel} onChange={(value) => setField("footerLabel", value)} />
                    <Field label="Title" value={copy.title} onChange={(value) => setField("title", value)} />
                    <Field label="Title accent" value={copy.titleAccent} onChange={(value) => setField("titleAccent", value)} />
                    <div className="md:col-span-2">
                        <Label htmlFor="cookie-message">Message</Label>
                        <Textarea id="cookie-message" className="mt-2" value={copy.message} onChange={(event) => setField("message", event.target.value)} />
                    </div>
                    <Field label="Privacy link" value={copy.privacyLabel} onChange={(value) => setField("privacyLabel", value)} />
                    <Field label="Customize button" value={copy.customizeLabel} onChange={(value) => setField("customizeLabel", value)} />
                    <Field label="Reject button" value={copy.rejectLabel} onChange={(value) => setField("rejectLabel", value)} />
                    <Field label="Accept button" value={copy.acceptLabel} onChange={(value) => setField("acceptLabel", value)} />
                    <Field label="Dialog kicker" value={copy.dialogKicker} onChange={(value) => setField("dialogKicker", value)} />
                    <Field label="Dialog title" value={copy.dialogTitle} onChange={(value) => setField("dialogTitle", value)} />
                    <Field label="Dialog accent" value={copy.dialogTitleAccent} onChange={(value) => setField("dialogTitleAccent", value)} />
                    <Field label="Cancel button" value={copy.cancelLabel} onChange={(value) => setField("cancelLabel", value)} />
                    <Field label="Save button" value={copy.saveLabel} onChange={(value) => setField("saveLabel", value)} />
                    <div className="md:col-span-2">
                        <Label htmlFor="cookie-dialog-message">Dialog message</Label>
                        <Textarea id="cookie-dialog-message" className="mt-2" value={copy.dialogMessage} onChange={(event) => setField("dialogMessage", event.target.value)} />
                    </div>
                </div>
                <div className="space-y-4">
                    {CATEGORY_KEYS.map((key) => (
                        <div key={key} className="grid gap-3 border p-3 md:grid-cols-3">
                            <Field
                                label={`${copy.categories[key].title} kicker`}
                                value={copy.categories[key].kicker}
                                onChange={(value) =>
                                    setCopy((current) => ({
                                        ...current,
                                        categories: { ...current.categories, [key]: { ...current.categories[key], kicker: value } },
                                    }))
                                }
                            />
                            <Field
                                label="Title"
                                value={copy.categories[key].title}
                                onChange={(value) =>
                                    setCopy((current) => ({
                                        ...current,
                                        categories: { ...current.categories, [key]: { ...current.categories[key], title: value } },
                                    }))
                                }
                            />
                            <div className="md:col-span-3">
                                <Label>Description</Label>
                                <Textarea
                                    className="mt-2"
                                    value={copy.categories[key].description}
                                    onChange={(event) =>
                                        setCopy((current) => ({
                                            ...current,
                                            categories: {
                                                ...current.categories,
                                                [key]: { ...current.categories[key], description: event.target.value },
                                            },
                                        }))
                                    }
                                />
                            </div>
                        </div>
                    ))}
                </div>
                <Button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
                    {mutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                    Save banner
                </Button>
            </CardContent>
        </Card>
    )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
    const id = label.toLowerCase().replace(/\s+/g, "-")
    return (
        <div className="space-y-2">
            <Label htmlFor={id}>{label}</Label>
            <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} />
        </div>
    )
}
