/** Rust item icons: https://cdn.looty.cc/Items/{shortname}.png */

const BASE = "https://cdn.looty.cc/Items";

/** Rust-style item shortname, e.g. rifle.ak, smg.mp5 */
function isItemShortname(s: string): boolean {
  return /^[a-z0-9._-]+$/i.test(s) && s.includes(".");
}

export function lootyItemImageUrl(shortname: string): string {
  return `${BASE}/${encodeURIComponent(shortname.toLowerCase())}.png`;
}

/** Resolve Looty URL from API value — string shortname only (no item ids). */
export function resolveWeaponShortname(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string") return null;
  const s = value.trim().toLowerCase();
  if (!isItemShortname(s)) return null;
  return s;
}

export function lootyWeaponImageUrl(value: unknown): string | null {
  const shortname = resolveWeaponShortname(value);
  return shortname ? lootyItemImageUrl(shortname) : null;
}
