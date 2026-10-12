const STORAGE_KEY = 'magic-theme-client-override';

export type StoredTheme = Record<string, string | number | boolean | undefined>;

function camelToKebab(s: string): string {
  return s.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
}

export function getStoredTheme(): StoredTheme | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredTheme;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

const LAYOUT_SCALE_KEYS = new Set([
  'spacing',
  'fontFamily',
  'borderRadius',
  'backgroundOpacity',
  'backgroundImage',
  'logoImage',
  'faviconImage',
]);

export function themeToCss(theme: StoredTheme): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(theme)) {
    if (key === 'enabled' || LAYOUT_SCALE_KEYS.has(key)) continue;
    if (value === undefined || value === null) continue;
    const cssVar = '--' + camelToKebab(key);
    if (cssVar === '--spacing' || cssVar.startsWith('--text-') || cssVar.startsWith('--font-')) continue;
    const cssValue = typeof value === 'number' ? String(value) : String(value);
    lines.push(`${cssVar}: ${cssValue.replace(/[;{}]/g, '')}`);
  }
  return lines.length ? `:root { ${lines.join('; ')} }` : '';
}

export function persistTheme(theme: StoredTheme): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
  } catch {
    // ignore
  }
}
