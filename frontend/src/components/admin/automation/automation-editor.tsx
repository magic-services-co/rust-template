'use client'

import { AutomationForm } from '@/components/admin/automation/automation-form'
import { Button } from '@/components/ui/button'
import { fetchAutomations } from '@/lib/automation'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'

export function AutomationEditor({ automationId }: { automationId: string }) {
    const { data, isLoading, error } = useQuery({
        queryKey: ['automations'],
        queryFn: fetchAutomations,
    })
    const automation = data?.automations.find((item) => item.id === automationId) ?? null

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (error) {
        return <p className="text-destructive">Failed to load this schedule: {(error as Error).message}</p>
    }

    if (!automation) {
        return (
            <div className="space-y-4">
                <p className="font-medium">This schedule no longer exists.</p>
                <Button variant="secondary" asChild>
                    <Link href="/admin/automation">Back to schedules</Link>
                </Button>
            </div>
        )
    }

    return <AutomationForm key={automation.id} automation={automation} />
}
