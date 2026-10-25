import { AutomationEditor } from '@/components/admin/automation/automation-editor'
import { AutomationGate } from '@/app/admin/automation/automation-gate'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Edit schedule',
}

export default async function EditAutomationPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    return (
        <AutomationGate>
            <AutomationEditor automationId={id} />
        </AutomationGate>
    )
}
