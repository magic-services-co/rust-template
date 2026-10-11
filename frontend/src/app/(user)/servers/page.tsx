import { backendApi } from "@/lib/api";
import { Suspense } from "react";
import { getMetadata } from "@/lib/metadata";
import { ServersPageClient } from "./servers-page-client";
import { buildServersPageThemeFromApiPayloads } from "@/lib/merge-servers-leaderboard-theme";

export async function generateMetadata() {
  return await getMetadata("servers");
}

export default async function Page() {
  const [serversRes, leaderboardRes] = await Promise.all([
    fetch(backendApi("data?include=pageTheme:servers"), {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 },
    }),
    fetch(backendApi("data?include=pageTheme:leaderboard"), {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 },
    }),
  ]);

  const serversData = serversRes.ok ? await serversRes.json() : {};
  const leaderboardData = leaderboardRes.ok ? await leaderboardRes.json() : {};
  const theme = buildServersPageThemeFromApiPayloads(serversData, leaderboardData);

  return <ServersPageClient theme={theme} />;
}
