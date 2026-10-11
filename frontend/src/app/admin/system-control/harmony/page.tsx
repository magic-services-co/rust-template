import type { Metadata } from "next"
import Link from "next/link"

import { HarmonyModDownloadButton, HarmonyModRelease } from "@/components/admin/harmony-mod-download"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
    title: "Harmony mod",
    description: "Download the MagicCore Harmony mod.",
}

export default function HarmonyModPage() {
    return (
        <div className="space-y-6">
            <div>
                <Button variant="ghost" size="sm" className="text-muted-foreground -ml-2 mb-1 h-8 px-2" asChild>
                    <Link href="/admin/system-control">← System Control</Link>
                </Button>
                <h1 className="text-3xl font-bold">Harmony mod</h1>
            </div>
            <div className="max-w-2xl space-y-4 rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">
                    MagicCore syncs leaderboard stats, linked roles, and bans with this site. Put <span className="text-foreground">MagicCore.dll</span> in the server&apos;s <span className="text-foreground">HarmonyMods</span> folder, next to RustDedicated.exe, then set the site URL, server id, and API key in <span className="text-foreground">HarmonyMods/MagicCore.json</span>.
                </p>
                <HarmonyModRelease />
                <HarmonyModDownloadButton />
            </div>
        </div>
    )
}
