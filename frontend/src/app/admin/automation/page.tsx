import { AutomationList } from '@/components/admin/automation/automation-list'
import { AutomationGate } from '@/app/admin/automation/automation-gate'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Automation',
    description: 'Automate server wipes, commands, and map vote results.',
}

export default async function AdminAutomationPage() {
    return (
        <AutomationGate>
            <AutomationList />
        </AutomationGate>
    )
}
