'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { backendApi } from '@/lib/api'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { GameServerCommandField } from '@/components/game-server-command-field'
import {
    authHeaders,
    defaultGameServerCommandValue,
    sendGameServerCommand,
    type GameServerCommandValue,
} from '@/lib/game-server-command'
import { Loader2, Play, RotateCw, Square, Terminal } from 'lucide-react'

type PowerSignal = 'start' | 'stop' | 'restart'

type PterodactylConsoleDialogProps = {
    serverId: string
    serverName: string
    hasPterodactyl: boolean
    open: boolean
    onOpenChange: (open: boolean) => void
}

type WsPayload = {
    event?: string
    args?: unknown[]
}

type WebsocketCredentials = {
    token?: string
    socket?: string
    origin?: string
    panelName?: string
    pterodactylShortUuid?: string
    consoleHint?: { wingsConfig?: string; docs?: string }
    error?: string
    hint?: string | null
}

function handleWsMessage(
    msg: WsPayload,
    ws: WebSocket,
    appendLine: (line: string) => void,
    setServerStatus: (s: string | null) => void,
    setConnectionState: (s: string) => void,
    setError: (e: string | null) => void,
    authenticatedRef: React.MutableRefObject<boolean>,
    setWsAuthenticated: (v: boolean) => void
) {
    const evt = msg.event ?? ''

    if (evt === 'auth success') {
        authenticatedRef.current = true
        setWsAuthenticated(true)
        setConnectionState('connected')
        ws.send(JSON.stringify({ event: 'set state', args: [''] }))
        appendLine('[Console] WebSocket authenticated — live output enabled.')
        return
    }

    if (evt === 'token expiring' && Array.isArray(msg.args) && typeof msg.args[0] === 'string') {
        appendLine('[Console] Refreshing session token…')
        ws.send(JSON.stringify({ event: 'auth', args: [msg.args[0]] }))
        return
    }

    if (evt === 'console output' && Array.isArray(msg.args)) {
        for (const chunk of msg.args) {
            if (typeof chunk === 'string' && chunk.length > 0) {
                appendLine(chunk)
            }
        }
        return
    }

    if (evt === 'status' && Array.isArray(msg.args) && msg.args[0] != null) {
        setServerStatus(String(msg.args[0]))
        return
    }

    if (evt === 'jwt error' || evt === 'auth failed') {
        authenticatedRef.current = false
        setWsAuthenticated(false)
        setError('WebSocket authentication failed. Commands still work via the panel API.')
        setConnectionState('ws-auth-failed')
    }
}

export function PterodactylConsoleDialog({
    serverId,
    serverName,
    hasPterodactyl,
    open,
    onOpenChange,
}: PterodactylConsoleDialogProps) {
    const [lines, setLines] = useState<string[]>([])
    const [connectionState, setConnectionState] = useState('idle')
    const [serverStatus, setServerStatus] = useState<string | null>(null)
    const [commandValue, setCommandValue] = useState<GameServerCommandValue>(defaultGameServerCommandValue)
    const [error, setError] = useState<string | null>(null)
    const [panelOrigin, setPanelOrigin] = useState<string | null>(null)
    const [consoleHint, setConsoleHint] = useState<WebsocketCredentials['consoleHint']>()
    const [pteroReady, setPteroReady] = useState(false)
    const [sendingCommand, setSendingCommand] = useState(false)
    const [powerSignal, setPowerSignal] = useState<PowerSignal | null>(null)
    const [wsAuthenticated, setWsAuthenticated] = useState(false)
    const wsRef = useRef<WebSocket | null>(null)
    const authenticatedRef = useRef(false)
    const outputRef = useRef<HTMLDivElement>(null)

    const { data: bmSettings } = useQuery({
        queryKey: ['battlemetricsIntegration'],
        queryFn: async () => {
            const res = await fetch(backendApi('admin/settings/battlemetrics'), {
                credentials: 'include',
                headers: authHeaders(),
            })
            if (!res.ok) throw new Error('Failed to load BattleMetrics settings')
            return res.json() as Promise<{ enabled?: boolean; apiKey?: string | null }>
        },
        enabled: open,
    })

    const bmEnabled = Boolean(bmSettings?.enabled && bmSettings?.apiKey)

    const appendLine = useCallback((line: string) => {
        setLines((prev) => {
            const next = [...prev, line]
            return next.length > 600 ? next.slice(-600) : next
        })
    }, [])

    useEffect(() => {
        if (!open) return
        if (hasPterodactyl) {
            setCommandValue((v) => ({ ...v, channel: 'ptero' }))
        } else if (bmEnabled) {
            setCommandValue((v) => ({ ...v, channel: 'bm' }))
        }
    }, [open, hasPterodactyl, bmEnabled])

    useEffect(() => {
        if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight
        }
    }, [lines])

    useEffect(() => {
        if (!open) {
            authenticatedRef.current = false
            setPteroReady(false)
            wsRef.current?.close()
            wsRef.current = null
            return
        }

        if (!hasPterodactyl) {
            setPteroReady(false)
            setPanelOrigin(null)
            setConnectionState(bmEnabled ? 'ready' : 'unavailable')
            setLines(
                bmEnabled
                    ? [
                          `[Console] BattleMetrics RCON — server ID ${serverId}`,
                          '[Console] Live output requires a linked Pterodactyl server.',
                      ]
                    : ['[Console] Link Pterodactyl or enable BattleMetrics integration to send commands.']
            )
            return
        }

        let cancelled = false

        async function connectPterodactyl() {
            setError(null)
            setLines([])
            setServerStatus(null)
            setConnectionState('connecting')
            setPteroReady(false)
            setWsAuthenticated(false)
            authenticatedRef.current = false

            try {
                const res = await fetch(
                    backendApi(`admin/servers/${encodeURIComponent(serverId)}/pterodactyl/websocket`),
                    { credentials: 'include', headers: authHeaders() }
                )
                const json = (await res.json().catch(() => ({}))) as WebsocketCredentials
                if (!res.ok) {
                    const parts = [
                        json.error || 'Failed to load console credentials',
                        json.pterodactylShortUuid ? `Short UUID: ${json.pterodactylShortUuid}` : null,
                        json.hint ?? null,
                    ].filter(Boolean)
                    throw new Error(parts.join('\n\n'))
                }
                if (!json.token || !json.socket) {
                    throw new Error('Panel returned invalid WebSocket credentials.')
                }
                if (cancelled) return

                setPanelOrigin(json.origin ?? null)
                setConsoleHint(json.consoleHint)
                setPteroReady(true)
                appendLine(`[Console] ${json.panelName ?? 'Panel'} connected — ${json.pterodactylShortUuid ?? '?'}`)
                if (bmEnabled) {
                    appendLine(`[Console] BattleMetrics RCON available (server ID ${serverId})`)
                }

                const ws = new WebSocket(json.socket)
                wsRef.current = ws

                ws.onopen = () => {
                    if (cancelled) return
                    setConnectionState('authenticating')
                    ws.send(JSON.stringify({ event: 'auth', args: [json.token] }))
                }

                ws.onmessage = (event) => {
                    if (cancelled) return
                    try {
                        handleWsMessage(
                            JSON.parse(String(event.data)) as WsPayload,
                            ws,
                            appendLine,
                            setServerStatus,
                            setConnectionState,
                            setError,
                            authenticatedRef,
                            setWsAuthenticated
                        )
                    } catch {
                        const raw = String(event.data)
                        if (raw) appendLine(raw)
                    }
                }

                ws.onerror = () => {
                    if (cancelled) return
                    setConnectionState('ws-unavailable')
                    appendLine(
                        '[Console] Could not connect to Wings. Add your admin site URL to allowed_origins on the node (see below).'
                    )
                }

                ws.onclose = () => {
                    if (cancelled) return
                    authenticatedRef.current = false
                    setWsAuthenticated(false)
                    setConnectionState((prev) =>
                        prev === 'connected' || prev === 'ws-auth-failed' ? 'disconnected' : prev
                    )
                }
            } catch (e) {
                if (!cancelled) {
                    setConnectionState('error')
                    setError(e instanceof Error ? e.message : 'Failed to connect')
                }
            }
        }

        void connectPterodactyl()

        return () => {
            cancelled = true
            authenticatedRef.current = false
            wsRef.current?.close()
            wsRef.current = null
        }
    }, [open, serverId, hasPterodactyl, bmEnabled, appendLine])

    const channelReady =
        commandValue.channel === 'bm' ? bmEnabled : hasPterodactyl && pteroReady

    const sendCommand = async () => {
        const trimmed = commandValue.command.trim()
        if (!trimmed || !channelReady || sendingCommand) return

        setSendingCommand(true)
        appendLine(`> [${commandValue.channel === 'bm' ? 'BM' : 'Ptero'}] ${trimmed}`)
        setCommandValue((v) => ({ ...v, command: '' }))

        try {
            await sendGameServerCommand(serverId, trimmed, commandValue.channel)
            appendLine(
                `[Console] Command sent via ${commandValue.channel === 'bm' ? 'BattleMetrics' : 'Pterodactyl'}.`
            )
        } catch (e) {
            appendLine(`[Error] ${e instanceof Error ? e.message : 'Command failed'}`)
        } finally {
            setSendingCommand(false)
        }
    }

    const sendPower = async (signal: PowerSignal) => {
        if (!pteroReady || powerSignal) return

        setPowerSignal(signal)
        appendLine(`[Console] Power: ${signal}…`)

        try {
            const res = await fetch(
                backendApi(`admin/servers/${encodeURIComponent(serverId)}/pterodactyl/power`),
                {
                    method: 'POST',
                    credentials: 'include',
                    headers: authHeaders(true),
                    body: JSON.stringify({ signal }),
                }
            )
            if (!res.ok) {
                const json = await res.json().catch(() => ({}))
                throw new Error((json as { error?: string }).error || `Power ${signal} failed (${res.status})`)
            }
            appendLine(`[Console] ${signal} signal sent.`)
        } catch (e) {
            appendLine(`[Error] ${e instanceof Error ? e.message : `Power ${signal} failed`}`)
        } finally {
            setPowerSignal(null)
        }
    }

    const wsLive = connectionState === 'connected' && wsAuthenticated
    const controlsBusy = !channelReady || !!powerSignal || sendingCommand

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col gap-3">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Terminal className="h-5 w-5" />
                        Console — {serverName}
                    </DialogTitle>
                    <DialogDescription>
                        Send commands through the linked panel or BattleMetrics RCON. Live output uses the panel
                        Wings (<code className="text-xs">allowed_origins</code> required).
                    </DialogDescription>
                </DialogHeader>

                {hasPterodactyl && (
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={controlsBusy || !pteroReady}
                        onClick={() => void sendPower('start')}
                    >
                        {powerSignal === 'start' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Play className="h-4 w-4" />
                        )}
                        <span className="ml-1.5">Start</span>
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={controlsBusy || !pteroReady}
                        onClick={() => void sendPower('restart')}
                    >
                        {powerSignal === 'restart' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <RotateCw className="h-4 w-4" />
                        )}
                        <span className="ml-1.5">Restart</span>
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={controlsBusy || !pteroReady}
                        onClick={() => void sendPower('stop')}
                    >
                        {powerSignal === 'stop' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Square className="h-4 w-4" />
                        )}
                        <span className="ml-1.5">Stop</span>
                    </Button>
                </div>
                )}

                <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge variant="outline">
                        {commandValue.channel === 'bm' ? 'BM' : 'Ptero'}:{' '}
                        {channelReady ? 'ready' : connectionState}
                    </Badge>
                    <Badge variant={wsLive ? 'default' : 'secondary'}>
                        Live output: {wsLive ? 'on' : connectionState === 'ws-unavailable' ? 'unavailable' : 'off'}
                    </Badge>
                    {serverStatus && <Badge variant="secondary">Server: {serverStatus}</Badge>}
                    {(connectionState === 'connecting' || connectionState === 'authenticating') && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                </div>

                {error && (
                    <Alert variant="destructive">
                        <AlertDescription className="whitespace-pre-wrap">{error}</AlertDescription>
                    </Alert>
                )}

                <div
                    ref={outputRef}
                    className="min-h-[280px] max-h-[50vh] overflow-y-auto rounded-md border bg-zinc-950 p-3 font-mono text-xs text-zinc-100 whitespace-pre-wrap break-words"
                >
                    {lines.length === 0 ? (
                        <span className="text-zinc-500">Connecting…</span>
                    ) : (
                        lines.map((line, i) => <div key={`${i}-${line.slice(0, 24)}`}>{line}</div>)
                    )}
                </div>

                <form
                    onSubmit={(e) => {
                        e.preventDefault()
                        void sendCommand()
                    }}
                >
                    <GameServerCommandField
                        serverId={serverId}
                        value={commandValue}
                        onChange={setCommandValue}
                        hasPterodactyl={hasPterodactyl}
                        bmEnabled={bmEnabled}
                        disabled={!channelReady}
                        showSendButton
                        onSend={sendCommand}
                        sending={sendingCommand}
                        label=""
                        description=""
                        commandPlaceholder={channelReady ? 'Enter command…' : 'Loading…'}
                    />
                </form>

                {(connectionState === 'ws-unavailable' || connectionState === 'ws-auth-failed') &&
                    consoleHint?.wingsConfig && (
                        <Alert>
                            <AlertDescription className="space-y-2 text-xs">
                                <p className="font-medium">Wings configuration (on each node)</p>
                                <p>
                                    Edit <code>/etc/pterodactyl/config.yml</code>, then{' '}
                                    <code>systemctl restart wings</code>:
                                </p>
                                <pre className="rounded bg-muted p-2 overflow-x-auto whitespace-pre-wrap font-mono">
                                    {consoleHint.wingsConfig}
                                </pre>
                                {consoleHint.docs && (
                                    <a
                                        href={consoleHint.docs}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary underline"
                                    >
                                        allowed_origins documentation
                                    </a>
                                )}
                            </AlertDescription>
                        </Alert>
                    )}

                {panelOrigin && (
                    <p className="text-xs text-muted-foreground">Panel: {panelOrigin}</p>
                )}
            </DialogContent>
        </Dialog>
    )
}
