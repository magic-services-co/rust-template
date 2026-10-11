"use client";

import ServerList from "./server-list";
import { ServerThemeProvider } from "@/components/server-theme-provider";
import { ServerTitles } from "@/components/server-titles";
import { LeaderboardThemeProvider } from "@/components/leaderboard-theme-provider";
import { SupportPageShell } from "@/components/support/support-page-shell";

export type ServersPageClientProps = {
  theme: Record<string, unknown>;
};

export function ServersPageClient({ theme }: ServersPageClientProps) {
  return (
    <LeaderboardThemeProvider>
      <ServerThemeProvider serverTheme={theme}>
        <SupportPageShell>
          <ServerTitles serverTheme={theme} />
          <ServerList serverTheme={theme} />
        </SupportPageShell>
      </ServerThemeProvider>
    </LeaderboardThemeProvider>
  );
}
