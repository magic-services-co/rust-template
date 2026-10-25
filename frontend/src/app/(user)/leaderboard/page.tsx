import { PublicFrontSwitch } from "@/lib/public-front";
import { StatsTableContainer } from "@/components/stats/table-container";
import { LeaderboardThemeProvider } from "@/components/leaderboard-theme-provider";
import { SupportPageShell } from "@/components/support/support-page-shell";
import { Suspense } from "react";
import { getMetadata } from "@/lib/metadata";
import { backendApi } from "@/lib/api";
import { parsePageTheme } from "@/lib/parse-page-theme";
import { withLeaderboardDefaults } from "@/lib/leaderboard-theme-defaults";

export const revalidate = 60;

export async function generateMetadata() {
  return await getMetadata("leaderboard");
}

export default async function Page() {
  const res = await fetch(backendApi("data?include=pageTheme:leaderboard"), {
    headers: { Accept: "application/json" },
    next: { revalidate: 60, tags: ["public-pages"] },
  });
  const data = res.ok ? await res.json() : {};
  const pageTheme = data.pageTheme;
  const raw = parsePageTheme(
    pageTheme && "settings" in pageTheme ? pageTheme.settings : undefined,
    "leaderboard",
  );
  const theme = withLeaderboardDefaults(raw);

  return (
    <PublicFrontSwitch name="leaderboard" slotProps={{ section: "casual" }}>
      <LeaderboardThemeProvider>
        <SupportPageShell>
          <Suspense>
            <StatsTableContainer leaderboardTheme={theme} />
          </Suspense>
        </SupportPageShell>
      </LeaderboardThemeProvider>
    </PublicFrontSwitch>
  );
}
