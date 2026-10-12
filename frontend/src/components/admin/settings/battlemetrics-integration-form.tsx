'use client'

import { backendApi } from "@/lib/api"
import { getAuthToken } from "@/lib/laravel-auth"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"

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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Info, RefreshCw } from "lucide-react"

const battlemetricsIntegrationSchema = z.object({
    apiKey: z.string().optional(),
    orgId: z.string().optional(),
    enabled: z.boolean().default(false),
}).refine((data) => {
    if (data.enabled) {
        return data.apiKey && data.apiKey.length > 0 && data.orgId && data.orgId.length > 0;
    }
    return true;
}, {
    message: "API Key and Organization ID are required when enabled",
    path: ["enabled"],
})

type BattleMetricsIntegrationFormValues = z.output<typeof battlemetricsIntegrationSchema>

export function BattleMetricsIntegrationForm() {
    const queryClient = useQueryClient()
    const [isSyncing, setIsSyncing] = useState(false)
    const [syncResult, setSyncResult] = useState<{ synced: number; skipped: number; errors: number } | null>(null)
    const [isTestingApiKey, setIsTestingApiKey] = useState(false)
    const [apiKeyTestResult, setApiKeyTestResult] = useState<{ valid: boolean; message: string } | null>(null)
    const [apiKeyValue, setApiKeyValue] = useState<string>("")

    const { data: initialData, isLoading: isLoadingInitialData, isError, error } = useQuery({
        queryKey: ["battlemetricsIntegration"],
        queryFn: async () => {
            const token = getAuthToken();
            const headers: Record<string, string> = { Accept: 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const response = await fetch(backendApi('admin/settings/battlemetrics'), { credentials: 'include', headers });
            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error("You are not authorized to view BattleMetrics integration settings.")
                }
                throw new Error("Failed to load BattleMetrics integration settings")
            }
            return response.json()
        },
    })

    const form = useForm<z.input<typeof battlemetricsIntegrationSchema>, any, BattleMetricsIntegrationFormValues>({
        resolver: zodResolver(battlemetricsIntegrationSchema),
        defaultValues: {
            apiKey: "",
            orgId: "",
            enabled: false,
        },
    })

    useEffect(() => {
        if (initialData) {
            const currentApiKey = form.getValues('apiKey');
            form.reset({
                apiKey: currentApiKey && currentApiKey.length > 0 ? currentApiKey : (initialData.apiKey || ""),
                orgId: initialData.orgId || "",
                enabled: initialData.enabled ?? false,
            })
        }
    }, [initialData, form])

    const mutation = useMutation({
        mutationFn: async (data: BattleMetricsIntegrationFormValues) => {
            const currentApiKey = form.getValues('apiKey') || apiKeyValue || '';
            const currentOrgId = form.getValues('orgId') || '';
            const currentEnabled = form.getValues('enabled') || false;
            
            const finalApiKey = currentApiKey.trim() || apiKeyValue.trim() || '';
            
            const payload = {
                enabled: currentEnabled,
                orgId: currentOrgId || data.orgId || null,
                apiKey: finalApiKey || null
            };

            const token = getAuthToken();
            const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const response = await fetch(backendApi('admin/settings/battlemetrics'), {
                method: 'PUT',
                credentials: 'include',
                headers,
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null)
                if (response.status === 401) {
                    throw new Error("You are not authorized to update BattleMetrics integration settings.")
                }
                throw new Error(errorData?.error || "Failed to update BattleMetrics integration settings")
            }

            return response.json()
        },
        onSuccess: () => {
            toast.success("BattleMetrics integration settings have been successfully updated.")
            queryClient.invalidateQueries({ queryKey: ["battlemetricsIntegration"] })
        },
        onError: (error) => {
            toast.error(error.message || "Failed to update BattleMetrics integration settings. Please try again.")
        },
    })

    function onSubmit(data: BattleMetricsIntegrationFormValues) {
        const currentApiKey = form.getValues('apiKey');
        
        if (currentApiKey && currentApiKey.trim().length > 0) {
            data.apiKey = currentApiKey.trim();
        } else if (!data.apiKey && initialData?.apiKey) {
            data.apiKey = initialData.apiKey;
        }
        
        mutation.mutate(data)
    }

    const syncMutation = useMutation({
        mutationFn: async () => {
            const token = getAuthToken();
            const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const response = await fetch(backendApi('admin/settings/battlemetrics/sync'), {
                method: 'POST',
                credentials: 'include',
                headers,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null)
                throw new Error(errorData?.error || "Failed to sync bans from BattleMetrics")
            }

            return response.json()
        },
        onSuccess: (data) => {
            toast.success(data.message || "Bans synced successfully from BattleMetrics")
            setSyncResult({
                synced: data.synced || 0,
                skipped: data.skipped || 0,
                errors: data.errors || 0
            })
        },
        onError: (error) => {
            toast.error(error.message || "Failed to sync bans from BattleMetrics")
            setSyncResult(null)
        },
    })

    function handleSync() {
        setIsSyncing(true)
        setSyncResult(null)
        syncMutation.mutate(undefined, {
            onSettled: () => {
                setIsSyncing(false)
            }
        })
    }

    const testApiKeyMutation = useMutation({
        mutationFn: async (data?: { apiKey: string; orgId?: string }) => {
            const token = getAuthToken();
            const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const response = await fetch(backendApi('admin/settings/battlemetrics/test'), {
                method: 'POST',
                credentials: 'include',
                headers,
                body: JSON.stringify(data || {}),
            });

            if (!response.ok) {
                throw new Error("Failed to test API key")
            }

            return response.json()
        },
        onSuccess: (data) => {
            if (data.valid) {
                const orgName = data.organization?.name ? ` (${data.organization.name})` : ''
                toast.success(`API key is valid!${orgName}`)
                setApiKeyTestResult({ 
                    valid: true, 
                    message: `Valid${data.organization ? ` - Organization: ${data.organization.name}` : ' - Authentication successful'}` 
                })
            } else {
                toast.error(data.error || "API key is invalid")
                setApiKeyTestResult({ valid: false, message: data.error || "Invalid API key" })
            }
        },
        onError: (error) => {
            toast.error(error.message || "Failed to test API key")
            setApiKeyTestResult({ valid: false, message: error.message || "Test failed" })
        },
    })

    function handleTestApiKey() {
        const currentApiKey = form.getValues('apiKey')
        const currentOrgId = form.getValues('orgId')
        setIsTestingApiKey(true)
        setApiKeyTestResult(null)
        testApiKeyMutation.mutate(
            currentApiKey ? { apiKey: currentApiKey, orgId: currentOrgId || undefined } : undefined,
            {
                onSettled: () => {
                    setIsTestingApiKey(false)
                }
            }
        )
    }

    if (isLoadingInitialData) {
        return <BattleMetricsIntegrationFormSkeleton />
    }

    if (isError) {
        return <BattleMetricsIntegrationFormError error={error} />
    }

    const isEnabled = form.watch("enabled")

    return (
        <Card>
            <CardHeader>
                <CardTitle>BattleMetrics Integration Settings</CardTitle>
                <CardDescription>
                    Configure your BattleMetrics API credentials to enable automatic ban synchronization.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <Alert>
                            <Info className="h-4 w-4" />
                            <AlertDescription>
                                To get your API key and Organization ID, visit{" "}
                                <a
                                    href="https://www.battlemetrics.com/developers"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary underline hover:no-underline"
                                >
                                    BattleMetrics Developers
                                </a>
                                {" "}and create an API token with the <strong>ban:read</strong> and <strong>ban:create</strong> scopes. Your Organization ID can be found in your BattleMetrics organization settings.
                            </AlertDescription>
                        </Alert>

                        <FormField
                            control={form.control}
                            name="enabled"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border/15 p-4">
                                    <div className="space-y-0.5">
                                        <FormLabel>Enable BattleMetrics Integration</FormLabel>
                                        <FormDescription>
                                            When enabled, bans created in this system will automatically be synced to BattleMetrics.
                                        </FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        {isEnabled && (
                            <>
                                <FormField
                                    control={form.control}
                                    name="apiKey"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>BattleMetrics API Key</FormLabel>
                                            <div className="flex gap-2">
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        type="password"
                                                        placeholder="Enter your BattleMetrics API key"
                                                        className="flex-1"
                                                        onChange={(e) => {
                                                            const value = e.target.value;
                                                            field.onChange(e);
                                                            setApiKeyValue(value);
                                                            if (apiKeyTestResult) {
                                                                setApiKeyTestResult(null);
                                                            }
                                                        }}
                                                    />
                                                </FormControl>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={handleTestApiKey}
                                                    disabled={testApiKeyMutation.isPending || isTestingApiKey || !field.value}
                                                >
                                                    {testApiKeyMutation.isPending || isTestingApiKey ? "Testing..." : "Test"}
                                                </Button>
                                            </div>
                                            <FormDescription>
                                                Your BattleMetrics API token. Keep this secure and never share it publicly. Click &quot;Test&quot; to verify your API key. <strong>Important:</strong> After entering a new API key, make sure to click &quot;Update BattleMetrics Settings&quot; to save it.
                                            </FormDescription>
                                            {apiKeyTestResult && (
                                                <Alert variant={apiKeyTestResult.valid ? "default" : "destructive"}>
                                                    <Info className="h-4 w-4" />
                                                    <AlertDescription>{apiKeyTestResult.message}</AlertDescription>
                                                </Alert>
                                            )}
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="orgId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Organization ID</FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    placeholder="Enter your BattleMetrics Organization ID"
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                Your BattleMetrics Organization ID where bans will be created.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </>
                        )}

                        <div className="flex gap-4">
                            <Button type="submit" disabled={mutation.isPending}>
                                {mutation.isPending ? "Updating..." : "Update BattleMetrics Settings"}
                            </Button>
                        </div>
                        {syncResult && (
                            <Alert>
                                <Info className="h-4 w-4" />
                                <AlertDescription>
                                    Sync completed: {syncResult.synced} bans synced, {syncResult.skipped} skipped, {syncResult.errors} errors
                                </AlertDescription>
                            </Alert>
                        )}
                    </form>
                </Form>
            </CardContent>
        </Card>
    )
}

function BattleMetricsIntegrationFormSkeleton() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>BattleMetrics Integration Settings</CardTitle>
                <CardDescription>
                    Configure your BattleMetrics API credentials to enable automatic ban synchronization.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {[...Array(3)].map((_, index) => (
                    <div key={index} className="space-y-2">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                    </div>
                ))}
                <Skeleton className="h-10 w-1/4" />
            </CardContent>
        </Card>
    )
}

function BattleMetricsIntegrationFormError({ error }: { error: Error }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>BattleMetrics Integration Settings</CardTitle>
            </CardHeader>
            <CardContent>
                <Alert variant="destructive">
                    <AlertDescription>{error.message}</AlertDescription>
                </Alert>
            </CardContent>
        </Card>
    )
}
