'use client'

import { AutomationStepsEditor } from '@/components/admin/automation/automation-steps-editor'
import { ServerCombobox } from '@/components/server-combobox'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { TimePicker } from '@/components/time-picker'
import useServers from '@/hooks/use-servers'
import {
    createAutomation,
    fetchMapVotesForServer,
    updateAutomation,
} from '@/lib/automation'
import { cn } from '@/lib/utils'
import type {
    AutomationStep,
    AutomationTriggerType,
    ServerAutomation,
} from '@/types/automation'
import { wipeWorkflowTemplate } from '@/types/automation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { CalendarIcon, ChevronLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

const triggerLabels: Record<AutomationTriggerType, string> = {
    schedule: 'Scheduled date & time',
    map_vote_end: 'When map vote ends',
    map_start: 'When map goes live (map start)',
}

export function AutomationForm({ automation }: { automation: ServerAutomation | null }) {
    const router = useRouter()
    const queryClient = useQueryClient()
    const { data: categories = [] } = useServers()
    const servers = useMemo(
        () => categories.flatMap((c) => c.servers ?? []),
        [categories]
    )
    const isEdit = Boolean(automation?.id)

    const [name, setName] = useState(automation?.name ?? '')
    const [serverId, setServerId] = useState(automation?.serverId ?? '')
    const [enabled, setEnabled] = useState(automation?.enabled ?? true)
    const [triggerType, setTriggerType] = useState<AutomationTriggerType>(automation?.triggerType ?? 'map_vote_end')
    const [scheduleAt, setScheduleAt] = useState<Date | undefined>(
        automation?.triggerAt ? new Date(automation.triggerAt) : undefined
    )
    const [mapVoteId, setMapVoteId] = useState(automation?.mapVoteId ?? '')
    const [steps, setSteps] = useState<AutomationStep[]>(
        automation ? (automation.steps ?? []) : [...wipeWorkflowTemplate]
    )

    const selectedServer = useMemo(
        () => servers.find((s) => s.server_id === serverId),
        [servers, serverId]
    )
    const hasPterodactyl = Boolean(
        selectedServer?.pterodactyl_panel_id && selectedServer?.pterodactyl_server_identifier
    )

    const { data: mapVotes = [] } = useQuery({
        queryKey: ['automationMapVotes', serverId],
        queryFn: () => fetchMapVotesForServer(serverId),
        enabled: Boolean(serverId) && triggerType !== 'schedule',
    })

    const buildTriggerAt = (): string | null => {
        if (triggerType !== 'schedule' || !scheduleAt) return null
        return scheduleAt.toISOString()
    }

    const saveMutation = useMutation({
        mutationFn: async () => {
            const payload = {
                name: name.trim(),
                serverId,
                enabled,
                triggerType,
                triggerAt: buildTriggerAt(),
                mapVoteId: triggerType === 'schedule' ? null : mapVoteId || null,
                steps,
            }
            if (!payload.name) throw new Error('Name is required')
            if (!payload.serverId) throw new Error('Server is required')
            if (payload.steps.length === 0) throw new Error('Add at least one step')
            if (triggerType !== 'schedule' && !mapVoteId) {
                throw new Error('Select a map vote for this trigger')
            }
            if (triggerType === 'schedule' && !payload.triggerAt) {
                throw new Error('Pick a date and time for the schedule')
            }

            if (isEdit && automation) {
                return updateAutomation(automation.id, payload)
            }
            return createAutomation(payload)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['automations'] })
            toast.success(isEdit ? 'Schedule updated' : 'Schedule created')
            router.push('/admin/automation')
        },
        onError: (e: Error) => toast.error(e.message),
    })

    return (
        <div className="space-y-6">
            <div>
                <Button variant="ghost" size="sm" className="-ml-2 mb-2" asChild>
                    <Link href="/admin/automation">
                        <ChevronLeft className="mr-1 h-4 w-4" />
                        Schedules
                    </Link>
                </Button>
                <h1 className="text-2xl font-bold">{isEdit ? (name.trim() || 'Edit schedule') : 'New schedule'}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Chain power actions, console commands, and apply the winning map from a vote.
                </p>
            </div>

            <div className="space-y-6 rounded-md border bg-card p-4 sm:p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                        <Label>Name</Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Weekly wipe"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Server</Label>
                        <ServerCombobox
                            value={serverId}
                            onChange={setServerId}
                            align="start"
                            fallbackLabel={automation?.server?.server_name}
                        />
                    </div>
                    <div className="flex flex-col justify-end space-y-2">
                        <div className="flex h-10 items-center gap-2">
                            <Switch id="automation-enabled" checked={enabled} onCheckedChange={setEnabled} />
                            <Label htmlFor="automation-enabled" className="font-normal">
                                Enabled
                            </Label>
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Trigger</Label>
                    <Select
                        value={triggerType}
                        onValueChange={(v) => setTriggerType(v as AutomationTriggerType)}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="map_vote_end">{triggerLabels.map_vote_end}</SelectItem>
                            <SelectItem value="map_start">{triggerLabels.map_start}</SelectItem>
                            <SelectItem value="schedule">{triggerLabels.schedule}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {triggerType === 'schedule' ? (
                    <div className="space-y-2">
                        <Label>Date & time</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        'w-full justify-start text-left font-normal sm:max-w-md',
                                        !scheduleAt && 'text-muted-foreground'
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {scheduleAt ? format(scheduleAt, 'PPp') : 'Pick date and time'}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={scheduleAt}
                                    onSelect={(day) => {
                                        if (!day) {
                                            setScheduleAt(undefined)
                                            return
                                        }
                                        const next = scheduleAt ? new Date(scheduleAt) : new Date()
                                        next.setFullYear(day.getFullYear(), day.getMonth(), day.getDate())
                                        if (!scheduleAt) {
                                            next.setHours(12, 0, 0, 0)
                                        }
                                        setScheduleAt(next)
                                    }}
                                />
                                <div className="flex justify-center border-t border-border/15 p-3">
                                    <TimePicker date={scheduleAt} setDate={setScheduleAt} />
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <Label>Map vote</Label>
                        <Select value={mapVoteId} onValueChange={setMapVoteId} disabled={!serverId}>
                            <SelectTrigger className="sm:max-w-md">
                                <SelectValue placeholder={serverId ? 'Select map vote' : 'Select a server first'} />
                            </SelectTrigger>
                            <SelectContent>
                                {mapVotes.map((v) => (
                                    <SelectItem key={v.id} value={v.id}>
                                        Vote ends {format(new Date(v.vote_end), 'PPp')}
                                        {triggerType === 'map_start'
                                            ? ` · map ${format(new Date(v.map_start), 'PPp')}`
                                            : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {!hasPterodactyl && serverId && (
                    <p className="text-sm text-amber-600 dark:text-amber-500">
                        Link a panel server in Server Management for power actions and startup variables.
                    </p>
                )}

                {hasPterodactyl && (
                    <p className="text-sm text-muted-foreground">
                        Startup variable names for map wipes are configured on the linked panel (Server Management → panel settings).
                    </p>
                )}

                <AutomationStepsEditor
                    serverId={serverId}
                    steps={steps}
                    onChange={setSteps}
                    hasPterodactyl={hasPterodactyl}
                    disabled={saveMutation.isPending}
                />

                {!isEdit && (
                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setSteps([...wipeWorkflowTemplate])}
                    >
                        Load wipe workflow template
                    </Button>
                )}
            </div>

            <div className="flex justify-end gap-2">
                <Button variant="outline" asChild>
                    <Link href="/admin/automation">Cancel</Link>
                </Button>
                <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                    {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isEdit ? 'Save' : 'Create'}
                </Button>
            </div>
        </div>
    )
}
