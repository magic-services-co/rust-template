import { BanList } from "@/components/admin/bans/ban-list"
import { Button } from "@/components/ui/button"
import { getServerSession } from "@/lib/get-server-session"
import { hasPermission, type RoleLike } from "@/lib/permissions/permissions"
import Link from "next/link"

export default async function BansPage() {
    const session = await getServerSession()
    if (!session?.user?.roles || !(await hasPermission((session?.user?.roles ?? undefined) as RoleLike[] | undefined, { resource: "bans", action: "manage" }))) {
        return (
            <div className="flex flex-col items-center justify-center gap-6 h-full">
                <h1 className="text-xl font-bold text-muted-foreground">You do not have permission to manage bans.</h1>
                <Button variant={"secondary"}>
                    <Link href="/admin">Go to admin dashboard</Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <BanList />
        </div>
    )
}
