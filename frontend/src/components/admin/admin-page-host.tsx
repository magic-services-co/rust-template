"use client"

import { useMemo, type ReactNode } from "react"
import { usePathname } from "next/navigation"

import { installedFronts } from "@/addons/installed"
import { useAddonsManifest } from "@/hooks/use-addons-manifest"
import { resolveAdminAddonPages } from "@/lib/admin-addon-pages"

export function AdminPageHost({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? ""
  const manifest = useAddonsManifest()
  const resolved = useMemo(() => {
    const enabled = new Set(manifest.data?.addons.map((addon) => addon.id) ?? [])
    return resolveAdminAddonPages(
      pathname,
      installedFronts.filter((front) => enabled.has(front.id)),
    )
  }, [manifest.data?.addons, pathname])

  const Page = resolved.page?.Component

  return (
    <>
      {Page && resolved.page ? (
        <Page pathname={pathname} params={resolved.page.params} />
      ) : (
        children
      )}
      {resolved.panels.map((panel) => (
        <panel.Component key={panel.key} pathname={pathname} params={panel.params} />
      ))}
    </>
  )
}
