import MapViewContainer from "@/components/maps/map/map-view-container";
import { getMetadata } from "@/lib/metadata";
import { backendApi } from "@/lib/api";
import { MapsThemeProvider } from "@/components/maps-theme-provider";
import { SupportPageShell } from "@/components/support/support-page-shell";
import { parsePageTheme } from "@/lib/parse-page-theme";
import { ErrorCta, ErrorPage } from "@/components/error-page";

export async function generateMetadata() {
    return await getMetadata("maps");
}

export default async function MapsViewPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: rawId } = await params;
    const id = typeof rawId === "string" ? rawId : "";
    const res = await fetch(backendApi("data?include=themeSettings,pageTheme:maps"), { headers: { Accept: "application/json" }, next: { revalidate: 60, tags: ["public-pages"] } });
    const data = res.ok ? await res.json() : {};
    const pageTheme = data.pageTheme;
    const rawSettings = pageTheme && "settings" in pageTheme ? pageTheme.settings : null;
    const settings = typeof rawSettings === "string" ? (() => { try { return JSON.parse(rawSettings); } catch { return {}; } })() : rawSettings;
    const theme = parsePageTheme(settings, "maps");

    if (!id) {
        return (
            <ErrorPage
                kicker="MAP VOTES"
                title="INVALID"
                titleAccent="LINK"
                subtitle="This map vote link is missing or malformed."
                actions={
                    <>
                        <ErrorCta href="/maps">ALL MAP VOTES</ErrorCta>
                        <ErrorCta href="/servers" variant="secondary">
                            VIEW SERVERS
                        </ErrorCta>
                    </>
                }
            />
        );
    }

    return (
        <MapsThemeProvider serverTheme={theme}>
            <SupportPageShell>
                <MapViewContainer id={id} theme={theme} />
            </SupportPageShell>
        </MapsThemeProvider>
    );
}
