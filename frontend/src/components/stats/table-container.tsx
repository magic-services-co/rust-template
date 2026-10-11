"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useQueryState, parseAsInteger, parseAsBoolean } from "nuqs";
import { useDebouncedCallback } from "use-debounce";
import { StatsTable } from "./stats-table";
import { useLeaderboardTabs } from "@/hooks/use-leaderboard-tabs";
import { useLeaderboardTheme } from "@/hooks/use-leaderboard-theme";
import { LeaderboardSkeleton } from "./leaderboard-skeleton";
import { withLeaderboardDefaults } from "@/lib/leaderboard-theme-defaults";
import { LeaderboardTabIcon } from "./leaderboard-tab-icon";
import { LeaderboardTitles } from "@/components/leaderboard-titles";
import useServerData from "@/hooks/use-server-data";
import { useWipes } from "@/hooks/use-wipes";
import { useLeaderboardSettings } from "@/hooks/use-leaderboard-settings";
import { ServerCombobox } from "@/components/server-combobox";
import { WipeCombobox } from "@/components/wipe-combobox";
import { Switch } from "@/components/ui/switch";
import { Lock, Search } from "lucide-react";
import { parseISO, isValid, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { HomeCardCorners } from "@/components/home/home-card-corners";

interface StatsTableContainerProps {
  leaderboardTheme?: Record<string, unknown>;
}

const TAB_COPY: Record<string, { kicker: string; title: string }> = {
  pvp_stats: { kicker: "PVP RANKINGS", title: "Combat Dominance" },
  resources_stats: { kicker: "RESOURCES RANKINGS", title: "Harvest & Extraction" },
  explosives_stats: { kicker: "EXPLOSIVES RANKINGS", title: "Demolition" },
  farming_stats: { kicker: "FARMING RANKINGS", title: "Agriculture" },
  misc_stats: { kicker: "MISC RANKINGS", title: "Everything Else" },
  events_stats: { kicker: "EVENTS RANKINGS", title: "Server Events" },
  pve_stats: { kicker: "PVE RANKINGS", title: "Vs Environment" },
  gambling_stats: { kicker: "GAMBLING RANKINGS", title: "High Stakes" },
};

function formatWipeCountdown(iso?: string | null): string | undefined {
  if (!iso) return undefined;
  const date = parseISO(iso);
  if (!isValid(date)) return undefined;
  const ms = date.getTime() - Date.now();
  if (ms <= 0) return "WIPING";
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${d}D ${String(h).padStart(2, "0")}H ${String(m).padStart(2, "0")}M`;
}

export function StatsTableContainer({ leaderboardTheme: serverTheme }: StatsTableContainerProps) {
  const { data: tabs, isLoading, error } = useLeaderboardTabs();
  const { data: clientTheme } = useLeaderboardTheme();
  const { data: leaderboardSettings } = useLeaderboardSettings();
  const { serverList } = useServerData();

  const [activeTab, setActiveTab] = useQueryState("tab");
  const [selectedServer, setSelectedServer] = useQueryState("server");
  const [selectedWipeId, setSelectedWipeId] = useQueryState("wipeId", parseAsInteger);
  const [lockSort, setLockSort] = useQueryState("lockSort", parseAsBoolean.withDefault(false));
  const [searchQuery, setSearchQuery] = useQueryState("filter", {
    defaultValue: "",
    shallow: false,
    clearOnDefault: true,
  });

  const debouncedSetSearch = useDebouncedCallback((v: string) => setSearchQuery(v || null), 300);
  const [searchLocal, setSearchLocal] = useState(searchQuery ?? "");
  useEffect(() => {
    setSearchLocal(searchQuery ?? "");
  }, [searchQuery]);

  const theme = withLeaderboardDefaults(clientTheme || serverTheme);
  const showWipeSelection = leaderboardSettings?.showWipeSelection ?? true;
  const lifetime = !showWipeSelection || selectedWipeId === -1;

  const { data: wipesData } = useWipes(selectedServer ?? undefined, false);
  const wipes = wipesData?.data ?? [];

  const currentServerMeta = useMemo(() => {
    if (!selectedServer) return null;
    for (const q of serverList) {
      const s = q.data;
      if (!s) continue;
      if (s.server_id === selectedServer || s.id === selectedServer) return s;
    }
    return null;
  }, [selectedServer, serverList]);

  const selectedWipe = wipes.find((w) => w.id === selectedWipeId);
  const wipeNumber = useMemo(() => {
    if (lifetime || !selectedWipe) return null;
    const ordered = [...wipes].sort(
      (a, b) => new Date(a.started_at ?? 0).getTime() - new Date(b.started_at ?? 0).getTime(),
    );
    const index = ordered.findIndex((w) => w.id === selectedWipe.id);
    return index >= 0 ? index + 1 : selectedWipe.id;
  }, [wipes, selectedWipe, lifetime]);

  const serverTitle =
    currentServerMeta?.attributes.name ?? currentServerMeta?.name ?? "ALL SERVERS";
  const kicker = lifetime
    ? `${serverTitle.toUpperCase()} / LIFETIME`
    : wipeNumber != null
      ? `${serverTitle.toUpperCase()} / WIPE ${wipeNumber}`
      : serverTitle.toUpperCase();

  const nextWipeLabel =
    formatWipeCountdown(currentServerMeta?.attributes.details?.rust_next_wipe) || "TBD";
  const lastUpdated = selectedWipe?.started_at
    ? `Wipe started ${formatDistanceToNow(new Date(selectedWipe.started_at), { addSuffix: true })}`
    : "Last updated: just now";

  const currentTab =
    tabs?.find((tab) => tab.tabKey === activeTab) ?? tabs?.[0];
  const tabCopy = currentTab
    ? TAB_COPY[currentTab.tabKey] ?? {
        kicker: `${currentTab.tabLabel.toUpperCase()} RANKINGS`,
        title: currentTab.tabLabel,
      }
    : { kicker: "RANKINGS", title: "Leaderboard" };

  const inputStyle = {
    backgroundColor: "rgba(7, 11, 16, 0.6)",
    border: "1px solid rgba(134, 157, 180, 0.25)",
    color: "#edf5ff",
    borderRadius: "0px",
  } as React.CSSProperties;

  const serverSelectMin = 168
  const serverSelectMax = Math.round(serverSelectMin * 1.3)
  const comboboxTriggerClass =
    "h-9 shrink-0 justify-between px-2.5 py-1 text-[10px] font-medium shadow-none";

  if (isLoading || error) {
    return (
      <>
        <LeaderboardTitles serverTheme={theme} />
        <div className="pt-10">
          <LeaderboardSkeleton />
        </div>
      </>
    );
  }

  return (
    <div style={{ color: theme.textPrimaryColor }}>
      <LeaderboardTitles
        serverTheme={theme}
        kicker={kicker}
        nextWipeLabel={nextWipeLabel}
        lastUpdated={lastUpdated}
      />

      <div className="leaderboard-tab-scroller mt-9 grid grid-cols-2 border border-[rgba(134,157,180,0.18)] bg-[rgba(134,157,180,0.16)] p-px sm:grid-cols-4 xl:grid-cols-8">
        {tabs?.map((tab) => {
          const selected =
            activeTab === tab.tabKey || (!activeTab && tab.tabKey === tabs?.[0]?.tabKey);
          return (
            <button
              key={tab.tabKey}
              type="button"
              onClick={() => setActiveTab(tab.tabKey)}
              className={cn(
                "ghost leaderboard-tab flex h-[62px] items-center justify-center gap-1.5 px-3 text-[12px] font-medium",
                selected ? "leaderboard-tab-active" : "leaderboard-tab-idle",
              )}
            >
              <LeaderboardTabIcon
                tabKey={tab.tabKey}
                icon={tab.icon}
                className={cn("h-4 w-4 shrink-0", selected ? "text-[#f3d487]" : "text-[#ba9142]")}
              />
              {tab.tabLabel}
            </button>
          );
        })}
      </div>

      <article className="leaderboard-card relative mt-4 overflow-visible border">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: "linear-gradient(180deg, rgba(16,22,29,0.9) 0%, rgba(8,11,16,0.94) 100%)",
          }}
        />
        <div className="relative">
          <div className="flex items-end justify-between border-b border-[rgba(154,179,205,0.16)] px-[26px] pb-[19px] pt-[25px]">
            <div>
              <p className="font-mono text-[10px] font-medium tracking-[1.45px] text-[#ba9142]">
                {tabCopy.kicker}
              </p>
              <h2 className="pt-1 text-[21px] font-medium capitalize tracking-[-0.5px] text-[#edf5ff]">
                {tabCopy.title}
              </h2>
            </div>
          </div>

            <div className="flex flex-col gap-3 border-b border-[rgba(154,179,205,0.16)] bg-[rgba(3,5,8,0.18)] px-4 py-[13px] sm:px-[26px] lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <div className="shrink-0">
                <ServerCombobox
                  allowGlobal={false}
                  value={selectedServer}
                  triggerClassName={comboboxTriggerClass}
                  triggerStyle={inputStyle}
                  fitMinWidth={serverSelectMin}
                  fitMaxWidth={serverSelectMax}
                  onChange={(v) => setSelectedServer(v)}
                />
              </div>
              {showWipeSelection && selectedServer ? (
                <div className="w-[168px] shrink-0">
                  <WipeCombobox
                    value={selectedWipeId}
                    onChange={(id) => setSelectedWipeId(id)}
                    serverId={selectedServer}
                    showLifetime={true}
                    triggerClassName={comboboxTriggerClass}
                    triggerStyle={inputStyle}
                  />
                </div>
              ) : null}
              <label className="relative min-w-[180px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#ba9142]" />
                <input
                  type="search"
                  value={searchLocal}
                  placeholder="Search player"
                  className="support-form-input h-9 w-full border border-[rgba(134,157,180,0.18)] bg-[rgba(8,12,17,0.84)] pl-9 pr-3 text-[11px] outline-none"
                  onChange={(e) => {
                    const v = e.target.value;
                    setSearchLocal(v);
                    debouncedSetSearch(v);
                  }}
                />
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-[10px] tracking-[0.4px] text-[#93a4b8]">
                <Lock className={cn("h-3.5 w-3.5", lockSort ? "text-[#ba9142]" : "text-[#5c6b7c]")} />
                <span>Lock</span>
                <Switch
                  checked={lockSort === true}
                  onCheckedChange={(v) => setLockSort(v)}
                  className="data-[state=checked]:border-[#ba9142] data-[state=checked]:bg-[#ba9142]"
                />
              </label>
            </div>
            <p className="shrink-0 text-[9px] tracking-[0.55px] text-[rgba(159,184,207,0.52)]">
              LIVE RANKINGS
            </p>
          </div>

          {currentTab ? (
            <StatsTable
              tab={currentTab.tabKey}
              columnData={currentTab.columns}
              leaderboardTheme={theme}
              isActive
              hideFilterCard
              lockSort={lockSort === true}
            />
          ) : null}
        </div>
        <HomeCardCorners color="#ba9142" show />
      </article>
    </div>
  );
}
