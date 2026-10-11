"use client"

import { backendApi } from "@/lib/api"
import { getAuthToken } from "@/lib/laravel-auth"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { AlertTriangle, Loader2 } from "lucide-react"
import Link from "next/link"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

type PaynowKeyConfig = {
    isPayNowApiKeyInDatabase?: boolean
    paynowApiKeySource?: "database" | "environment" | "none"
    paynowKeyHealth?: "ok" | "missing" | "missing_website_role" | string
    paynowKeyMessage?: string | null
}

export function PayNowApiKeySettings() {
    const queryClient = useQueryClient()
    const [apiKeyInput, setApiKeyInput] = useState("")

    const { data: config, isLoading } = useQuery({
        queryKey: ["paynowApiKeyConfig"],
        queryFn: async () => {
            const token = getAuthToken()
            const headers: Record<string, string> = { Accept: "application/json" }
            if (token) headers["Authorization"] = `Bearer ${token}`
            const response = await fetch(backendApi("admin/site-settings/paynow-api-key"), {
                credentials: "include",
                headers,
            })
            if (!response.ok) throw new Error("Failed to load PayNow API key status")
            return response.json() as Promise<PaynowKeyConfig>
        },
    })

    const mutation = useMutation({
        mutationFn: async (apiKey: string) => {
            const token = getAuthToken()
            const headers: Record<string, string> = {
                "Content-Type": "application/json",
                Accept: "application/json",
            }
            if (token) headers["Authorization"] = `Bearer ${token}`
            const response = await fetch(backendApi("admin/site-settings/paynow-api-key"), {
                method: "PATCH",
                credentials: "include",
                headers,
                body: JSON.stringify({ apiKey }),
            })
            if (!response.ok) {
                const err = await response.json().catch(() => null)
                throw new Error(
                    (err && typeof err === "object" && "message" in err && typeof err.message === "string"
                        ? err.message
                        : null) || "Failed to save PayNow API key"
                )
            }
            return response.json() as Promise<PaynowKeyConfig>
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["paynowApiKeyConfig"] })
            setApiKeyInput("")
            toast.success("PayNow API key saved")
        },
        onError: (e: Error) => {
            toast.error(e.message)
        },
    })

    const inDatabase = config?.isPayNowApiKeyInDatabase === true
    const source = config?.paynowApiKeySource
    const health = config?.paynowKeyHealth

    const statusBadge =
        isLoading ? (
            <Badge variant="secondary">Loading…</Badge>
        ) : health === "missing_website_role" ? (
            <Badge variant="destructive">Missing Website role</Badge>
        ) : health === "missing" || source === "none" ? (
            <Badge variant="destructive">Key missing</Badge>
        ) : source === "database" ? (
            <Badge>Key in site settings</Badge>
        ) : source === "environment" ? (
            <Badge variant="secondary">Using server PAYNOW_KEY</Badge>
        ) : (
            <Badge variant="destructive">Not configured</Badge>
        )

    return (
        <Card className="mt-6">
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0">
                <div className="space-y-1.5">
                    <CardTitle className="text-lg">PayNow API key</CardTitle>
                    <CardDescription>
                        Used for store, cart, and customer lookups. Create a key in the PayNow dashboard with the Website role.{" "}
                        <Link
                            href="https://dashboard.paynow.gg/api-keys"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline-offset-4 hover:underline"
                        >
                            API keys
                        </Link>
                    </CardDescription>
                </div>
                {statusBadge}
            </CardHeader>
            <CardContent className="space-y-4">
                {(health === "missing" || health === "missing_website_role") && config?.paynowKeyMessage ? (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>{health === "missing" ? "PayNow API key is missing" : "PayNow API key lacks the Website role"}</AlertTitle>
                        <AlertDescription>{config.paynowKeyMessage}</AlertDescription>
                    </Alert>
                ) : null}
                <div className="space-y-2">
                    <Label htmlFor="paynow-api-key">API key</Label>
                    <Input
                        id="paynow-api-key"
                        type="password"
                        autoComplete="off"
                        placeholder={
                            inDatabase
                                ? "Paste a new key to replace the current one"
                                : "Paste your PayNow API key"
                        }
                        value={apiKeyInput}
                        onChange={(e) => setApiKeyInput(e.target.value)}
                        disabled={mutation.isPending}
                    />
                    <p className="text-sm text-muted-foreground">
                        Stored encrypted in the database and not shown again after saving. Leave empty and save to remove the stored key
                        (the server <code className="text-xs">PAYNOW_KEY</code> env value is used if set).
                    </p>
                </div>
                <Button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate(apiKeyInput)}>
                    {mutation.isPending ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving…
                        </>
                    ) : (
                        "Save"
                    )}
                </Button>
            </CardContent>
        </Card>
    )
}
