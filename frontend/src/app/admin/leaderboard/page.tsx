
import { Metadata } from 'next'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AdminLeaderboardSwitch } from '@/components/admin/admin-leaderboard-switch'
import { LeaderboardSettingsForm } from '@/components/admin/leaderboard-settings-form'
import { LeaderboardBuilder } from '@/components/admin/leaderboard-builder'
import { getServerSession } from '@/lib/get-server-session'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { hasPermission, type RoleLike } from '@/lib/permissions/permissions'

export const metadata: Metadata = {
    title: 'Leaderboard Management',
    description: 'Manage leaderboard tabs, metrics, and plugin sources.',
}


export default async function LeaderboardManagementPage() {
    const session = await getServerSession()
    if (!session?.user?.roles || !(await hasPermission((session?.user?.roles ?? undefined) as RoleLike[] | undefined, { resource: 'leaderboard', action: 'manage' }))) {
        return (
            <div className="flex flex-col items-center justify-center gap-6 h-full">
                <h1 className="text-xl font-bold text-muted-foreground">You do not have permission to manage the leaderboard.</h1>
                <Button variant={"secondary"}>
                    <Link href="/admin">Go to admin dashboard</Link>
                </Button>
            </div>
        )
    }
    return (
        <AdminLeaderboardSwitch>
            <div className="space-y-6">
                <h2 className="text-2xl font-bold">Leaderboard Management</h2>
                <Tabs defaultValue="builder" className="w-full">
                    <TabsList className="w-full">
                        <TabsTrigger value="builder" className="flex-1">Builder</TabsTrigger>
                        <TabsTrigger value="settings" className="flex-1">Settings</TabsTrigger>
                    </TabsList>
                    <TabsContent value="builder">
                        <LeaderboardBuilder />
                    </TabsContent>
                    <TabsContent value="settings">
                        <LeaderboardSettingsForm />
                    </TabsContent>
                </Tabs>
            </div>
        </AdminLeaderboardSwitch>
    )
}
