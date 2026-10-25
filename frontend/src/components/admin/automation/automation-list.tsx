'use client'

import { AutomationFormDialog } from '@/components/admin/automation/automation-form-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { deleteAutomation, fetchAutomations, runAutomationNow } from '@/lib/automation'
import type { AutomationTriggerType, ServerAutomation } from '@/types/automation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Loader2, MoreHorizontal, Pencil, Play, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

const triggerLabels: Record<AutomationTriggerType, string> = {
    schedule: 'Schedule',
    map_vote_end: 'Map vote ends',
    map_start: 'Map start',
}

function triggerSummary(automation: ServerAutomation): string {
    if (automation.triggerType === 'schedule' && automation.triggerAt) {
        return format(new Date(automation.triggerAt), 'PPp')
    }
    if (automation.mapVote) {
        const date =
            automation.triggerType === 'map_start'
                ? automation.mapVote.map_start
                : automation.mapVote.vote_end
        if (date) return format(new Date(date), 'PPp')
    }
    return triggerLabels[automation.triggerType]
}

export function AutomationList() {
    const queryClient = useQueryClient()
    const [formOpen, setFormOpen] = useState(false)
    const [editing, setEditing] = useState<ServerAutomation | null>(null)

    const { data, isLoading, error } = useQuery({
        queryKey: ['automations'],
        queryFn: fetchAutomations,
    })
    const automations = data?.automations ?? []
    const scheduler = data?.scheduler
    const schedulerStale = !scheduler?.lastTickAt
        || Date.now() - new Date(scheduler.lastTickAt).getTime() > (scheduler.intervalSeconds + 90) * 1000

    const runMutation = useMutation({
        mutationFn: runAutomationNow,
        onSuccess: (automation) => {
            queryClient.invalidateQueries({ queryKey: ['automations'] })
            toast.success(automation.lastRunNote || 'Automation ran successfully')
        },
        onError: (e: Error) => toast.error(e.message),
    })

    const deleteMutation = useMutation({
        mutationFn: deleteAutomation,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['automations'] })
            toast.success('Automation deleted')
        },
        onError: (e: Error) => toast.error(e.message),
    })

    const openCreate = () => {
        setEditing(null)
        setFormOpen(true)
    }

    const openEdit = (automation: ServerAutomation) => {
        setEditing(automation)
        setFormOpen(true)
    }

    if (error) {
        return <p className="text-destructive">Failed to load automations: {(error as Error).message}</p>
    }

    return (
        <>
            {!isLoading && schedulerStale && (
                <p className="mb-4 text-sm text-amber-600 dark:text-amber-400">
                    Scheduled automations have not been checked recently. Vote-end and timed triggers run once a minute from the server scheduler. Run now still runs immediately.
                </p>
            )}
            <div className="flex items-center justify-between gap-4 mb-6">
                <div>
                    <p className="text-sm text-muted-foreground">
                        Automate wipes, power actions, and map changes from vote results via Pterodactyl.
                    </p>
                </div>
                <Button onClick={openCreate}>
                    <Plus className="h-4 w-4 mr-2" />
                    New automation
                </Button>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : automations.length === 0 ? (
                <Card>
                    <CardHeader>
                        <CardTitle>No automations yet</CardTitle>
                        <CardDescription>
                            Create a workflow that stops the server, applies the winning map seed or URL, runs wipe commands, and starts again.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={openCreate}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create your first automation
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {automations.map((automation) => (
                        <Card key={automation.id} className={!automation.enabled ? 'opacity-60' : undefined}>
                            <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
                                <div>
                                    <CardTitle className="text-lg">{automation.name}</CardTitle>
                                    <CardDescription>
                                        {automation.server?.server_name ?? automation.serverId}
                                    </CardDescription>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => openEdit(automation)}>
                                            <Pencil className="h-4 w-4 mr-2" />
                                            Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => runMutation.mutate(automation.id)}
                                            disabled={runMutation.isPending}
                                        >
                                            <Play className="h-4 w-4 mr-2" />
                                            Run now
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            className="text-destructive"
                                            onClick={() => {
                                                if (confirm('Delete this automation?')) {
                                                    deleteMutation.mutate(automation.id)
                                                }
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex flex-wrap gap-2">
                                    <Badge variant="secondary">{triggerLabels[automation.triggerType]}</Badge>
                                    <Badge variant="outline">{automation.steps?.length ?? 0} steps</Badge>
                                    {!automation.enabled && <Badge variant="destructive">Disabled</Badge>}
                                    {automation.lastRunStatus === 'success' && (
                                        <Badge className="bg-green-600">Last run OK</Badge>
                                    )}
                                    {automation.lastRunStatus === 'failed' && (
                                        <Badge variant="destructive">Last run failed</Badge>
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Fires: {triggerSummary(automation)}
                                </p>
                                {automation.lastRunAt && (
                                    <p className="text-xs text-muted-foreground">
                                        Last run: {format(new Date(automation.lastRunAt), 'PPp')}
                                    </p>
                                )}
                                {automation.lastRunNote && (
                                    <p className="text-xs text-muted-foreground line-clamp-3">{automation.lastRunNote}</p>
                                )}
                                {automation.lastRunError && (
                                    <p className="text-xs text-destructive line-clamp-3">{automation.lastRunError}</p>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <AutomationFormDialog
                open={formOpen}
                onOpenChange={setFormOpen}
                automation={editing}
            />
        </>
    )
}
