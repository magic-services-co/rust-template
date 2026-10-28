import Link from "next/link"
import { Metadata } from "next"
import { VpsMetricsPanel } from "@/components/admin/vps-metrics-panel"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
    title: "System Control",
    description: "System control dashboard and integrations.",
}

export default function SystemControlDashboardPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">System Control</h1>
            <VpsMetricsPanel />
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4">
                <div>
                    <p className="font-medium">Addons</p>
                    <p className="text-muted-foreground text-sm">
                        Enable or disable Laravel modules and open their admin UI.
                    </p>
                </div>
                <Button variant="secondary" asChild>
                    <Link href="/admin/system-control/addons">Manage addons</Link>
                </Button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4">
                <div>
                    <p className="font-medium">Import data</p>
                    <p className="text-muted-foreground text-sm">
                        Pull a v1 database into this site. Merge it with what is here, or replace this site’s rows with the old ones.
                    </p>
                </div>
                <Button variant="secondary" asChild>
                    <Link href="/admin/system-control/import">Import data</Link>
                </Button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4">
                <div>
                    <p className="font-medium">MagicCore Plugin</p>
                    <p className="text-muted-foreground text-sm">
                        Download the Harmony mod or the Oxide/Carbon plugin, and read the changelog for each.
                    </p>
                </div>
                <Button variant="secondary" asChild>
                    <Link href="/admin/system-control/magiccore">Open</Link>
                </Button>
            </div>
        </div>
    )
}
