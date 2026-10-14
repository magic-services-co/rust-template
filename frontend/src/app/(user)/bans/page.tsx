import { BansList } from "@/components/bans/bans-list"
import { BansThemeProvider, type BansTheme } from "@/components/bans-theme-provider"
import { BansTitles } from "@/components/bans-titles"
import { SupportPageShell } from "@/components/support/support-page-shell"
import { ProfileEmpty } from "@/components/profile/profile-ui"
import { Suspense } from "react"
import { getMetadata } from "@/lib/metadata"
import { backendApi } from "@/lib/api"

export async function generateMetadata() {
  return await getMetadata('bans');
}

export default async function BansPage() {
    const res = await fetch(backendApi("data?include=pageTheme:bans"), { headers: { Accept: "application/json" }, next: { revalidate: 60, tags: ["public-pages"] } });
    const data = res.ok ? await res.json() : {};
    const pageTheme = data.pageTheme;

    const rawSettings = pageTheme && typeof pageTheme === "object" && "settings" in pageTheme ? pageTheme.settings : null;
    const settings = typeof rawSettings === "string" ? (() => { try { return JSON.parse(rawSettings); } catch { return {}; } })() : rawSettings;
    const theme: BansTheme | undefined = settings && typeof settings === "object" ? (settings as { bans?: BansTheme }).bans : undefined;

    if (!pageTheme || !(pageTheme as { enabled?: boolean }).enabled) {
        return (
            <BansThemeProvider serverTheme={theme}>
                <SupportPageShell>
                    <BansTitles serverTheme={theme} />
                    <div className="pt-10">
                        <ProfileEmpty
                            kicker="OFFLINE"
                            title="PAGE DISABLED"
                            body="This page is currently disabled by an administrator."
                        />
                    </div>
                </SupportPageShell>
            </BansThemeProvider>
        );
    }

    return (
        <BansThemeProvider serverTheme={theme}>
            <SupportPageShell>
                <BansTitles serverTheme={theme} />
                <div className="pt-10">
                    <Suspense>
                        <BansList />
                    </Suspense>
                </div>
            </SupportPageShell>
        </BansThemeProvider>
    )
}
