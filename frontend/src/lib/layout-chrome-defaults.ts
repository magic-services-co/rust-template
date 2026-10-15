import { LAYOUT_THEME_DEFAULTS, LEGAL_THEME_DEFAULTS } from "@/lib/layout-theme-defaults";

export const LAYOUT_CHROME_DEFAULTS = {
  logoImage: LAYOUT_THEME_DEFAULTS.logoImage,
  faviconImage: LAYOUT_THEME_DEFAULTS.faviconImage,
  navWordmarkColor: LAYOUT_THEME_DEFAULTS.primaryTitleColor,
  navLinkColor: LAYOUT_THEME_DEFAULTS.navLinkColor,
  navLinkHoverColor: LAYOUT_THEME_DEFAULTS.navLinkHoverColor,
  navLinkActiveColor: LAYOUT_THEME_DEFAULTS.navLinkActiveColor,
  navUnderlineColor: "#d7b15a",
  navScrolledBackground: "rgba(5, 7, 10, 0.62)",
  signInBackground: LAYOUT_THEME_DEFAULTS.primaryButtonBg,
  signInHover: LAYOUT_THEME_DEFAULTS.primaryButtonHover,
  signInText: LAYOUT_THEME_DEFAULTS.primaryButtonText,

  userMenuBackground: "#0b0f15",
  userMenuBorder: "rgba(255, 255, 255, 0.1)",
  userMenuKickerColor: "#ba9142",
  userMenuNameColor: "#edf5ff",
  userMenuDivider: "rgba(255, 255, 255, 0.1)",
  userMenuItemColor: "#b6c1ce",
  userMenuIconColor: "#7d8da0",
  userMenuItemHoverBackground: "#1b2533",
  userMenuItemHoverColor: "#edf5ff",
  userMenuSignoutColor: "#f0c970",
  userMenuSignoutHoverBackground: "rgba(186, 145, 66, 0.12)",

  footerBackground: "#05070a",
  footerBorder: "rgba(49, 58, 67, 0.2)",
  footerHeadingColor: "#9fb8cf",
  footerLinkColor: "#c5d0de",
  footerMutedColor: "rgba(159, 172, 192, 0.48)",
  footerTaglineColor: "rgba(202, 216, 233, 0.65)",
  footerTagline: LEGAL_THEME_DEFAULTS.footerTagline,
  footerEstablishedYear: LEGAL_THEME_DEFAULTS.establishedYear,
  footerWordmarkColor: LAYOUT_THEME_DEFAULTS.primaryTitleColor,
} as const;

export type LayoutChromeTheme = {
  -readonly [K in keyof typeof LAYOUT_CHROME_DEFAULTS]: string;
};

export type LayoutChromeGroupId = "nav" | "account" | "footer";

export type LayoutChromeFieldType = "text" | "textarea" | "color" | "url";

export type LayoutChromeField = {
  key: keyof LayoutChromeTheme;
  label: string;
  hint?: string;
  group: LayoutChromeGroupId;
  type: LayoutChromeFieldType;
};

export const LAYOUT_CHROME_GROUPS: { id: LayoutChromeGroupId; label: string; description: string }[] = [
  { id: "nav", label: "Navigation", description: "Logo, favicon, links, underline, and the sign-in button." },
  { id: "account", label: "Profile dropdown", description: "The menu that opens from the user photo." },
  { id: "footer", label: "Footer", description: "Background, tagline, link colors, and copyright." },
];

export const LAYOUT_CHROME_FIELDS: LayoutChromeField[] = [
  { key: "logoImage", label: "Logo image", group: "nav", type: "url" },
  { key: "faviconImage", label: "Favicon", hint: "The icon in the browser tab. Use a square PNG, ICO, or SVG URL.", group: "nav", type: "url" },
  { key: "navWordmarkColor", label: "Wordmark color", group: "nav", type: "color" },
  { key: "navLinkColor", label: "Link color", group: "nav", type: "color" },
  { key: "navLinkHoverColor", label: "Link hover color", group: "nav", type: "color" },
  { key: "navLinkActiveColor", label: "Active link color", group: "nav", type: "color" },
  { key: "navUnderlineColor", label: "Active underline", group: "nav", type: "color" },
  { key: "navScrolledBackground", label: "Scrolled background", group: "nav", type: "color" },
  { key: "signInBackground", label: "Sign-in background", group: "nav", type: "color" },
  { key: "signInHover", label: "Sign-in hover", group: "nav", type: "color" },
  { key: "signInText", label: "Sign-in text", group: "nav", type: "color" },

  { key: "userMenuBackground", label: "Menu background", group: "account", type: "color" },
  { key: "userMenuBorder", label: "Menu border", group: "account", type: "color" },
  { key: "userMenuKickerColor", label: "ACCOUNT label", group: "account", type: "color" },
  { key: "userMenuNameColor", label: "Name color", group: "account", type: "color" },
  { key: "userMenuDivider", label: "Divider", group: "account", type: "color" },
  { key: "userMenuItemColor", label: "Item color", group: "account", type: "color" },
  { key: "userMenuIconColor", label: "Item icons", group: "account", type: "color" },
  { key: "userMenuItemHoverBackground", label: "Item hover fill", group: "account", type: "color" },
  { key: "userMenuItemHoverColor", label: "Item hover text", group: "account", type: "color" },
  { key: "userMenuSignoutColor", label: "Sign out color", group: "account", type: "color" },
  { key: "userMenuSignoutHoverBackground", label: "Sign out hover fill", group: "account", type: "color" },

  { key: "footerBackground", label: "Background", group: "footer", type: "color" },
  { key: "footerBorder", label: "Border color", group: "footer", type: "color" },
  { key: "footerWordmarkColor", label: "Wordmark color", group: "footer", type: "color" },
  { key: "footerTagline", label: "Tagline", group: "footer", type: "textarea" },
  { key: "footerTaglineColor", label: "Tagline color", group: "footer", type: "color" },
  { key: "footerHeadingColor", label: "Column headings", group: "footer", type: "color" },
  { key: "footerLinkColor", label: "Link color", group: "footer", type: "color" },
  { key: "footerMutedColor", label: "Copyright color", group: "footer", type: "color" },
  { key: "footerEstablishedYear", label: "Established year", group: "footer", type: "text" },
];

export function layoutChromeFieldByKey(key: string): LayoutChromeField | undefined {
  return LAYOUT_CHROME_FIELDS.find((field) => field.key === key);
}

export function isLayoutChromeField(key: string | null | undefined): boolean {
  return Boolean(key && layoutChromeFieldByKey(key));
}

export function withLayoutChromeDefaults(
  incoming?: Record<string, unknown> | null,
): LayoutChromeTheme {
  const next = { ...LAYOUT_CHROME_DEFAULTS } as LayoutChromeTheme;
  if (!incoming || typeof incoming !== "object") return next;
  for (const key of Object.keys(LAYOUT_CHROME_DEFAULTS) as Array<keyof LayoutChromeTheme>) {
    const value = incoming[key];
    if (typeof value === "string" && value.trim()) next[key] = value;
  }
  if (typeof incoming.primaryTitleColor === "string" && incoming.primaryTitleColor.trim()) {
    next.navWordmarkColor = incoming.primaryTitleColor;
    if (!incoming.footerWordmarkColor) next.footerWordmarkColor = incoming.primaryTitleColor;
  }
  if (typeof incoming.primaryButtonBg === "string" && incoming.primaryButtonBg.trim()) {
    next.signInBackground = incoming.primaryButtonBg;
  }
  if (typeof incoming.primaryButtonHover === "string" && incoming.primaryButtonHover.trim()) {
    next.signInHover = incoming.primaryButtonHover;
  }
  if (typeof incoming.primaryButtonText === "string" && incoming.primaryButtonText.trim()) {
    next.signInText = incoming.primaryButtonText;
  }
  return next;
}

export const LAYOUT_CHROME_THEME_SETTINGS_MAP = {
  logoImage: "logoImage",
  faviconImage: "faviconImage",
  navWordmarkColor: "primaryTitleColor",
  navLinkColor: "navLinkColor",
  navLinkHoverColor: "navLinkHoverColor",
  navLinkActiveColor: "navLinkActiveColor",
  signInBackground: "primaryButtonBg",
  signInHover: "primaryButtonHover",
  signInText: "primaryButtonText",
} as const;
