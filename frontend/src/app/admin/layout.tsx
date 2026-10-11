import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/admin/navigation/app-sidebar"
import DynamicBreadcrumbs from "@/components/dynamic-breadcrumbs"
import { AdminPageViewLogger } from "@/components/admin/admin-page-view-logger"
import { AdminActionLogger } from "@/components/admin/admin-action-logger"
import { AdminReleaseBadge } from "@/components/admin/admin-release-badge"
import { PayNowKeyWarning } from "@/components/admin/paynow-key-warning"
import { Suspense } from "react"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { backendApi } from "@/lib/api"

export async function generateMetadata() {
    const res = await fetch(backendApi("data?include=siteSettings"), { headers: { Accept: "application/json" }, next: { revalidate: 60 } });
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
    const setupRes = await fetch(backendApi("setup/status"), {
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
        <SidebarProvider>
            <AdminPageViewLogger />
            <AdminActionLogger />
            <AppSidebar />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
                    <div className="flex items-center gap-2 px-4">
                        <SidebarTrigger className="-ml-1" />
                        <Separator orientation="vertical" className="mr-2 h-4" />
                        <Suspense fallback={<div>Loading...</div>}>
                            <DynamicBreadcrumbs />
                        </Suspense>
                        <Separator orientation="vertical" className="mx-2 h-4" />
                        <AdminReleaseBadge />
                    </div>
                </header>
                <div className="flex flex-1 flex-col gap-4 p-4 py-6">
                    <PayNowKeyWarning />
                    {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}