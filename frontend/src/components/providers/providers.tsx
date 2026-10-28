'use client'

import { SessionProvider } from "@/lib/laravel-auth-react"
import { ThemeProvider } from "./theme-provider"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import dynamic from "next/dynamic"
import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Toaster } from "../ui/sonner";
import { useAuthEvents } from "@/hooks/use-auth-events";
import { CookieConsentProvider } from "./cookie-consent-provider";

const ReactQueryDevtools =
    process.env.NODE_ENV === "development"
        ? dynamic(
              () => import("@tanstack/react-query-devtools").then((mod) => mod.ReactQueryDevtools),
              { ssr: false },
          )
        : function QueryDevtoolsDisabled() {
              return null
          }

const LiveSiteEditor = dynamic(
    () => import("@/components/theme/live-site-editor").then((mod) => mod.LiveSiteEditor),
    { ssr: false },
)

function LiveSiteEditorGate() {
    const params = useSearchParams()
    if (params.get("theme-editor") !== "true") return null
    return <LiveSiteEditor />
}

export function Providers({ children }: { children: React.ReactNode }) {
    const [client] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 15_000,
                        retry: 1,
                    },
                },
            }),
    )
    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            <QueryClientProvider client={client}>
                <SessionProvider>
                    <CookieConsentProvider>
                        <AuthEventWrapper>
                            {children ?? null}
                            <Suspense fallback={null}>
                                <LiveSiteEditorGate />
                            </Suspense>
                            <Toaster />
                            <ReactQueryDevtools initialIsOpen={false} />
                        </AuthEventWrapper>
                    </CookieConsentProvider>
                </SessionProvider>
            </QueryClientProvider>
        </ThemeProvider>
    )
}

function AuthEventWrapper({ children }: { children: React.ReactNode }) {
    useAuthEvents();
    return children ?? null;
}