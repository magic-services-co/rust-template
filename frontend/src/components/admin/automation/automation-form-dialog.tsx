'use client'

import { AutomationStepsEditor } from '@/components/admin/automation/automation-steps-editor'
import { ServerCombobox } from '@/components/server-combobox'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
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
import { CalendarIcon, Loader2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

type Props = {
    open: boolean
    onOpenChange: (open: boolean) => void
    automation?: ServerAutomation | null
}

export function AutomationFormDialog({ open, onOpenChange, automation }: Props) {
    const queryClient = useQueryClient()
    const { data: categories = [] } = useServers()
    const servers = useMemo(
        () => categories.flatMap((c) => c.servers ?? []),
        [categories]
    )
    const isEdit = Boolean(automation?.id)

    const [name, setName] = useState('')
    const [serverId, setServerId] = useState('')
    const [enabled, setEnabled] = useState(true)
    const [triggerType, setTriggerType] = useState<AutomationTriggerType>('map_vote_end')
    const [scheduleAt, setScheduleAt] = useState<Date | undefined>()
    const [mapVoteId, setMapVoteId] = useState('')
    const [steps, setSteps] = useState<AutomationStep[]>([])

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
        enabled: open && Boolean(serverId) && triggerType !== 'schedule',
    })

    useEffect(() => {
        if (!open) return
        if (automation) {
            setName(automation.name)
            setServerId(automation.serverId)
            setEnabled(automation.enabled)
            setTriggerType(automation.triggerType)
            setMapVoteId(automation.mapVoteId ?? '')
            setSteps(automation.steps ?? [])
            setScheduleAt(automation.triggerAt ? new Date(automation.triggerAt) : undefined)
        } else {
            setName('')
            setServerId('')
            setEnabled(true)
            setTriggerType('map_vote_end')
            setMapVoteId('')
            setSteps([...wipeWorkflowTemplate])
            setScheduleAt(undefined)
        }
    }, [open, automation])

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
            toast.success(isEdit ? 'Automation updated' : 'Automation created')
            onOpenChange(false)
        },
        onError: (e: Error) => toast.error(e.message),
    })

    const triggerLabels: Record<AutomationTriggerType, string> = {
        schedule: 'Scheduled date & time',
        map_vote_end: 'When map vote ends',
        map_start: 'When map goes live (map start)',
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEdit ? 'Edit automation' : 'New automation'}</DialogTitle>
                    <DialogDescription>
                        Chain power actions, console commands, and apply the winning map from a vote to Pterodactyl startup variables.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-2">
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
                                modal
                                popoverContentClassName="z-[250]"
                            />
                        </div>
                        <div className="space-y-2 flex flex-col justify-end">
                            <div className="flex items-center gap-2 h-10">
                                <Switch id="enabled" checked={enabled} onCheckedChange={setEnabled} />
                                <Label htmlFor="enabled" className="font-normal">
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
                            <SelectContent className="z-[250]">
                                <SelectItem value="map_vote_end">{triggerLabels.map_vote_end}</SelectItem>
                                <SelectItem value="map_start">{triggerLabels.map_start}</SelectItem>
                                <SelectItem value="schedule">{triggerLabels.schedule}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {triggerType === 'schedule' ? (
                        <div className="space-y-2">
                            <Label>Date & time</Label>
                                <Popover modal>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                'w-full justify-start text-left font-normal',
                                                !scheduleAt && 'text-muted-foreground'
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {scheduleAt ? format(scheduleAt, 'PPp') : 'Pick date and time'}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="z-[250] w-auto p-0" align="start">
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
                                        <div className="flex justify-center p-3 border-t border-border/15">
                                            <TimePicker date={scheduleAt} setDate={setScheduleAt} />
                                        </div>
                                    </PopoverContent>
                                </Popover>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <Label>Map vote</Label>
                            <Select value={mapVoteId} onValueChange={setMapVoteId} disabled={!serverId}>
                                <SelectTrigger>
                                    <SelectValue placeholder={serverId ? 'Select map vote' : 'Select a server first'} />
                                </SelectTrigger>
                                <SelectContent className="z-[250]">
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

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                        {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        {isEdit ? 'Save' : 'Create'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
