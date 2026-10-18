import type { Metadata } from "next"
import Link from "next/link"

import { DatabaseImportPanel } from "@/components/admin/database-import-panel"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
    title: "Import data",
    description: "Pull a v1 database into this site.",
}

export default function SystemControlImportPage() {
    return (
        <div className="space-y-6">
            <div>
                <Button variant="ghost" size="sm" className="text-muted-foreground -ml-2 mb-1 h-8 px-2" asChild>
                    <Link href="/admin/system-control">← System Control</Link>
                </Button>
                <h1 className="text-3xl font-bold">Import data</h1>
                <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
                    Pull rows from a v1 database into this v2 site. Players from the old players table are added onto users, so each person is one user.
                </p>
            </div>
            <DatabaseImportPanel />
        </div>
    )
}
