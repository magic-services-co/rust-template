'use client'

import { useQuery } from '@tanstack/react-query'
import { backendApi } from '@/lib/api'
import { getAuthToken } from '@/lib/laravel-auth'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { PanelDriverMark, panelDriverFromLabel } from '@/components/admin/servers/panel-driver-mark'

export type PterodactylServerOption = {
    shortUuid: string
    uuid: string
    name: string
    description: string | null
    node: string | null
    address: string | null
}

type PterodactylPanelOption = {
    id: number
    name: string
    panelUrl: string
    driver?: string
    driverLabel?: string
}

type PterodactylServerPickerProps = {
    panelId: number | null
    serverIdentifier: string | null
    onPanelChange: (panelId: number | null) => void
    onServerChange: (shortUuid: string | null, server: PterodactylServerOption | null) => void
    onServerSelected?: (server: PterodactylServerOption) => void
}

function authHeaders(): Record<string, string> {
    const token = getAuthToken()
    const h: Record<string, string> = { Accept: 'application/json' }
    if (token) h['Authorization'] = `Bearer ${token}`
    return h
}

export function PterodactylServerPicker({
    panelId,
    serverIdentifier,
    onPanelChange,
    onServerChange,
    onServerSelected,
}: PterodactylServerPickerProps) {
    const { data: panelsData, isLoading: panelsLoading } = useQuery({
        queryKey: ['pterodactylPanels'],
        queryFn: async () => {
            const res = await fetch(backendApi('admin/settings/pterodactyl/panels'), {
                credentials: 'include',
                headers: authHeaders(),
            })
            if (!res.ok) throw new Error('Failed to load panels')
            return res.json() as Promise<{ panels: PterodactylPanelOption[] }>
        },
    })

    const panels = panelsData?.panels ?? []

    const { data: serversData, isLoading: serversLoading } = useQuery({
        queryKey: ['pterodactylPanelServers', panelId],
        queryFn: async () => {
            const res = await fetch(backendApi(`admin/settings/pterodactyl/panels/${panelId}/servers`), {
                credentials: 'include',
                headers: authHeaders(),
            })
            if (!res.ok) {
                const json = await res.json().catch(() => ({}))
                throw new Error(json.error || 'Failed to load panel servers')
            }
            return res.json() as Promise<{ servers: PterodactylServerOption[] }>
        },
        enabled: panelId != null,
    })

    const servers = serversData?.servers ?? []

    if (panelsLoading) {
        return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading panels…
            </div>
        )
    }

    if (panels.length === 0) {
        return (
            <p className="text-xs text-muted-foreground">
                Add a Pterodactyl, Pelican, or Calagopus panel with the settings button next to Server Management.
            </p>
        )
    }

    return (
        <div className="space-y-3 rounded-md border border-border/40 p-3">
            <p className="text-sm font-medium">Panel server (optional)</p>
            <div className="space-y-2">
                <Label>Panel</Label>
                <Select
                    value={panelId != null ? String(panelId) : 'none'}
                    onValueChange={(v) => {
                        if (v === 'none') {
                            onPanelChange(null)
                            onServerChange(null, null)
                            return
                        }
                        const id = parseInt(v, 10)
                        onPanelChange(id)
                        onServerChange(null, null)
                    }}
                >
                    <SelectTrigger className="[&>span]:flex [&>span]:min-w-0 [&>span]:items-center [&>span]:line-clamp-none">
                        <SelectValue placeholder="Select panel" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {panels.map((p) => (
                            <SelectItem key={p.id} value={String(p.id)}>
                                <span className="inline-flex min-w-0 items-center gap-2">
                                    <PanelDriverMark driver={panelDriverFromLabel(p.driver)} />
                                    <span className="truncate">
                                        {p.name}
                                        {p.driverLabel ? ` · ${p.driverLabel}` : ''}
                                    </span>
                                </span>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {panelId != null && (
                <div className="space-y-2">
                    <Label>Game server</Label>
                    {serversLoading ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading servers…
                        </div>
                    ) : (
                        <Select
                            value={serverIdentifier ?? 'none'}
                            onValueChange={(v) => {
                                if (v === 'none') {
                                    onServerChange(null, null)
                                    return
                                }
                                const server = servers.find((s) => s.shortUuid === v) ?? null
                                onServerChange(v, server)
                                if (server && onServerSelected) onServerSelected(server)
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select game server" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {servers.map((s) => (
                                    <SelectItem key={s.shortUuid} value={s.shortUuid}>
                                        {s.name}
                                        {s.address ? ` — ${s.address}` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                    {!serversLoading && servers.length === 0 && (
                        <p className="text-xs text-muted-foreground">No servers returned for this panel.</p>
                    )}
                </div>
            )}
        </div>
    )
}

