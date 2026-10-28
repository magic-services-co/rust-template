import { cache } from "react"
import { headers } from "next/headers"
import { backendApi } from "@/lib/api"

export type PublicChrome = {
  siteMetadata?: Record<string, unknown>
  themeSettings?: { faviconImage?: string; logoImage?: string; updatedAt?: string }
  layoutChrome?: { logoImage?: string; faviconImage?: string }
  navigationItems?: unknown[]
  siteSettings?: { name?: string }
  styleRevision?: { theme?: string; elements?: string }
}

export const getPublicChrome = cache(async (): Promise<PublicChrome> => {
  const headersList = await headers()
  const host =
    headersList.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    headersList.get("host") ||
    ""

  try {
    const res = await fetch(
      backendApi("data?include=siteMetadata,themeSettings,layoutChrome,navigationItems,siteSettings"),
      {
        headers: {
          Accept: "application/json",
          ...(host ? { Host: host, "X-Forwarded-Host": host } : {}),
        },
        next: { revalidate: 30, tags: ["public-pages"] },
        signal: AbortSignal.timeout(5000),
      },
    )
    if (!res.ok) return {}
    return (await res.json()) as PublicChrome
  } catch {
    return {}
  }
})
