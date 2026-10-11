'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { backendApi } from '@/lib/api'
import { getAuthToken } from '@/lib/laravel-auth'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { ExternalLink, Loader2, Plus, Settings, Trash2, CheckCircle2, AlertCircle } from 'lucide-react'
import { PterodactylStartupVarKeysFields } from '@/components/admin/servers/pterodactyl-startup-var-keys-fields'
import {
    defaultPterodactylStartupVarKeys,
    normalizePterodactylStartupVarKeys,
    type PterodactylStartupVarKeys,
} from '@/lib/pterodactyl-startup-vars'
import { PanelDriverMark, panelDriverFromLabel, type PanelDriver } from '@/components/admin/servers/panel-driver-mark'

const PANEL_DRIVERS: { id: PanelDriver; label: string }[] = [
    { id: 'pterodactyl', label: 'Pterodactyl' },
    { id: 'pelican', label: 'Pelican' },
    { id: 'calagopus', label: 'Calagopus' },
]

type PterodactylPanel = {
    id: number
    name: string
    driver?: PanelDriver
    driverLabel?: string
    panelUrl: string
    apiKeyMasked: string | null
    apiKeyConfigured: boolean
    apiKeyCreateUrl: string
    docsUrl?: string
    clientApiUrl: string
    startupVarKeys: PterodactylStartupVarKeys
}

function authHeaders(json = false): Record<string, string> {
    const token = getAuthToken()
    const h: Record<string, string> = { Accept: 'application/json' }
    if (token) h['Authorization'] = `Bearer ${token}`
    if (json) h['Content-Type'] = 'application/json'
    return h
}

function apiKeyHint(driver: PanelDriver, key: string): string | null {
    if (driver === 'calagopus') return null
    const trimmed = key.trim().toLowerCase()
    if (trimmed.startsWith('ptla_')) {
        return 'Application keys (ptla_) cannot be used. Create a Client API key (ptlc_) in your panel account instead.'
    }
    if (trimmed.length > 0 && !trimmed.startsWith('ptlc_')) {
        return 'Client API keys must start with ptlc_.'
    }
    return null
}

function keyCreateUrl(driver: PanelDriver, panelUrl: string): string | null {
    const base = panelUrl.trim().replace(/\/+$/, '')
    if (!base) return null
    return driver === 'calagopus' ? `${base}/account/api-keys` : `${base}/account/api`
}

export function PterodactylPanelSettings() {
    const [open, setOpen] = useState(false)
    const [editingId, setEditingId] = useState<number | null>(null)
    const [name, setName] = useState('')
    const [driver, setDriver] = useState<PanelDriver>('pterodactyl')
    const [panelUrl, setPanelUrl] = useState('')
    const [apiKey, setApiKey] = useState('')
    const [startupVarKeys, setStartupVarKeys] = useState<PterodactylStartupVarKeys>({
        ...defaultPterodactylStartupVarKeys,
    })
    const queryClient = useQueryClient()

    const { data, isLoading } = useQuery({
        queryKey: ['pterodactylPanels'],
        queryFn: async () => {
            const res = await fetch(backendApi('admin/settings/pterodactyl/panels'), {
                credentials: 'include',
                headers: authHeaders(),
            })
            if (!res.ok) throw new Error('Failed to load panels')
            return res.json() as Promise<{ panels: PterodactylPanel[] }>
        },
        enabled: open,
    })

    const panels = data?.panels ?? []
    const keyHint = apiKeyHint(driver, apiKey)
    const apiKeyCreateUrl = keyCreateUrl(driver, panelUrl)

    const resetForm = () => {
        setEditingId(null)
        setName('')
        setDriver('pterodactyl')
        setPanelUrl('')
        setApiKey('')
        setStartupVarKeys({ ...defaultPterodactylStartupVarKeys })
    }

    const saveMutation = useMutation({
        mutationFn: async () => {
            const body = {
                name: name.trim(),
                driver,
                panelUrl: panelUrl.trim(),
                startupVarKeys: normalizePterodactylStartupVarKeys(startupVarKeys),
                ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
            }
            const url = editingId
                ? backendApi(`admin/settings/pterodactyl/panels/${editingId}`)
                : backendApi('admin/settings/pterodactyl/panels')
            const res = await fetch(url, {
                method: editingId ? 'PUT' : 'POST',
                credentials: 'include',
                headers: authHeaders(true),
                body: JSON.stringify(body),
            })
            const json = await res.json().catch(() => ({}))
            if (!res.ok) {
                throw new Error(json.error || 'Failed to save panel')
            }
            return json
        },
        onSuccess: () => {
            toast.success(editingId ? 'Panel updated' : 'Panel added')
            resetForm()
            queryClient.invalidateQueries({ queryKey: ['pterodactylPanels'] })
        },
        onError: (e: Error) => toast.error(e.message),
    })

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch(backendApi(`admin/settings/pterodactyl/panels/${id}`), {
                method: 'DELETE',
                credentials: 'include',
                headers: authHeaders(),
            })
            if (!res.ok) throw new Error('Failed to delete panel')
        },
        onSuccess: () => {
            toast.success('Panel removed')
            if (editingId) resetForm()
            queryClient.invalidateQueries({ queryKey: ['pterodactylPanels'] })
        },
        onError: (e: Error) => toast.error(e.message),
    })

    const testMutation = useMutation({
        mutationFn: async () => {
            const url = editingId
                ? backendApi(`admin/settings/pterodactyl/panels/${editingId}/test`)
                : backendApi('admin/settings/pterodactyl/panels/test')
            const res = await fetch(url, {
                method: 'POST',
                credentials: 'include',
                headers: authHeaders(true),
                body: JSON.stringify({
                    driver,
                    panelUrl: panelUrl.trim(),
                    ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
                }),
            })
            return res.json()
        },
    })

    const startEdit = (panel: PterodactylPanel) => {
        setEditingId(panel.id)
        setName(panel.name)
        setDriver(panel.driver ?? 'pterodactyl')
        setPanelUrl(panel.panelUrl)
        setApiKey('')
        setStartupVarKeys(normalizePterodactylStartupVarKeys(panel.startupVarKeys))
    }

    return (
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm() }}>
            <DialogTrigger asChild>
                <Button variant="outline" size="icon" title="Game panel settings">
                    <Settings className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Game panels</DialogTitle>
                    <DialogDescription>
                        Connect Pterodactyl, Pelican, or Calagopus. Pterodactyl and Pelican use a Client API key (
                        <code className="text-xs">ptlc_</code>
                        ). Calagopus uses an account API key from its API keys page.
                        Keys list servers when you add or edit a site server.
                        For live console output, add your admin site URL to Wings{' '}
                        <code className="text-xs">allowed_origins</code> on each node.{' '}
                        <a
                            href="https://docs.pterodactyl.io/v2/api"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline inline-flex items-center gap-1"
                        >
                            Pterodactyl <ExternalLink className="h-3 w-3" />
                        </a>
                        {' · '}
                        <a
                            href="https://demo.pelican.dev/docs/api/client"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline"
                        >
                            Pelican
                        </a>
                        {' · '}
                        <a
                            href="https://demo.calagopus.com/api"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline"
                        >
                            Calagopus
                        </a>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {isLoading ? (
                        <div className="flex justify-center py-6">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : panels.length > 0 ? (
                        <ul className="space-y-2">
                            {panels.map((panel) => (
                                <li
                                    key={panel.id}
                                    className="flex items-center justify-between gap-2 rounded-md border p-3"
                                >
                                    <div>
                                        <p className="flex items-center gap-2 font-medium text-sm">
                                            {panel.name}
                                            <PanelDriverMark
                                                driver={panelDriverFromLabel(panel.driver)}
                                                label={panel.driverLabel ?? 'Pterodactyl'}
                                                className="text-xs font-normal text-muted-foreground"
                                            />
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate">{panel.panelUrl}</p>
                                        {panel.apiKeyConfigured && (
                                            <p className="text-xs text-muted-foreground font-mono mt-1">
                                                {panel.apiKeyMasked}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex shrink-0 gap-1">
                                        <Button type="button" variant="ghost" size="sm" onClick={() => startEdit(panel)}>
                                            Edit
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive"
                                            onClick={() => deleteMutation.mutate(panel.id)}
                                            disabled={deleteMutation.isPending}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-muted-foreground">No panels configured yet.</p>
                    )}

                    <div className="space-y-3 rounded-md border p-4">
                        <h4 className="text-sm font-medium">{editingId ? 'Edit panel' : 'Add panel'}</h4>
                        <div className="space-y-2">
                            <Label>Panel type</Label>
                            <Select value={driver} onValueChange={(value) => setDriver(value as PanelDriver)}>
                                <SelectTrigger className="[&>span]:flex [&>span]:min-w-0 [&>span]:items-center [&>span]:line-clamp-none">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {PANEL_DRIVERS.map((option) => (
                                        <SelectItem key={option.id} value={option.id}>
                                            <PanelDriverMark driver={option.id} label={option.label} />
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="pt-name">Display name</Label>
                            <Input
                                id="pt-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Main panel"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="pt-url">Panel URL</Label>
                            <Input
                                id="pt-url"
                                value={panelUrl}
                                onChange={(e) => setPanelUrl(e.target.value)}
                                placeholder="https://panel.example.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="pt-key">{driver === 'calagopus' ? 'API key' : 'Client API key'}</Label>
                            <Input
                                id="pt-key"
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder={
                                    editingId
                                        ? 'Leave blank to keep current key'
                                        : driver === 'calagopus'
                                          ? 'Account API key'
                                          : 'ptlc_...'
                                }
                                autoComplete="off"
                            />
                            {keyHint && (
                                <Alert variant="destructive" className="py-2">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription className="text-xs">{keyHint}</AlertDescription>
                                </Alert>
                            )}
                            {apiKeyCreateUrl && (
                                <p className="text-xs text-muted-foreground">
                                    {driver === 'calagopus' ? 'Create an API key at' : 'Create a Client API key at'}{' '}
                                    <a
                                        href={apiKeyCreateUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary underline"
                                    >
                                        {apiKeyCreateUrl}
                                    </a>
                                    {driver === 'calagopus'
                                        ? '.'
                                        : '. Application keys (ptla_) will not work. Use a Client key (ptlc_).'}
                                </p>
                            )}
                        </div>

                        <PterodactylStartupVarKeysFields
                            value={startupVarKeys}
                            onChange={setStartupVarKeys}
                            disabled={saveMutation.isPending}
                        />

                        {testMutation.data && (
                            <Alert variant={testMutation.data.valid ? 'default' : 'destructive'} className="py-2">
                                {testMutation.data.valid ? (
                                    <CheckCircle2 className="h-4 w-4" />
                                ) : (
                                    <AlertCircle className="h-4 w-4" />
                                )}
                                <AlertDescription className="text-xs">
                                    {testMutation.data.valid
                                        ? `Connected — ${testMutation.data.serverCount ?? 0} server(s) found.`
                                        : testMutation.data.error}
                                    {testMutation.data.apiKeyCreateUrl && !testMutation.data.valid && (
                                        <>
                                            {' '}
                                            <a
                                                href={testMutation.data.apiKeyCreateUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="underline"
                                            >
                                                Create API key
                                            </a>
                                        </>
                                    )}
                                </AlertDescription>
                            </Alert>
                        )}

                        <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-start px-0">
                            <Button
                                type="button"
                                variant="secondary"
                                disabled={!panelUrl.trim() || testMutation.isPending}
                                onClick={() => testMutation.mutate()}
                            >
                                {testMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : null}
                                Test connection
                            </Button>
                            <Button
                                type="button"
                                disabled={
                                    !name.trim() ||
                                    !panelUrl.trim() ||
                                    (!editingId && !apiKey.trim()) ||
                                    !!keyHint ||
                                    saveMutation.isPending
                                }
                                onClick={() => saveMutation.mutate()}
                            >
                                {saveMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <Plus className="h-4 w-4 mr-2" />
                                )}
                                {editingId ? 'Save changes' : 'Add panel'}
                            </Button>
                            {editingId && (
                                <Button type="button" variant="ghost" onClick={resetForm}>
                                    Cancel edit
                                </Button>
                            )}
                        </DialogFooter>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

