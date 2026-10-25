'use client'

import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import type { AutomationTriggerType, ServerAutomation } from '@/types/automation'
import { format, formatDistanceToNow } from 'date-fns'
import { Loader2, Play, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

const triggerLabels: Record<AutomationTriggerType, string> = {
    schedule: 'Set time',
    map_vote_end: 'Map vote ends',
    map_start: 'Map goes live',
}

function triggerAt(automation: ServerAutomation): Date | null {
    if (automation.triggerType === 'schedule' && automation.triggerAt) {
        return new Date(automation.triggerAt)
    }
    const raw =
        automation.triggerType === 'map_start'
            ? automation.mapVote?.map_start
            : automation.mapVote?.vote_end
    return raw ? new Date(raw) : null
}

export function ScheduleRow({
    automation,
    running,
    onRun,
    onDelete,
    onToggle,
    toggling,
}: {
    automation: ServerAutomation
    running: boolean
    toggling: boolean
    onRun: () => void
    onDelete: () => void
    onToggle: (enabled: boolean) => void
}) {
    const router = useRouter()
    const when = triggerAt(automation)
    const taskCount = (automation.steps ?? []).filter((step) => step.type !== 'delay').length
    const lastRun = automation.lastRunAt ? new Date(automation.lastRunAt) : null
    const openEditor = () => router.push(`/admin/automation/${automation.id}`)

    return (
        <section
            className={`cursor-pointer rounded-md border bg-card transition-colors hover:border-foreground/25 ${automation.enabled ? '' : 'opacity-70'}`}
            role="link"
            tabIndex={0}
            onClick={openEditor}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    openEditor()
                }
            }}
        >
            <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1">
                    <h2 className="truncate text-base font-semibold">{automation.name}</h2>
                    <p className="truncate text-sm text-muted-foreground">
                        {automation.server?.server_name ?? automation.serverId}
                        {' · '}
                        {taskCount === 1 ? '1 task' : `${taskCount} tasks`}
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-6 sm:w-80">
                    <div>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Last run</p>
                        <p className="text-sm" title={lastRun ? format(lastRun, 'PPpp') : undefined}>
                            {lastRun ? formatDistanceToNow(lastRun, { addSuffix: true }) : 'Never'}
                        </p>
                        {automation.lastRunStatus === 'success' && (
                            <p className="text-xs text-green-600 dark:text-green-500">Successful</p>
                        )}
                        {automation.lastRunStatus === 'failed' && (
                            <p className="text-xs text-destructive">Failed</p>
                        )}
                    </div>
                    <div>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Next run</p>
                        <p className="text-sm" title={when ? format(when, 'PPpp') : undefined}>
                            {when
                                ? when.getTime() > Date.now()
                                    ? formatDistanceToNow(when, { addSuffix: true })
                                    : format(when, 'PPp')
                                : 'Not set'}
                        </p>
                        <p className="text-xs text-muted-foreground">{triggerLabels[automation.triggerType]}</p>
                    </div>
                </div>
                <div
                    className="flex items-center gap-1 sm:pt-1"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                >
                    <Switch
                        checked={automation.enabled}
                        disabled={toggling}
                        onCheckedChange={onToggle}
                        aria-label={automation.enabled ? 'Disable schedule' : 'Enable schedule'}
                    />
                    <Button variant="ghost" size="icon" onClick={onRun} disabled={running} title="Run now">
                        {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={onDelete} title="Delete">
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                </div>
            </div>

            {(automation.lastRunNote || automation.lastRunError) && (
                <p className={`px-4 pb-4 text-xs ${automation.lastRunError ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {automation.lastRunError || automation.lastRunNote}
                </p>
            )}
        </section>
    )
}
