'use client'

import { ScheduleRow } from '@/components/admin/automation/schedule-row'
import { Button } from '@/components/ui/button'
import { deleteAutomation, fetchAutomations, runAutomationNow, updateAutomation } from '@/lib/automation'
import type { ServerAutomation } from '@/types/automation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export function AutomationList() {
    const queryClient = useQueryClient()

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
            toast.success(automation.lastRunNote || 'Schedule ran successfully')
        },
        onError: (e: Error) => toast.error(e.message),
    })

    const deleteMutation = useMutation({
        mutationFn: deleteAutomation,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['automations'] })
            toast.success('Schedule deleted')
        },
        onError: (e: Error) => toast.error(e.message),
    })

    const toggleMutation = useMutation({
        mutationFn: ({ automation, enabled }: { automation: ServerAutomation; enabled: boolean }) =>
            updateAutomation(automation.id, {
                name: automation.name,
                serverId: automation.serverId,
                enabled,
                triggerType: automation.triggerType,
                triggerAt: automation.triggerAt ?? null,
                mapVoteId: automation.mapVoteId ?? null,
                steps: automation.steps ?? [],
            }),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['automations'] })
            toast.success(variables.enabled ? 'Schedule enabled' : 'Schedule disabled')
        },
        onError: (e: Error) => toast.error(e.message),
    })

    if (error) {
        return <p className="text-destructive">Failed to load schedules: {(error as Error).message}</p>
    }

    return (
        <>
            <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Automation</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Schedules that power the server, run commands, and apply the winning map.
                    </p>
                </div>
                <Button asChild>
                    <Link href="/admin/automation/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Create schedule
                    </Link>
                </Button>
            </div>

            {!isLoading && schedulerStale && (
                <p className="mb-4 text-sm text-amber-600 dark:text-amber-400">
                    The scheduler has not checked in recently. Timed and vote-end schedules run about once a minute. Run now still starts a schedule immediately.
                </p>
            )}

            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : automations.length === 0 ? (
                <div className="rounded-md border border-dashed px-6 py-12 text-center">
                    <p className="font-medium">No schedules</p>
                    <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                        Create a schedule that stops the server, applies the winning map, and starts it again.
                    </p>
                    <Button className="mt-4" asChild>
                        <Link href="/admin/automation/new">
                            <Plus className="mr-2 h-4 w-4" />
                            Create schedule
                        </Link>
                    </Button>
                </div>
            ) : (
                <div className="space-y-4">
                    {automations.map((automation) => (
                        <ScheduleRow
                            key={automation.id}
                            automation={automation}
                            running={runMutation.isPending && runMutation.variables === automation.id}
                            toggling={toggleMutation.isPending && toggleMutation.variables?.automation.id === automation.id}
                            onRun={() => runMutation.mutate(automation.id)}
                            onDelete={() => {
                                if (confirm(`Delete schedule “${automation.name}”?`)) {
                                    deleteMutation.mutate(automation.id)
                                }
                            }}
                            onToggle={(enabled) => toggleMutation.mutate({ automation, enabled })}
                        />
                    ))}
                </div>
            )}
        </>
    )
}
