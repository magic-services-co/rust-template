'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { addonsManifestQueryKey } from '@/hooks/use-addons-manifest'
import { backendApi } from '@/lib/api'
import { getAuthToken } from '@/lib/laravel-auth'
import { prepareSanctumMutationHeaders } from '@/lib/sanctum-csrf'

export type SystemControlAddon = {
  alias: string
  name: string
  description: string
  enabled: boolean
  thumbnail: string | null
  admin_configure_path: string | null
}

export type SystemControlAddonsResponse = {
  addons: SystemControlAddon[]
}

async function fetchSystemControlAddons(): Promise<SystemControlAddonsResponse> {
  const res = await fetch(backendApi('admin/system-control/addons'), {
    headers: { Accept: 'application/json' },
    credentials: 'include',
  })
  if (!res.ok) {
    throw new Error('Failed to load addons')
  }
  return res.json()
}

async function patchAddonEnabled(
  alias: string,
  enabled: boolean
): Promise<{ addon: SystemControlAddon }> {
  const res = await fetch(backendApi(`admin/system-control/addons/${encodeURIComponent(alias)}`), {
    method: 'PATCH',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ enabled }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(
      typeof body?.message === 'string' ? body.message : 'Could not update addon'
    )
  }
  return res.json()
}

export const systemControlAddonsQueryKey = ['admin', 'systemControl', 'addons'] as const

export function useSystemControlAddons() {
  return useQuery({
    queryKey: systemControlAddonsQueryKey,
    queryFn: fetchSystemControlAddons,
    staleTime: 30 * 1000,
  })
}

async function mutationHeaders(json: boolean): Promise<Record<string, string>> {
  return prepareSanctumMutationHeaders({ json, bearerToken: getAuthToken() })
}

async function readError(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => ({}))
  return typeof body?.message === 'string' ? body.message : fallback
}

export function useInstallAddonMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ file, replace }: { file: File; replace: boolean }) => {
      const form = new FormData()
      form.append('file', file)
      form.append('replace', replace ? '1' : '0')
      const res = await fetch(backendApi('admin/system-control/addons'), {
        method: 'POST',
        credentials: 'include',
        headers: await mutationHeaders(false),
        body: form,
      })
      if (!res.ok) {
        throw new Error(await readError(res, 'Could not install the addon'))
      }
      const body = await res.json().catch(() => ({}))
      return typeof body?.message === 'string' ? body.message : 'Addon installed.'
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: systemControlAddonsQueryKey })
      queryClient.invalidateQueries({ queryKey: addonsManifestQueryKey })
    },
  })
}

export function useRemoveAddonMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (alias: string) => {
      const res = await fetch(backendApi(`admin/system-control/addons/${encodeURIComponent(alias)}`), {
        method: 'DELETE',
        credentials: 'include',
        headers: await mutationHeaders(false),
      })
      if (!res.ok) {
        throw new Error(await readError(res, 'Could not remove the addon'))
      }
      const body = await res.json().catch(() => ({}))
      return typeof body?.message === 'string' ? body.message : 'Addon removed.'
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: systemControlAddonsQueryKey })
      queryClient.invalidateQueries({ queryKey: addonsManifestQueryKey })
    },
  })
}

export function useRebuildFrontendMutation() {
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(backendApi('admin/system-control/frontend-rebuild'), {
        method: 'POST',
        credentials: 'include',
        headers: await mutationHeaders(false),
      })
      if (!res.ok) {
        throw new Error(await readError(res, 'Could not rebuild the frontend'))
      }
      const body = await res.json().catch(() => ({}))
      return typeof body?.message === 'string' ? body.message : 'Frontend rebuild started.'
    },
  })
}

export function useSetAddonEnabledMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ alias, enabled }: { alias: string; enabled: boolean }) =>
      patchAddonEnabled(alias, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: systemControlAddonsQueryKey })
      queryClient.invalidateQueries({ queryKey: addonsManifestQueryKey })
    },
  })
}
