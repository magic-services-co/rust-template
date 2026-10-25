import { backendApi } from '@/lib/api'
import { getAuthToken } from '@/lib/laravel-auth'
import type { MapVoteSummary, PterodactylStartupVariable, ServerAutomation } from '@/types/automation'

export type AutomationSchedulerStatus = {
    lastTickAt: string | null
    intervalSeconds: number
}

function authHeaders(json = false): Record<string, string> {
    const token = getAuthToken()
    const h: Record<string, string> = { Accept: 'application/json' }
    if (token) h['Authorization'] = `Bearer ${token}`
    if (json) h['Content-Type'] = 'application/json'
    return h
}

export async function fetchAutomations(): Promise<{ automations: ServerAutomation[]; scheduler: AutomationSchedulerStatus }> {
    const res = await fetch(backendApi('admin/automations'), {
        credentials: 'include',
        headers: authHeaders(),
    })
    if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error((json as { error?: string }).error || 'Failed to load automations')
    }
    const data = await res.json()
    const scheduler = (data.scheduler ?? {}) as Partial<AutomationSchedulerStatus>
    return {
        automations: (data.automations ?? []) as ServerAutomation[],
        scheduler: {
            lastTickAt: scheduler.lastTickAt ?? null,
            intervalSeconds: scheduler.intervalSeconds ?? 60,
        },
    }
}

export async function createAutomation(payload: Record<string, unknown>): Promise<ServerAutomation> {
    const res = await fetch(backendApi('admin/automations'), {
        method: 'POST',
        credentials: 'include',
        headers: authHeaders(true),
        body: JSON.stringify(payload),
    })
    if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error((json as { error?: string; message?: string }).error || (json as { message?: string }).message || 'Failed to create automation')
    }
    const data = await res.json()
    return data.automation as ServerAutomation
}

export async function updateAutomation(id: string, payload: Record<string, unknown>): Promise<ServerAutomation> {
    const res = await fetch(backendApi(`admin/automations/${encodeURIComponent(id)}`), {
        method: 'PUT',
        credentials: 'include',
        headers: authHeaders(true),
        body: JSON.stringify(payload),
    })
    if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error((json as { error?: string; message?: string }).error || (json as { message?: string }).message || 'Failed to update automation')
    }
    const data = await res.json()
    return data.automation as ServerAutomation
}

export async function deleteAutomation(id: string): Promise<void> {
    const res = await fetch(backendApi(`admin/automations/${encodeURIComponent(id)}`), {
        method: 'DELETE',
        credentials: 'include',
        headers: authHeaders(),
    })
    if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error((json as { error?: string }).error || 'Failed to delete automation')
    }
}

export async function runAutomationNow(id: string): Promise<ServerAutomation> {
    const res = await fetch(backendApi(`admin/automations/${encodeURIComponent(id)}/run`), {
        method: 'POST',
        credentials: 'include',
        headers: authHeaders(),
    })
    if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error((json as { error?: string }).error || 'Automation run failed')
    }
    const data = await res.json()
    return data.automation as ServerAutomation
}

export async function fetchMapVotesForServer(serverId: string): Promise<MapVoteSummary[]> {
    const res = await fetch(backendApi(`admin/servers/${encodeURIComponent(serverId)}/map-votes`), {
        credentials: 'include',
        headers: authHeaders(),
    })
    if (!res.ok) {
        throw new Error('Failed to load map votes')
    }
    const data = await res.json()
    return (data.mapVotes ?? []) as MapVoteSummary[]
}

export async function fetchPterodactylStartupVariables(serverId: string): Promise<PterodactylStartupVariable[]> {
    const res = await fetch(backendApi(`admin/servers/${encodeURIComponent(serverId)}/pterodactyl/startup`), {
        credentials: 'include',
        headers: authHeaders(),
    })
    if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error((json as { error?: string }).error || 'Failed to load startup variables')
    }
    const data = await res.json()
    return (data.variables ?? []) as PterodactylStartupVariable[]
}
