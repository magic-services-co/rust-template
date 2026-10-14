import MapsContainer from "@/components/maps/maps-container";
import { getMetadata } from "@/lib/metadata";
import { backendApi } from "@/lib/api";
import { MapsThemeProvider } from "@/components/maps-theme-provider";
import { MapsTitles } from "@/components/maps-titles";
import { SupportPageShell } from "@/components/support/support-page-shell";
import { parsePageTheme } from "@/lib/parse-page-theme";

export const revalidate = 600;

export async function generateMetadata() {
  return await getMetadata("maps");
}

export default async function MapsPage() {
    const res = await fetch(backendApi("data?include=themeSettings,pageTheme:maps"), { headers: { Accept: "application/json" }, next: { revalidate: 60, tags: ["public-pages"] } });
    const data = res.ok ? await res.json() : {};
    const pageTheme = data.pageTheme;
    const theme = parsePageTheme(pageTheme && "settings" in pageTheme ? pageTheme.settings : undefined, "maps");

    return (
        <MapsThemeProvider serverTheme={theme}>
            <SupportPageShell>
                <MapsTitles serverTheme={theme} />
                <div className="pt-10">
                    <MapsContainer serverTheme={theme} />
                </div>
            </SupportPageShell>
        </MapsThemeProvider>
    );
}
