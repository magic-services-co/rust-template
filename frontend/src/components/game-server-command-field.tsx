'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    type GameServerCommandAction,
    type GameServerCommandChannel,
    type GameServerCommandValue,
    type RoleGrantCommandValue,
} from '@/lib/game-server-command'
import { Loader2 } from 'lucide-react'

export type GameServerCommandFieldProps = {
    serverId?: string | null
    value: GameServerCommandValue
    onChange: (value: GameServerCommandValue) => void
    hasPterodactyl?: boolean
    bmEnabled?: boolean
    disabled?: boolean
    showSendButton?: boolean
    onSend?: () => void | Promise<void>
    sending?: boolean
    label?: string
    description?: string
    commandPlaceholder?: string
    className?: string
    /** Show Add / Revoke selector (role automation only). */
    showActionSelector?: boolean
}

export function GameServerCommandField({
    serverId,
    value,
    onChange,
    hasPterodactyl = false,
    bmEnabled = true,
    disabled = false,
    showSendButton = false,
    onSend,
    sending = false,
    label = 'Grant command',
    description = 'Runs once when a user receives this role.',
    commandPlaceholder = 'e.g. oxide.usergroup add {steamid} vip',
    className,
    showActionSelector = false,
}: GameServerCommandFieldProps) {
    const serverSelected = Boolean(serverId && serverId.trim() !== '')
    const channelDisabled = disabled || !serverSelected || sending

    const effectiveChannel: GameServerCommandChannel =
        value.channel === 'ptero' && !hasPterodactyl
            ? 'bm'
            : value.channel === 'bm' && !bmEnabled && hasPterodactyl
              ? 'ptero'
              : value.channel

    return (
        <div className={className ?? 'space-y-2'}>
            {label && (
                <div>
                    <Label className="text-sm font-medium">{label}</Label>
                    {description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                    )}
                </div>
            )}
            <div className="flex gap-2">
                <Select
                    value={effectiveChannel}
                    onValueChange={(ch) =>
                        onChange({ ...value, channel: ch as GameServerCommandChannel })
                    }
                    disabled={channelDisabled}
                >
                    <SelectTrigger className="w-[100px] shrink-0 font-mono text-sm">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ptero" disabled={!hasPterodactyl}>
                            Panel
                        </SelectItem>
                        <SelectItem value="bm" disabled={!bmEnabled}>
                            BM
                        </SelectItem>
                    </SelectContent>
                </Select>
                {showActionSelector && (
                    <Select
                        value={(value as RoleGrantCommandValue).action ?? 'add'}
                        onValueChange={(action) =>
                            onChange({
                                ...value,
                                action: action as GameServerCommandAction,
                            } as RoleGrantCommandValue)
                        }
                        disabled={channelDisabled}
                    >
                        <SelectTrigger className="w-[96px] shrink-0 font-mono text-sm">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="add">Add</SelectItem>
                            <SelectItem value="revoke">Revoke</SelectItem>
                        </SelectContent>
                    </Select>
                )}
                <Input
                    value={value.command}
                    onChange={(e) => onChange({ ...value, command: e.target.value })}
                    placeholder={
                        serverSelected ? commandPlaceholder : 'Select a server first…'
                    }
                    disabled={channelDisabled}
                    className="font-mono text-sm flex-1"
                    autoComplete="off"
                />
                {showSendButton && onSend && (
                    <Button
                        type="button"
                        disabled={channelDisabled || !value.command.trim()}
                        onClick={() => void onSend()}
                    >
                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
                    </Button>
                )}
            </div>
        </div>
    )
}
