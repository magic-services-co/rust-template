"use client"

import { Suspense, type ReactNode } from "react"

import { AdminReleaseBadge } from "@/components/admin/admin-release-badge"
import { AppSidebar } from "@/components/admin/navigation/app-sidebar"
import { PurgeCacheButton } from "@/components/admin/purge-cache-button"
import DynamicBreadcrumbs from "@/components/dynamic-breadcrumbs"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { usePublicFrontSlot } from "@/lib/public-front"

export function AdminChrome({ children }: { children: ReactNode }) {
  const { slot: Shell, ready } = usePublicFrontSlot("adminShell")
  if (!ready) return null
  if (Shell) return <Shell>{children}</Shell>

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 w-full shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Suspense fallback={<div>Loading...</div>}>
              <DynamicBreadcrumbs />
            </Suspense>
            <Separator orientation="vertical" className="mx-2 h-4" />
            <AdminReleaseBadge />
          </div>
          <PurgeCacheButton />
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 py-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
