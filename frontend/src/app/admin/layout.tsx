import { AdminChrome } from "@/components/admin/navigation/admin-chrome"
import { AdminPageViewLogger } from "@/components/admin/admin-page-view-logger"
import { AdminActionLogger } from "@/components/admin/admin-action-logger"
import { PayNowKeyWarning } from "@/components/admin/paynow-key-warning"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { backendApi } from "@/lib/api"

export async function generateMetadata() {
    const res = await fetch(backendApi("data?include=siteSettings"), { headers: { Accept: "application/json" }, next: { revalidate: 60, tags: ["public-pages"] } });
    const data = res.ok ? await res.json() : {};
    const siteSettings = data.siteSettings;
    return {
        title: {
            template: `%s | ${siteSettings?.name || 'Admin'} Admin`,
            default: `${siteSettings?.name || 'Admin'} Admin`,
        },
        description: `Admin panel for ${siteSettings?.name || 'Magic Themes'}`,
    }
}

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const headersList = await headers()
    const forwardedFor = headersList.get("x-forwarded-for") ?? headersList.get("x-real-ip")
    const host =
        headersList.get("x-forwarded-host")?.split(",")[0]?.trim() ||
        headersList.get("host") ||
        ""
    const setupRes = await fetch(backendApi("setup/status?lite=1"), {
        headers: {
            Accept: "application/json",
            ...(forwardedFor && { "X-Forwarded-For": forwardedFor }),
            ...(host && { Host: host }),
            ...(host && { "X-Forwarded-Host": host }),
        },
        cache: "no-store",
    })
    if (setupRes.ok) {
        const setupJson = (await setupRes.json()) as { wizardPending?: boolean }
        if (setupJson.wizardPending === true) {
            redirect("/setup")
        }
    }

    return (
        <AdminChrome>
            <AdminPageViewLogger />
            <AdminActionLogger />
            <PayNowKeyWarning />
            {children}
        </AdminChrome>
    )
}
