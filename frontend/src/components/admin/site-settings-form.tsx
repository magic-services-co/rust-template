"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"

import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { useSiteSettings } from "@/hooks/use-site-settings"
import type { SiteSettings } from "@/hooks/use-site-settings"
import { backendApi } from "@/lib/api"
import { PayNowApiKeySettings } from "@/components/admin/paynow-api-key-settings"
import { LinkedKitSettings } from "@/components/admin/linked-kit-settings"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Switch } from "../ui/switch"

const siteSettingsSchema = z.object({
    name: z.string().min(1, "Name is required"),
    storeId: z.string().min(1, "Store ID is required"),
    discordInvite: z.string().url("Must be a valid URL").optional().or(z.literal("")),
    steamGroupId: z.string().optional(),
    steamGroupUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
    copyServerAddress: z.boolean().optional(),
    showAdaptiveCurrencyOnStorefront: z.boolean().optional(),
    mapGridRetentionDays: z.number().int().min(1).nullable().optional(),
})

export type SiteSettingsFormValues = z.infer<typeof siteSettingsSchema>

function toFormValues(data: SiteSettings | null | undefined): SiteSettingsFormValues {
    return {
        name: data?.name ?? "",
        storeId: data?.storeId ?? "",
        discordInvite: data?.discordInvite ?? "",
        steamGroupId: data?.steamGroupId ?? "",
        steamGroupUrl: data?.steamGroupUrl ?? "",
        copyServerAddress: data?.copyServerAddress ?? false,
        showAdaptiveCurrencyOnStorefront: data?.showAdaptiveCurrencyOnStorefront ?? true,
        mapGridRetentionDays: data?.mapGridRetentionDays ?? null,
    }
}

export function SiteSettingsForm() {
    const { data: initialData, isLoading: isLoadingInitialData, isError, error } = useSiteSettings()
    const queryClient = useQueryClient()

    const form = useForm<SiteSettingsFormValues>({
        resolver: zodResolver(siteSettingsSchema),
        defaultValues: toFormValues(initialData),
    })

    useEffect(() => {
        if (initialData) {
            form.reset(toFormValues(initialData))
        }
    }, [initialData, form])

    const mutation = useMutation({
        mutationFn: async (data: SiteSettingsFormValues) => {
            const response = await fetch(backendApi("admin/site-settings"), {
                method: "PATCH",
                headers: { "Content-Type": "application/json", "Accept": "application/json" },
                body: JSON.stringify(data),
                credentials: "include",
            })
            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error("You are not authorized to update site settings.")
                }
                const body = await response.json().catch(() => ({}))
                const msg = body?.message ?? (body?.errors ? Object.values(body.errors).flat().join(" ") : null)
                throw new Error(msg ?? "Failed to update site settings")
            }
            return response.json()
        },
        onSuccess: () => {
            toast.success("Your site settings have been successfully updated.")
            queryClient.invalidateQueries({ queryKey: ["siteSettings"] })
        },
        onError: (error) => {
            toast.error(error.message || "Failed to update site settings. Please try again.")
        },
    })

    function onSubmit(data: SiteSettingsFormValues) {
        mutation.mutate(data)
    }

    if (isError && error) {
        return <FormError error={error} />
    }

    if (isLoadingInitialData) {
        return <div>Loading...</div>
    }

    return (
        <>
        <Card>
                <CardHeader>
                    <CardTitle>Basic Settings</CardTitle>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Site Name</FormLabel>
                                        <FormControl>
                                            <Input {...field} value={field.value ?? ""} />
                                        </FormControl>
                                        <FormDescription>
                                            The name of your site as it will appear to users.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="storeId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>PayNow Store ID</FormLabel>
                                        <FormControl>
                                            <Input {...field} value={field.value ?? ""} />
                                        </FormControl>
                                        <FormDescription>
                                            The ID of your store.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="discordInvite"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Discord Invite URL</FormLabel>
                                        <FormControl>
                                            <Input {...field} value={field.value ?? ""} />
                                        </FormControl>
                                        <FormDescription>
                                            The invite URL for your Discord server (optional).
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="steamGroupId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Steam Group ID</FormLabel>
                                        <FormControl>
                                            <Input {...field} value={field.value ?? ""} />
                                        </FormControl>
                                        <FormDescription>
                                            The ID of your Steam group (optional).
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="steamGroupUrl"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Steam Group URL</FormLabel>
                                        <FormControl>
                                            <Input {...field} value={field.value ?? ""} />
                                        </FormControl>
                                        <FormDescription>
                                            The URL of your Steam group (optional).
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="copyServerAddress"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-base">
                                                Enable Copy Server Address
                                            </FormLabel>
                                            <FormDescription>
                                                Enable copy server address to clipboard on the server page instead of just connect button.
                                            </FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="showAdaptiveCurrencyOnStorefront"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-base">
                                                Show Adaptive Currency on storefront
                                            </FormLabel>
                                            <FormDescription>
                                                When enabled, customers see prices in their local currency (USD, GBP, or EUR) based on their location. PayNow handles conversion and FX risk. You can opt out anytime in PayNow: Store → Settings → Payment Settings → Adaptive Currency.
                                            </FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value ?? true}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" disabled={mutation.isPending}>
                                {mutation.isPending ? "Updating..." : "Update Settings"}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
            <PayNowApiKeySettings />
            <LinkedKitSettings />
        </>
    )
}

function FormError({ error }: { error: Error }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Basic Settings</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-destructive">{error.message}</p>
            </CardContent>
        </Card>
    )
}