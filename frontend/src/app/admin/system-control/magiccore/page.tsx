import type { Metadata } from "next"
import Link from "next/link"

import { MagicCoreChangelog, MagicCoreDownloadButton } from "@/components/admin/magiccore-plugin"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
    title: "MagicCore Plugin",
    description: "Download the MagicCore Harmony mod or the Oxide/Carbon plugin, and read what changed.",
}

export default function MagicCorePluginPage() {
    return (
        <div className="space-y-6">
            <div>
                <Button variant="ghost" size="sm" className="text-muted-foreground -ml-2 mb-1 h-8 px-2" asChild>
                    <Link href="/admin/system-control">← System Control</Link>
                </Button>
                <h1 className="text-3xl font-bold">MagicCore Plugin</h1>
                <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
                    Install one build on each server. Both sync roles, bans, leaderboard stats, wipes, and the linked kit with this site.
                </p>
            </div>

            <div className="grid items-stretch gap-4 lg:grid-cols-2">
                <section className="flex flex-col gap-4 rounded-lg border p-4">
                    <div>
                        <h2 className="text-lg font-semibold">Harmony mod</h2>
                        <p className="text-muted-foreground mt-1 text-sm">
                            Put <span className="text-foreground">MagicCore.dll</span> in the server&apos;s <span className="text-foreground">HarmonyMods</span> folder, next to RustDedicated.exe. Set the site URL, server id, and API key in <span className="text-foreground">HarmonyMods_Data/MagicCore/MagicCore.json</span>.
                        </p>
                    </div>
                    <MagicCoreChangelog kind="harmony" />
                    <div className="mt-auto">
                        <MagicCoreDownloadButton kind="harmony" />
                    </div>
                </section>

                <section className="flex flex-col gap-4 rounded-lg border p-4">
                    <div>
                        <h2 className="text-lg font-semibold">Oxide / Carbon plugin</h2>
                        <p className="text-muted-foreground mt-1 text-sm">
                            Put <span className="text-foreground">MagicCore.cs</span> in <span className="text-foreground">oxide/plugins</span> or <span className="text-foreground">carbon/plugins</span>. The plugin writes its config to <span className="text-foreground">oxide/config/MagicCore.json</span> or <span className="text-foreground">carbon/configs/MagicCore.json</span>.
                        </p>
                    </div>
                    <MagicCoreChangelog kind="oxide" />
                    <div className="mt-auto">
                        <MagicCoreDownloadButton kind="oxide" />
                    </div>
                </section>
            </div>
        </div>
    )
}
