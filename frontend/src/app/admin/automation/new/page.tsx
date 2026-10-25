import { AutomationForm } from '@/components/admin/automation/automation-form'
import { AutomationGate } from '@/app/admin/automation/automation-gate'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'New schedule',
}

export default async function NewAutomationPage() {
    return (
        <AutomationGate>
            <AutomationForm automation={null} />
        </AutomationGate>
    )
}
