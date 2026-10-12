/**
 * Deterministic demo data for the leaderboard when
 * NEXT_PUBLIC_LEADERBOARD_FAKE_DATA=true. Keeps pagination, sort, and filter working client-side.
 */

import type { KillHeatmapPoint } from "@/lib/leaderboard-kill-heatmap";

const TOTAL_PLAYERS = 96;

const NAMES = [
  "RoofCamper2000",
  "CargoEnjoyer",
  "SulfurSniffer",
  "eoka_1tap",
  "CompoundBowEnjoyer",
  "NoRoofLeftBehind",
  "DeepSeaDiva",
  "BradleyTaxOffice",
  "HeliHelpless",
  "FarmingSimulator",
  "ZerglingPrime",
  "SoloTryhard",
  "SleepingBagCEO",
  "CodeLockArtist",
  "DoorCamperDan",
  "RocketMan_Rust",
  "HVHopeful",
  "JackhammerJim",
  "OutpostEnjoyer",
  "BanditBaron",
  "OilRigRegular",
  "UnderwaterMenace",
  "TrainEnjoyer",
  "HorseGirlRust",
  "BearBaitBob",
  "WolfWhisperer",
  "RecyclerEnjoyer",
  "TCDestroyedYou",
  "SoftSideScholar",
  "SheetMetalSheila",
  "HighExternalHarry",
  "TrapBaseTerry",
  "ShotgunTrapSteve",
  "SAMSiteSam",
  "AutoTurretAndy",
  "WorkbenchWendy",
  "Tier3Tommy",
  "ResearchTableRick",
  "MixingTableMia",
  "LargeFurnaceLarry",
  "IndustrialIan",
];

/** Item shortnames only (never numeric item ids). */
function randomFavoriteWeaponShortname(rng: () => number): string {
  return rng() < 0.5 ? "rifle.ak" : "smg.mp5";
}

/** Matches plugin killInfo / C# KillInfo (PascalCase keys). */
export type FakeKillInfoEntry = {
  GridLocation: { x: number; y: number };
  WeaponUsed: string | null;
  Type: "Player" | "Npc";
};

const WEAPON_POOL = ["rifle.ak", "smg.mp5", "pistol.python", "crossbow", "shotgun.pump"];

function randomKillInfoBatch(rng: () => number, killBudget: number): FakeKillInfoEntry[] {
  const n = Math.min(120, Math.max(4, Math.floor(killBudget / 40)));
  const list: FakeKillInfoEntry[] = [];
  for (let j = 0; j < n; j++) {
    const isNpc = rng() < 0.38;
    list.push({
      GridLocation: {
        x: Number((rng() * 49 + 0.25).toFixed(2)),
        y: Number((rng() * 49 + 0.25).toFixed(2)),
      },
      WeaponUsed: isNpc && rng() < 0.45 ? null : WEAPON_POOL[Math.floor(rng() * WEAPON_POOL.length)]!,
      Type: isNpc ? "Npc" : "Player",
    });
  }
  return list;
}

function hashSeed(parts: string[]): number {
  let h = 2166136261;
  const s = parts.join("|");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function steamIdForIndex(i: number, seed: number): string {
  const base = BigInt("76561198000000000");
  const n = base + BigInt((i * 97_651 + seed) % 40_000_000);
  return n.toString();
}

function intBetween(rng: () => number, lo: number, hi: number): number {
  return Math.floor(rng() * (hi - lo + 1)) + lo;
}

function buildRowForTab(
  tab: string,
  i: number,
  rng: () => number,
  steam_id: string,
  username: string,
): Record<string, unknown> {
  const base = { steam_id, username };

  switch (tab) {
    case "pvp_stats": {
      const kills = intBetween(rng, 5, 4200);
      const deaths = Math.max(1, intBetween(rng, 1, Math.max(2, kills)));
      const headshots = intBetween(rng, 0, kills);
      const kdr = kills / deaths;
      return {
        ...base,
        kills,
        deaths,
        headshots,
        suicides: intBetween(rng, 0, 40),
        bullets_fired: intBetween(rng, kills * 8, kills * 120),
        favorite_weapon_kills: intBetween(rng, 0, kills),
        favorite_weapon_deaths: intBetween(rng, 0, deaths),
        favorite_weapon: randomFavoriteWeaponShortname(rng),
        kill_stats: randomKillInfoBatch(rng, kills),
        kdr,
      };
    }
    case "resources_stats":
      return {
        ...base,
        hqm_farmed: intBetween(rng, 0, 80_000),
        metal_frags_farmed: intBetween(rng, 10_000, 9_000_000),
        stone_farmed: intBetween(rng, 50_000, 25_000_000),
        sulfur_farmed: intBetween(rng, 5_000, 4_000_000),
        wood_farmed: intBetween(rng, 100_000, 40_000_000),
      };
    case "explosives_stats":
      return {
        ...base,
        satches_thrown: intBetween(rng, 0, 400),
        c4_thrown: intBetween(rng, 0, 220),
        he_grenades_fired: intBetween(rng, 0, 800),
        rockets_fired: intBetween(rng, 0, 3500),
        hv_rockets_fired: intBetween(rng, 0, 900),
        incendiary_rockets_fired: intBetween(rng, 0, 600),
        smoke_rockets_fired: intBetween(rng, 0, 200),
      };
    case "farming_stats":
      return {
        ...base,
        leather_harvested: intBetween(rng, 0, 12_000),
        berries_harvested: intBetween(rng, 0, 25_000),
        cloth_collected: intBetween(rng, 500, 500_000),
        corn_harvested: intBetween(rng, 0, 8_000),
        fish_gutted: intBetween(rng, 0, 3_000),
        mushrooms_harvested: intBetween(rng, 0, 15_000),
        potatoes_harvested: intBetween(rng, 0, 6_000),
        pumpkins_harvested: intBetween(rng, 0, 7_000),
      };
    case "misc_stats":
      return {
        ...base,
        animal_kills: intBetween(rng, 0, 800),
        boats_purchased: intBetween(rng, 0, 40),
        helis_purchased: intBetween(rng, 0, 25),
        subs_purchased: intBetween(rng, 0, 15),
        supply_signals_called: intBetween(rng, 0, 120),
      };
    case "events_stats":
      return {
        ...base,
        hacked_crates_looted: intBetween(rng, 0, 90),
        heli_kills: intBetween(rng, 0, 45),
        bradley_kills: intBetween(rng, 0, 35),
        missions_started: intBetween(rng, 0, 200),
        missions_completed: intBetween(rng, 0, 180),
        npc_kills: intBetween(rng, 0, 12_000),
      };
    case "pve_stats": {
      const bear = intBetween(rng, 0, 120);
      const totalPve =
        bear +
        intBetween(rng, 0, 200) +
        intBetween(rng, 0, 250) +
        intBetween(rng, 0, 40) +
        intBetween(rng, 0, 300);
      return {
        ...base,
        bear_kills: bear,
        boar_kills: intBetween(rng, 0, 200),
        wolf_kills: intBetween(rng, 0, 250),
        horse_kills: intBetween(rng, 0, 40),
        chicken_kills: intBetween(rng, 0, 300),
        deer_kills: intBetween(rng, 0, 180),
        crocodile_kills: intBetween(rng, 0, 60),
        tiger_kills: intBetween(rng, 0, 50),
        panther_kills: intBetween(rng, 0, 45),
        snake_kills: intBetween(rng, 0, 90),
        shark_kills: intBetween(rng, 0, 35),
        kill_stats: randomKillInfoBatch(rng, Math.max(80, totalPve)).map((k) =>
          k.Type === "Player" ? { ...k, Type: "Npc" as const, WeaponUsed: rng() < 0.5 ? k.WeaponUsed : null } : k,
        ),
      };
    }
    case "gambling_stats":
      return {
        ...base,
        blackjack_games_won: intBetween(rng, 0, 400),
        blackjack_amount_bet: intBetween(rng, 1_000, 9_000_000),
        slots_games_won: intBetween(rng, 0, 800),
        slots_amount_bet: intBetween(rng, 2_000, 12_000_000),
        poker_games_won: intBetween(rng, 0, 200),
        poker_amount_bet: intBetween(rng, 500, 5_000_000),
        wheel_games_won: intBetween(rng, 0, 350),
        wheel_amount_bet: intBetween(rng, 1_000, 8_000_000),
      };
    default:
      return base;
  }
}

const DEFAULT_SORT_FIELD: Record<string, string> = {
  pvp_stats: "kills",
  resources_stats: "sulfur_farmed",
  explosives_stats: "rockets_fired",
  farming_stats: "cloth_collected",
  misc_stats: "time_played",
  events_stats: "npc_kills",
  pve_stats: "wolf_kills",
  gambling_stats: "slots_amount_bet",
};

function sortValue(row: Record<string, unknown>, field: string): number | string {
  if (field === "kdr") {
    const k = Number(row.kills) || 0;
    const d = Number(row.deaths) || 1;
    return k / d;
  }
  const v = row[field];
  if (typeof v === "number") return v;
  if (typeof v === "string") return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function compareRows(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
  field: string,
  order: "ASC" | "DESC",
): number {
  const va = sortValue(a, field);
  const vb = sortValue(b, field);
  let cmp = 0;
  if (typeof va === "string" && typeof vb === "string") {
    cmp = va.localeCompare(vb);
  } else {
    cmp = (Number(va) || 0) - (Number(vb) || 0);
  }
  return order === "DESC" ? -cmp : cmp;
}

export type FakeLeaderboardParams = {
  tab: string;
  filter?: string;
  page: number;
  sortField?: string;
  pageSize: number;
  server: string;
  wipeId?: number;
  lifetime?: boolean;
  sortOrder?: "ASC" | "DESC";
};

export type FakeLeaderboardResult = {
  data: Record<string, unknown>[];
  totalPages: number;
};

export function getFakeLeaderboardStats(params: FakeLeaderboardParams): FakeLeaderboardResult {
  const validTabs = new Set(Object.keys(DEFAULT_SORT_FIELD));
  if (!validTabs.has(params.tab)) {
    return { data: [], totalPages: 1 };
  }

  const seed = hashSeed([
    params.tab,
    params.server || "none",
    String(params.wipeId ?? ""),
    params.lifetime ? "1" : "0",
  ]);

  const rows: Record<string, unknown>[] = [];
  for (let i = 0; i < TOTAL_PLAYERS; i++) {
    const rng = mulberry32(seed + i * 1_000_003);
    const username = NAMES[i % NAMES.length] + (i >= NAMES.length ? `_${i}` : "");
    const steam_id = steamIdForIndex(i, seed);
    const timeRng = mulberry32(hashSeed(["time_played", params.server || "none", String(i)]));
    rows.push({
      ...buildRowForTab(params.tab, i, rng, steam_id, username),
      time_played: intBetween(timeRng, 3_600, 1_200_000),
    });
  }

  const f = (params.filter ?? "").trim().toLowerCase();
  let filtered = f
    ? rows.filter((r) => {
        const u = String(r.username ?? "").toLowerCase();
        const sid = String(r.steam_id ?? "");
        return u.includes(f) || sid === params.filter?.trim();
      })
    : rows;

  const sortField =
    params.sortField && filtered[0] && params.sortField in filtered[0]
      ? params.sortField
      : DEFAULT_SORT_FIELD[params.tab];
  const order: "ASC" | "DESC" =
    params.sortOrder === "ASC" || params.sortOrder === "DESC"
      ? params.sortOrder
      : "DESC";

  filtered = [...filtered].sort((a, b) => compareRows(a, b, sortField, order));

  const page = Math.max(1, params.page);
  const pageSize = Math.max(1, Math.min(100, params.pageSize));
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const data = filtered.slice(start, start + pageSize);

  return { data, totalPages };
}

export function isLeaderboardFakeDataEnabled(): boolean {
  return process.env.NEXT_PUBLIC_LEADERBOARD_FAKE_DATA === "true";
}

/** All fake PvP kill locations for the event map (server / wipe / lifetime scoped). */
export function getFakeLeaderboardKillHeatmapPoints(params: {
  server: string;
  wipeId?: number;
  lifetime?: boolean;
}): KillHeatmapPoint[] {
  const seed = hashSeed([
    "pvp_stats",
    params.server || "none",
    String(params.wipeId ?? ""),
    params.lifetime ? "1" : "0",
  ]);
  const merged: KillHeatmapPoint[] = [];
  for (let i = 0; i < TOTAL_PLAYERS; i++) {
    const rng = mulberry32(seed + i * 1_000_003);
    const kills = intBetween(rng, 5, 4200);
    const batch = randomKillInfoBatch(rng, kills);
    for (const k of batch) {
      merged.push({
        x: k.GridLocation.x,
        y: k.GridLocation.y,
        type: k.Type,
        weaponUsed: k.WeaponUsed,
      });
    }
  }
  return merged;
}
