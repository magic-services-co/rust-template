export function serverRegion(categoryName?: string): { label: string; flag?: string } {
  const name = (categoryName || "").toLowerCase();
  if (/\beu\b|europe/.test(name)) {
    return { label: "EUROPE", flag: "/images/servers/flag-eu.png" };
  }
  if (/\bna\b|north america|united states|\bus\b/.test(name)) {
    return { label: "NORTH AMERICA", flag: "/images/servers/flag-na.png" };
  }
  if (/\bau\b|oceania|australia/.test(name)) {
    return { label: "OCEANIA" };
  }
  const cleaned = (categoryName || "SERVER").replace(/servers?/gi, "").trim();
  return { label: (cleaned || "SERVER").toUpperCase() };
}

export function compareServersByRankThenPlayers<T extends {
  order?: number;
  attributes: { rank?: number; players?: number };
}>(a: T, b: T): number {
  const rankA = a.attributes.rank;
  const rankB = b.attributes.rank;
  const hasA = typeof rankA === "number" && rankA > 0;
  const hasB = typeof rankB === "number" && rankB > 0;
  if (hasA && hasB && rankA !== rankB) return rankA - rankB;
  if (hasA !== hasB) return hasA ? -1 : 1;
  const byPlayers = (b.attributes.players || 0) - (a.attributes.players || 0);
  if (byPlayers !== 0) return byPlayers;
  return (a.order || 0) - (b.order || 0);
}

export type ServerAlign = "ltr" | "center" | "rtl";

export function serverAlign(value: unknown): ServerAlign {
  if (value === "center" || value === "rtl") return value;
  return "ltr";
}

/** Card row: left to right, centered, or right to left. Widths match the old 1 / 2 / 3 column grid. */
export function serverGridClass(align: ServerAlign): string {
  const flow =
    align === "rtl" ? "flex-row-reverse justify-start" : align === "center" ? "justify-center" : "justify-start";
  return `flex flex-wrap gap-3 ${flow} [&>*]:w-full md:[&>*]:w-[calc(50%-0.375rem)] xl:[&>*]:w-[calc(33.333%-0.5rem)]`;
}

export function queuedPlayers(players: number, maxPlayers: number): number {
  if (!maxPlayers || players <= maxPlayers) return 0;
  return players - maxPlayers;
}

export function populationPercent(players: number, maxPlayers: number): number {
  const max = maxPlayers || 1;
  return Math.min(100, (100 * (players || 0)) / max);
}
