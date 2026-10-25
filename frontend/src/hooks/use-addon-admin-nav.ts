'use client'

import { useMemo } from 'react'

import { installedFronts } from '@/addons/installed'
import { addonRegistry } from '@/addons/registry'
import type { AdminNavMainItem } from '@/components/admin/navigation/nav-main'

import { useAddonsManifest } from './use-addons-manifest'

export function useAddonAdminNavItems(): AdminNavMainItem[] {
  const { data } = useAddonsManifest()

  return useMemo(() => {
    if (!data?.addons) return []
    const enabled = new Set(data.addons.map((a) => a.id))
    const fromRegistry = addonRegistry
      .filter((addon) => enabled.has(addon.id))
      .flatMap((addon) => addon.adminNav)
    const fromInstalled = installedFronts
      .filter((addon) => enabled.has(addon.id))
      .flatMap((addon) => addon.adminNav ?? [])
    const seen = new Set<string>()
    return [...fromRegistry, ...fromInstalled].filter((item) => {
      if (seen.has(item.url)) return false
      seen.add(item.url)
      return true
    })
  }, [data?.addons])
}
