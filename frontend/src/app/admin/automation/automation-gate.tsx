import { Button } from '@/components/ui/button'
import { getServerSession } from '@/lib/get-server-session'
import { hasPermission, type RoleLike } from '@/lib/permissions/permissions'
import Link from 'next/link'

export async function AutomationGate({ children }: { children: React.ReactNode }) {
    const session = await getServerSession()
    const roles = (session?.user?.roles ?? undefined) as RoleLike[] | undefined
    const allowed =
        (await hasPermission(roles, { resource: 'automation', action: 'manage' })) ||
        (await hasPermission(roles, { resource: 'servers', action: 'manage' }))

    if (!session?.user?.roles || !allowed) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-6">
                <h1 className="text-xl font-bold text-muted-foreground">
                    You do not have permission to manage automation.
                </h1>
                <Button variant="secondary" asChild>
                    <Link href="/admin">Go to admin dashboard</Link>
                </Button>
            </div>
        )
    }

    return children
}
