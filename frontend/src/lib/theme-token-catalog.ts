import { LAYOUT_THEME_DEFAULTS } from "@/lib/layout-theme-defaults";

export type ThemeTokenKey = keyof typeof LAYOUT_THEME_DEFAULTS;
export type ThemeTokenValues = { -readonly [K in ThemeTokenKey]: (typeof LAYOUT_THEME_DEFAULTS)[K] };

export type TokenFieldType = "hsl" | "color" | "text" | "number";

export type TokenField = {
  key: ThemeTokenKey;
  label: string;
  type: TokenFieldType;
  group: string;
  hint?: string;
};

export const TOKEN_GROUPS = [
  "Buttons",
  "Navigation",
  "Text",
  "Surfaces",
  "Background",
  "Branding",
] as const;

export const TOKEN_FIELDS: TokenField[] = [
  { key: "primaryButtonBg", label: "Primary fill", type: "color", group: "Buttons" },
  { key: "primaryButtonHover", label: "Primary hover", type: "color", group: "Buttons" },
  { key: "primaryButtonText", label: "Primary label", type: "color", group: "Buttons" },
  { key: "secondaryButtonBg", label: "Secondary fill", type: "color", group: "Buttons" },
  { key: "secondaryButtonHover", label: "Secondary hover", type: "color", group: "Buttons" },
  { key: "secondaryButtonText", label: "Secondary label", type: "color", group: "Buttons" },
  { key: "navLinkColor", label: "Link", type: "color", group: "Navigation" },
  { key: "navLinkHoverColor", label: "Link hover", type: "color", group: "Navigation" },
  { key: "navLinkActiveColor", label: "Link active", type: "color", group: "Navigation" },
  { key: "primaryTitleColor", label: "Headings", type: "color", group: "Text" },
  { key: "secondaryTextColor", label: "Body", type: "color", group: "Text" },
  { key: "mutedTextColor", label: "Muted", type: "color", group: "Text" },
  { key: "linkAccentColor", label: "Accent / links", type: "color", group: "Text" },
  { key: "foreground", label: "Main text token", type: "hsl", group: "Text" },
  { key: "background", label: "Page background", type: "hsl", group: "Surfaces" },
  { key: "card", label: "Card token", type: "hsl", group: "Surfaces" },
  { key: "cardForeground", label: "Card text token", type: "hsl", group: "Surfaces" },
  { key: "cardBgDefault", label: "Card fill", type: "color", group: "Surfaces" },
  { key: "cardBgHover", label: "Card hover", type: "color", group: "Surfaces" },
  { key: "popover", label: "Popover", type: "hsl", group: "Surfaces" },
  { key: "popoverForeground", label: "Popover text", type: "hsl", group: "Surfaces" },
  { key: "muted", label: "Muted surface", type: "hsl", group: "Surfaces" },
  { key: "mutedForeground", label: "Muted surface text", type: "hsl", group: "Surfaces" },
  { key: "border", label: "Border", type: "hsl", group: "Surfaces" },
  { key: "input", label: "Input border token", type: "hsl", group: "Surfaces" },
  { key: "inputBorderColor", label: "Input border", type: "color", group: "Surfaces" },
  { key: "ring", label: "Focus ring", type: "hsl", group: "Surfaces" },
  { key: "radius", label: "Radius token", type: "text", group: "Surfaces", hint: "Example: 0.5rem" },
  { key: "primary", label: "Primary token", type: "hsl", group: "Surfaces" },
  { key: "primaryForeground", label: "Primary token text", type: "hsl", group: "Surfaces" },
  { key: "secondary", label: "Secondary token", type: "hsl", group: "Surfaces" },
  { key: "secondaryForeground", label: "Secondary token text", type: "hsl", group: "Surfaces" },
  { key: "accent", label: "Accent token", type: "hsl", group: "Surfaces" },
  { key: "accentForeground", label: "Accent token text", type: "hsl", group: "Surfaces" },
  { key: "destructive", label: "Destructive", type: "hsl", group: "Surfaces" },
  { key: "destructiveForeground", label: "Destructive text", type: "hsl", group: "Surfaces" },
  { key: "backgroundImage", label: "Background image", type: "text", group: "Background" },
  { key: "backgroundOpacity", label: "Background strength", type: "number", group: "Background", hint: "0–100" },
  { key: "fontFamily", label: "Font", type: "text", group: "Branding" },
  { key: "borderRadius", label: "Corner radius", type: "text", group: "Branding" },
  { key: "spacing", label: "Spacing", type: "text", group: "Branding" },
  { key: "logoImage", label: "Logo", type: "text", group: "Branding" },
  { key: "faviconImage", label: "Favicon", type: "text", group: "Branding", hint: "Browser tab icon. Use a square PNG, ICO, or SVG URL." },
];

export const TOKEN_KEY_SET = new Set<string>(TOKEN_FIELDS.map((field) => field.key));

type TokenValue = string | number;

export type LinkedTarget = {
  key: ThemeTokenKey;
  map?: (value: string) => TokenValue;
};

export type LinkedControl = {
  id: string;
  label: string;
  hint: string;
  type: "color" | "hsl";
  lead: ThemeTokenKey;
  targets: LinkedTarget[];
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function hexToHsl(hex: string): string {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!match) return hex;
  const r = parseInt(match[1], 16) / 255;
  const g = parseInt(match[2], 16) / 255;
  const b = parseInt(match[3], 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function hslToHex(hsl: string): string {
  const parts = hsl.match(/(\d+\.?\d*)\s+(\d+\.?\d*)%\s+(\d+\.?\d*)%/);
  if (!parts) return "#000000";
  const h = parseFloat(parts[1]) / 360;
  const s = parseFloat(parts[2]) / 100;
  const l = parseFloat(parts[3]) / 100;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r: number;
  let g: number;
  let b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function shiftHexLightness(hex: string, delta: number): string {
  const hsl = hexToHsl(hex);
  const parts = hsl.match(/(\d+\.?\d*)\s+(\d+\.?\d*)%\s+(\d+\.?\d*)%/);
  if (!parts) return hex;
  const l = clamp(parseFloat(parts[3]) + delta, 0, 100);
  return hslToHex(`${parts[1]} ${parts[2]}% ${l}%`);
}

export const LINKED_CONTROLS: LinkedControl[] = [
  {
    id: "accent",
    label: "Accent",
    hint: "Links, the focus ring, and the highlight used across the site.",
    type: "color",
    lead: "linkAccentColor",
    targets: [
      { key: "linkAccentColor" },
      { key: "ring", map: hexToHsl },
      { key: "navLinkActiveColor" },
    ],
  },
  {
    id: "background",
    label: "Page background",
    hint: "The base surface behind every page.",
    type: "hsl",
    lead: "background",
    targets: [{ key: "background" }, { key: "popover" }],
  },
  {
    id: "headings",
    label: "Headings",
    hint: "Titles, and the main text token those titles follow.",
    type: "color",
    lead: "primaryTitleColor",
    targets: [
      { key: "primaryTitleColor" },
      { key: "foreground", map: hexToHsl },
      { key: "primary", map: hexToHsl },
    ],
  },
  {
    id: "body",
    label: "Body text",
    hint: "Paragraphs and the quieter muted text.",
    type: "color",
    lead: "secondaryTextColor",
    targets: [
      { key: "secondaryTextColor" },
      { key: "mutedTextColor", map: (hex) => shiftHexLightness(hex, -12) },
    ],
  },
  {
    id: "primary-button",
    label: "Primary button",
    hint: "Fill and hover. The label is the next control. Every state is under Every control.",
    type: "color",
    lead: "primaryButtonBg",
    targets: [
      { key: "primaryButtonBg" },
      { key: "primaryButtonHover", map: (hex) => shiftHexLightness(hex, 8) },
    ],
  },
  {
    id: "button-label",
    label: "Button label",
    hint: "Text on the primary button.",
    type: "color",
    lead: "primaryButtonText",
    targets: [
      { key: "primaryButtonText" },
      { key: "primaryForeground", map: hexToHsl },
    ],
  },
  {
    id: "cards",
    label: "Cards",
    hint: "Card fill and the slightly lighter hover.",
    type: "color",
    lead: "cardBgDefault",
    targets: [
      { key: "cardBgDefault" },
      { key: "cardBgHover", map: (hex) => shiftHexLightness(hex, 6) },
      { key: "card", map: hexToHsl },
    ],
  },
  {
    id: "nav",
    label: "Navigation",
    hint: "Resting link color, plus a lighter hover.",
    type: "color",
    lead: "navLinkColor",
    targets: [
      { key: "navLinkColor" },
      { key: "navLinkHoverColor", map: (hex) => shiftHexLightness(hex, 18) },
    ],
  },
];

export function linkedControlForToken(key: string): LinkedControl | undefined {
  return LINKED_CONTROLS.find((control) => control.targets.some((target) => target.key === key));
}

export function tokenFieldByKey(key: string): TokenField | undefined {
  return TOKEN_FIELDS.find((field) => field.key === key);
}

export function applyLinkedControl(current: ThemeTokenValues, control: LinkedControl, value: string): ThemeTokenValues {
  const next = { ...current };
  for (const target of control.targets) {
    const mapped = target.map ? target.map(value) : value;
    (next as Record<string, TokenValue>)[target.key] = mapped;
  }
  return next;
}
