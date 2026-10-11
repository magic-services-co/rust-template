"use client"

import { backendApi } from "@/lib/api"
import { getAuthToken } from "@/lib/laravel-auth"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { AlertTriangle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

type PaynowKeyConfig = {
    paynowKeyHealth?: "ok" | "missing" | "missing_website_role" | string
    paynowKeyMessage?: string | null
}

export function PayNowKeyWarning() {
    const { data } = useQuery({
        queryKey: ["paynowApiKeyConfig"],
        queryFn: async () => {
            const token = getAuthToken()
            const headers: Record<string, string> = { Accept: "application/json" }
            if (token) headers["Authorization"] = `Bearer ${token}`
            const response = await fetch(backendApi("admin/site-settings/paynow-api-key"), {
                credentials: "include",
                headers,
            })
            if (!response.ok) return null
            return response.json() as Promise<PaynowKeyConfig>
        },
        staleTime: 60_000,
    })

    const health = data?.paynowKeyHealth
    if (health !== "missing" && health !== "missing_website_role") return null

    const message =
        data?.paynowKeyMessage ||
        (health === "missing"
            ? "PayNow API key is missing. Add a key with the Website role so customers can add items to the cart."
            : "The PayNow API key lacks the Website role. Cart and customer lookups need that role.")

    return (
        <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>PayNow</AlertTitle>
            <AlertDescription>
                {message}{" "}
                <Link href="/admin/settings/site-settings" className="font-medium underline underline-offset-4">
                    Open site settings
                </Link>
            </AlertDescription>
        </Alert>
    )
}
