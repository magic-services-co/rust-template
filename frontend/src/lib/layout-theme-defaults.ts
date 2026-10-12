export const LAYOUT_THEME_DEFAULTS = {
  navLinkColor: "#a6b0c0",
  navLinkHoverColor: "#f2f7ff",
  navLinkActiveColor: "#ffffff",
  primaryTitleColor: "#f2f7ff",
  secondaryTextColor: "#b3c0ce",
  linkAccentColor: "#d7b15a",
  mutedTextColor: "#8292a6",
  primaryButtonBg: "#040609",
  primaryButtonHover: "#10141a",
  primaryButtonText: "#b8c3d0",
  secondaryButtonBg: "transparent",
  secondaryButtonHover: "rgba(255,255,255,0.06)",
  secondaryButtonText: "#c5d0de",
  cardBgDefault: "rgba(16, 17, 22, 0.65)",
  cardBgHover: "rgba(16, 17, 22, 0.8)",
  inputBorderColor: "rgba(255,255,255,0.1)",
  fontFamily: "Inter",
  borderRadius: "0.5rem",
  spacing: "1rem",
  backgroundOpacity: 10,
  backgroundImage: "/images/legal-hero.png",
  logoImage: "/images/logo.png",
  faviconImage: "/favicon.ico",
  background: "216 38% 2.5%",
  foreground: "219 100% 97.5%",
  card: "230 20% 6%",
  cardForeground: "219 100% 97.5%",
  popover: "216 38% 2.5%",
  popoverForeground: "219 100% 97.5%",
  primary: "219 100% 97.5%",
  primaryForeground: "216 38% 2.5%",
  secondary: "217.2 32.6% 17.5%",
  secondaryForeground: "219 100% 97.5%",
  muted: "217.2 32.6% 17.5%",
  mutedForeground: "215 20.2% 65.1%",
  accent: "217.2 32.6% 17.5%",
  accentForeground: "219 100% 97.5%",
  destructive: "0 62.8% 30.6%",
  destructiveForeground: "219 100% 97.5%",
  border: "217.2 32.6% 17.5%",
  input: "217.2 32.6% 17.5%",
  ring: "212.7 26.8% 83.9%",
  radius: "0.5rem",
} as const;

export const LEGAL_THEME_DEFAULTS = {
  accentColor: "#ba9142",
  accentSoft: "#e6c16d",
  accentLink: "#d7b15a",
  titleColor: "#ffffff",
  headingColor: "#edf5ff",
  bodyColor: "#b3c0ce",
  mutedColor: "#8292a6",
  kickerColor: "#ba9142",
  tocLabelColor: "#718398",
  tocInactiveColor: "#718397",
  tocNumberInactiveColor: "#526276",
  introBackground: "rgba(16, 17, 22, 0.65)",
  introBorder: "rgba(186, 145, 66, 0.25)",
  introText:
    "These terms protect fair play, secure purchases, and a respectful environment for every player.",
  lastUpdatedLabel: "LAST UPDATED",
  lastUpdated: "05 August 2026",
  sidebarSupportText: "Questions about these terms?",
  footerTagline:
    "High-performance Rust servers for players who want to experience the ultimate survival gameplay.",
  establishedYear: "2022",
} as const;

const LEGAL_DATE_IN_TEXT =
  /\b(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})\b/i;

export function legalUpdatedDate(
  sections: Array<{ content?: string | null }>,
  themeDate?: string | null,
): string | null {
  for (const section of sections) {
    const text = String(section.content ?? "").replace(/<[^>]+>/g, " ");
    const match = text.match(LEGAL_DATE_IN_TEXT);
    if (match?.[1]) return match[1];
  }
  const fallback = (themeDate ?? "").trim();
  if (!fallback || fallback === LEGAL_THEME_DEFAULTS.lastUpdated) return null;
  return fallback;
}

export const PRIVACY_THEME_DEFAULTS = {
  ...LEGAL_THEME_DEFAULTS,
  introTitle: "Your data, clearly explained",
  introTitleColor: "#f1d28b",
  introText:
    "We collect only what is needed to operate a fair, secure community and deliver the services you choose to use.",
  sidebarSupportText: "For account help or a privacy request,",
} as const;

type WidenTheme<T> = {
  -readonly [K in keyof T]: T[K] extends string ? string : T[K] extends number ? number : T[K];
};

export type LayoutTheme = Partial<WidenTheme<typeof LAYOUT_THEME_DEFAULTS>> & {
  logoImage?: string;
  backgroundImage?: string;
  backgroundOpacity?: number;
};

export function withLayoutDefaults<T extends object>(
  theme?: T | null,
): typeof LAYOUT_THEME_DEFAULTS & T {
  if (theme == null || typeof theme !== "object" || Array.isArray(theme)) {
    return { ...LAYOUT_THEME_DEFAULTS } as typeof LAYOUT_THEME_DEFAULTS & T;
  }
  return { ...LAYOUT_THEME_DEFAULTS, ...theme } as typeof LAYOUT_THEME_DEFAULTS & T;
}

const STALE_LEGAL_COLORS = new Set([
  "#2c3e50",
  "#007bff",
  "#0056b3",
  "#6c757d",
]);

export function withLegalDefaults<T extends object>(
  theme?: T | null,
): typeof LEGAL_THEME_DEFAULTS & T {
  if (theme == null || typeof theme !== "object" || Array.isArray(theme)) {
    return { ...LEGAL_THEME_DEFAULTS } as typeof LEGAL_THEME_DEFAULTS & T;
  }
  const incoming = { ...(theme as Record<string, unknown>) };
  for (const [key, value] of Object.entries(incoming)) {
    if (typeof value === "string" && STALE_LEGAL_COLORS.has(value.toLowerCase())) {
      delete incoming[key];
    }
  }
  return { ...LEGAL_THEME_DEFAULTS, ...incoming } as typeof LEGAL_THEME_DEFAULTS & T;
}

export function withPrivacyDefaults<T extends object>(
  theme?: T | null,
): typeof PRIVACY_THEME_DEFAULTS & T {
  if (theme == null || typeof theme !== "object" || Array.isArray(theme)) {
    return { ...PRIVACY_THEME_DEFAULTS } as typeof PRIVACY_THEME_DEFAULTS & T;
  }
  const incoming = { ...(theme as Record<string, unknown>) };
  for (const [key, value] of Object.entries(incoming)) {
    if (typeof value === "string" && STALE_LEGAL_COLORS.has(value.toLowerCase())) {
      delete incoming[key];
    }
  }
  return { ...PRIVACY_THEME_DEFAULTS, ...incoming } as typeof PRIVACY_THEME_DEFAULTS & T;
}

export const SUPPORT_THEME_DEFAULTS = {
  backgroundColor: "transparent",
  kickerColor: "#ba9142",
  kickerLabel: "FAST AND EASY",
  titleColor: "#f2f7ff",
  subtitleColor: "#9facc0",
  pageTitle: "SUPPORT TICKETS",
  pageSubtitle: "Choose one of the following options below that best suits you.",
  categoryCardBackground: "rgba(8, 12, 17, 0.94)",
  categoryCardBorder: "rgba(72, 97, 125, 0.6)",
  categoryCardHoverBackground: "rgba(16, 20, 26, 0.98)",
  categoryCardTitleColor: "#eef4fb",
  categoryCardIconColor: "#e1e7ed",
  categoryCardLockColor: "#6b7280",
  categoryCardBodyColor: "rgba(225, 231, 237, 0.74)",
  categoryCardMetaColor: "rgba(194, 204, 214, 0.72)",
  openTicketLabel: "Open ticket",
  buttonPrimaryBackground: "#040609",
  buttonPrimaryText: "#e1e7ed",
  buttonPrimaryHoverBackground: "#10141a",
  buttonSecondaryBackground: "transparent",
  buttonSecondaryText: "#c5d0de",
  buttonSecondaryBorder: "rgba(72, 97, 125, 0.6)",
  buttonSecondaryHoverBackground: "rgba(255, 255, 255, 0.06)",
  buttonBorderRadius: "0px",
  formBackground: "rgba(16, 17, 22, 0.65)",
  formBorder: "rgba(72, 97, 125, 0.6)",
  inputBackground: "rgba(16, 17, 22, 0.65)",
  inputBorder: "rgba(255, 255, 255, 0.1)",
  inputText: "#eef4fb",
  inputPlaceholder: "#8292a6",
  inputFocusBorder: "#ba9142",
  labelColor: "#eef4fb",
  errorTextColor: "#ef4444",
  successTextColor: "#22c55e",
  warningTextColor: "#f59e0b",
  helpTextColor: "#8292a6",
  loadingSpinnerColor: "#ba9142",
  banMessageBackground: "rgba(141, 37, 42, 0.16)",
  banMessageBorder: "#8d252a",
  banMessageTextColor: "#eef4fb",
  breadcrumbTextColor: "#8292a6",
  breadcrumbActiveColor: "#eef4fb",
  blurIntensity: 0,
  cardBorderRadius: "0px",
  cardPadding: "20px",
  spacing: "40px",
  cardHoverEffect: "",
} as const;

export const SUPPORT_CARD_PALETTES = [
  {
    key: "general",
    accent: "#ba9142",
    wash: "rgba(30, 26, 17, 0.96)",
    icon: "/images/support/general.svg",
  },
  {
    key: "report",
    accent: "#8d252a",
    wash: "rgba(30, 17, 17, 0.96)",
    icon: "/images/support/report.svg",
  },
  {
    key: "bug",
    accent: "#254a82",
    wash: "rgba(17, 20, 30, 0.96)",
    icon: "/images/support/bug.svg",
  },
  {
    key: "payment",
    accent: "#682475",
    wash: "rgba(30, 17, 28, 0.96)",
    icon: "/images/support/payment.svg",
  },
  {
    key: "staff",
    accent: "#2f6825",
    wash: "rgba(17, 30, 21, 0.96)",
    icon: "/images/support/staff.svg",
  },
] as const;

const STALE_SUPPORT_VALUES = new Set([
  "hsl(var(--background))",
  "hsl(var(--foreground))",
  "hsl(var(--card))",
  "hsl(var(--border))",
  "hsl(var(--muted-foreground))",
  "hsl(var(--accent))",
  "hsl(var(--primary))",
  "hsl(var(--primary-foreground))",
  "hsl(var(--destructive))",
  "hsl(var(--muted))",
  "hsl(var(--input))",
  "hsl(var(--ring))",
  "rgba(255, 255, 255, 0.05)",
  "rgba(255, 255, 255, 0.1)",
  "rgba(15,20,25,0.1)",
  "#52525b",
  "#71717a",
  "#b0b0b0",
  "#9ca3af",
  "#374151",
]);

export function withSupportDefaults<T extends object>(
  theme?: T | null,
): typeof SUPPORT_THEME_DEFAULTS & T {
  if (theme == null || typeof theme !== "object" || Array.isArray(theme)) {
    return { ...SUPPORT_THEME_DEFAULTS } as typeof SUPPORT_THEME_DEFAULTS & T;
  }
  const incoming = { ...(theme as Record<string, unknown>) };
  for (const [key, value] of Object.entries(incoming)) {
    if (typeof value === "string" && STALE_SUPPORT_VALUES.has(value.toLowerCase())) {
      delete incoming[key];
    }
  }
  if (incoming.blurIntensity === 0.5) {
    delete incoming.blurIntensity;
  }
  return { ...SUPPORT_THEME_DEFAULTS, ...incoming } as typeof SUPPORT_THEME_DEFAULTS & T;
}

export const STORE_THEME_DEFAULTS = {
  layoutPreset: "default",
  backgroundColor: "transparent",
  kickerColor: "#ba9142",
  kickerLabel: "OFFICIAL STORE / MAGIC RUST",
  titleColor: "#f2f7ff",
  titleAccentColor: "#ba9142",
  pageTitle: "GEAR UP.",
  pageTitleAccent: "STAND OUT.",
  subtitleColor: "#aab8c9",
  pageSubtitle:
    "Secure your edge with server ranks and exclusive cosmetics. Every purchase supports the Magic Rust community.",
  categoryCardBackground: "#0a0e14",
  categoryCardBorder: "rgba(255, 255, 255, 0.1)",
  categoryCardHoverBackground: "#0a0e14",
  categoryCardTitleColor: "#93a4b8",
  categoryCardHoverTitleColor: "#080a0e",
  tabActiveBackground: "#ba9142",
  tabActiveText: "#080a0e",
  tabInactiveText: "#93a4b8",
  packageCountColor: "#68788c",
  productCardBackground: "#0a0d12",
  productCardBorder: "rgba(255, 255, 255, 0.1)",
  productCardHoverBackground: "#0a0d12",
  productCardTitleColor: "#ffffff",
  productCardDescriptionColor: "#b6c1ce",
  productCardPriceColor: "#ffffff",
  productCardOriginalPriceColor: "#7f8ea0",
  productCardDiscountBadgeBackground: "#ef4444",
  productCardDiscountBadgeText: "#ffffff",
  productCardMetaColor: "#718297",
  productCardBrandColor: "#8291a3",
  sidebarBackground: "#0b0f15",
  sidebarBorder: "rgba(255, 255, 255, 0.1)",
  sidebarTitleColor: "#8799ac",
  sidebarTextColor: "#7d8da0",
  sidebarPriceColor: "#81d875",
  sidebarSelectedNameColor: "#edf5ff",
  saleBackground: "rgba(11, 16, 24, 0.85)",
  saleBorder: "rgba(186, 145, 66, 0.4)",
  saleTitleColor: "#f0c970",
  saleMetaColor: "#ba9142",
  buttonPrimaryBackground: "transparent",
  buttonPrimaryText: "#f0c970",
  buttonPrimaryHoverBackground: "rgba(186, 145, 66, 0.12)",
  buttonSecondaryBackground: "transparent",
  buttonSecondaryText: "#93a4b8",
  buttonSecondaryBorder: "rgba(255, 255, 255, 0.1)",
  buttonSecondaryHoverBackground: "rgba(255, 255, 255, 0.04)",
  buttonBorderRadius: "0px",
  inputBackground: "rgba(7, 10, 14, 1)",
  inputBorder: "rgba(255, 255, 255, 0.1)",
  inputText: "#edf5ff",
  inputPlaceholder: "#708195",
  loadingSpinnerColor: "#ba9142",
  errorTextColor: "#ef4444",
  successTextColor: "#81d875",
  blurIntensity: 0,
  cardBorderRadius: "0px",
  cardPadding: "20px",
  spacing: "12px",
  cardHoverEffect: "",
  helpTitle: "Need help with a purchase?",
  helpBody: "Our support team is available around the clock for account and payment assistance.",
  helpCta: "OPEN SUPPORT →",
  helpTitleColor: "#edf5ff",
  helpBodyColor: "#9baabb",
  perksNote: "Ranks activate automatically after a completed purchase. Please allow up to 10 minutes to apply.",
} as const;

export const STORE_CARD_PALETTES = ["#92d36e", "#e4ae3a", "#e76e36", "#d6524b", "#b654b9"] as const;

const STALE_STORE_VALUES = new Set([
  "official store / season 12",
  "hsl(var(--background))",
  "hsl(var(--foreground))",
  "hsl(var(--card))",
  "hsl(var(--border))",
  "hsl(var(--muted-foreground))",
  "hsl(var(--accent))",
  "hsl(var(--accent-foreground))",
  "hsl(var(--primary))",
  "hsl(var(--primary-foreground))",
  "hsl(var(--destructive))",
  "hsl(var(--muted))",
  "hsl(var(--input))",
  "hsl(var(--ring))",
  "rgba(255, 255, 255, 0.05)",
  "rgba(255, 255, 255, 0.1)",
  "rgba(15,20,25,0.1)",
  "#52525b",
  "#71717a",
  "#b0b0b0",
  "#9ca3af",
  "#374151",
  "#ffffff",
  "#22c55e",
]);

export function withStoreDefaults<T extends object>(
  theme?: T | null,
): typeof STORE_THEME_DEFAULTS & T {
  if (theme == null || typeof theme !== "object" || Array.isArray(theme)) {
    return { ...STORE_THEME_DEFAULTS } as typeof STORE_THEME_DEFAULTS & T;
  }
  const incoming = { ...(theme as Record<string, unknown>) };
  for (const [key, value] of Object.entries(incoming)) {
    if (typeof value === "string" && STALE_STORE_VALUES.has(value.toLowerCase())) {
      delete incoming[key];
    }
  }
  if (incoming.blurIntensity === 0.5) {
    delete incoming.blurIntensity;
  }
  if (incoming.cardBorderRadius === "0.375rem" || incoming.cardBorderRadius === "0.5rem") {
    delete incoming.cardBorderRadius;
  }
  return { ...STORE_THEME_DEFAULTS, ...incoming } as typeof STORE_THEME_DEFAULTS & T;
}

export function splitBrandName(name?: string | null): [string, string] {
  const parts = (name || "Magic Rust").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (parts.length === 0) return ["MAGIC", "RUST"];
  if (parts.length === 1) return [parts[0].toUpperCase(), ""];
  return [parts[0].toUpperCase(), parts[1].toUpperCase()];
}

export function stripSectionHeading(title: string): string {
  return title.replace(/<[^>]+>/g, "").replace(/^\d+\.\s*/, "").trim();
}
