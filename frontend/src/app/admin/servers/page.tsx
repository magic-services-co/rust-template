import { Suspense } from 'react'
import { AddServerForm } from '@/components/admin/servers/add-server-form'
import { AddCategoryForm } from '@/components/admin/servers/add-category-form'
import { PterodactylPanelSettings } from '@/components/admin/servers/pterodactyl-panel-settings'
import { ServerTagsButton, ServerTagsSettings } from '@/components/admin/servers/server-tags-settings'
import { CategoryList } from '@/components/admin/categories/category-list'
import { Metadata } from 'next'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { getServerSession } from '@/lib/get-server-session'
import { hasPermission, type RoleLike } from '@/lib/permissions/permissions'

export const metadata: Metadata = {
    title: 'Server Management',
    description: 'Manage servers.',
}

export default async function AdminServersPage() {
    const session = await getServerSession()
    if (!session?.user?.roles || !(await hasPermission((session?.user?.roles ?? undefined) as RoleLike[] | undefined, { resource: 'servers', action: 'manage' }))) {
        return (
            <div className="flex flex-col items-center justify-center gap-6 h-full">
                <h1 className="text-xl font-bold text-muted-foreground">You do not have permission to manage servers.</h1>
                <Button variant={"secondary"}>
                    <Link href="/admin">Go to admin dashboard</Link>
                </Button>
            </div>
        )
    }
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <h1 className="text-2xl font-bold">Server Management</h1>
                <PterodactylPanelSettings />
            </div>
            <Suspense fallback={<div className="animate-pulse space-y-4">
                <div className="h-12 bg-secondary/20 rounded-md" />
                <div className="h-12 bg-secondary/20 rounded-md" />
            </div>}>
                <div className="flex gap-4">
                    <AddCategoryForm />
                    <ServerTagsButton />
                    <AddServerForm />
                </div>
            </Suspense>
            <ServerTagsSettings />
            <Suspense fallback={<div className="animate-pulse">
                <div className="h-[400px] bg-secondary/20 rounded-md" />
            </div>}>
                <CategoryList />
            </Suspense>
        </div>
    )
}
