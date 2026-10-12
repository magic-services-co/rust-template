export type ThemeOverridePayload = {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
  radius: string;
  primaryTitleColor: string;
  secondaryTextColor: string;
  linkAccentColor: string;
  navLinkColor: string;
  navLinkHoverColor: string;
  navLinkActiveColor: string;
  mutedTextColor: string;
  fontFamily: string;
  primaryButtonBg: string;
  primaryButtonHover: string;
  primaryButtonText: string;
  secondaryButtonBg: string;
  secondaryButtonHover: string;
  secondaryButtonText: string;
  cardBgDefault: string;
  cardBgHover: string;
  inputBorderColor: string;
  backgroundImage: string;
  logoImage: string;
  backgroundOpacity: number;
};

export function buildThemeOverrideCss(settings: ThemeOverridePayload): string {
  return `
      :root {
        --background: ${settings.background};
        --foreground: ${settings.foreground};
        --card: ${settings.card};
        --card-foreground: ${settings.cardForeground};
        --popover: ${settings.popover};
        --popover-foreground: ${settings.popoverForeground};
        --primary: ${settings.primary};
        --primary-foreground: ${settings.primaryForeground};
        --secondary: ${settings.secondary};
        --secondary-foreground: ${settings.secondaryForeground};
        --muted: ${settings.muted};
        --muted-foreground: ${settings.mutedForeground};
        --accent: ${settings.accent};
        --accent-foreground: ${settings.accentForeground};
        --destructive: ${settings.destructive};
        --destructive-foreground: ${settings.destructiveForeground};
        --border: ${settings.border};
        --input: ${settings.input};
        --ring: ${settings.ring};
        --radius: ${settings.radius};
      }

      * {
        font-family: ${settings.fontFamily} !important;
      }

      h1, h2, h3, h4, h5, h6 {
        color: ${settings.primaryTitleColor} !important;
      }

      p, span:not(button span), div:not(button div):not(a div) {
        color: ${settings.secondaryTextColor} !important;
      }

      a:not(nav a) {
        color: ${settings.linkAccentColor} !important;
      }

      nav a {
        color: ${settings.navLinkColor} !important;
      }

      nav a:hover {
        color: ${settings.navLinkHoverColor} !important;
      }

      nav a.active, nav a[aria-current] {
        color: ${settings.navLinkActiveColor} !important;
      }

      button:not([class*="secondary"]):not([class*="outline"]):not([class*="ghost"]):not([class*="destructive"]):not([class*="link"]):not(.layout-sign-in):not(.layout-toc-item),
      .bg-primary {
        background-color: ${settings.primaryButtonBg} !important;
        color: ${settings.primaryButtonText} !important;
      }

      button:not([class*="secondary"]):not([class*="outline"]):not([class*="ghost"]):not([class*="destructive"]):not([class*="link"]):not(.layout-sign-in):not(.layout-toc-item):hover,
      .bg-primary:hover {
        background-color: ${settings.primaryButtonHover} !important;
      }

      button[class*="secondary"],
      .bg-secondary {
        background-color: ${settings.secondaryButtonBg} !important;
        color: ${settings.secondaryButtonText} !important;
      }

      button[class*="secondary"]:hover,
      .bg-secondary:hover {
        background-color: ${settings.secondaryButtonHover} !important;
      }

      .card, [class*="card"] {
        background-color: ${settings.cardBgDefault} !important;
      }

      .card:hover, [class*="card"]:hover {
        background-color: ${settings.cardBgHover} !important;
      }

      input, textarea, select {
        border-color: ${settings.inputBorderColor} !important;
      }

      .text-muted, .text-muted-foreground, [class*="muted"] {
        color: ${settings.mutedTextColor} !important;
      }
    `;
}

export function buildSiteThemeCss(settings: ThemeOverridePayload): string {
  const color = (value: string) => value.replace(/[\n\r\0]/g, " ");
  const vars: Array<[string, string]> = [
    ["--background", settings.background],
    ["--foreground", settings.foreground],
    ["--card", settings.card],
    ["--card-foreground", settings.cardForeground],
    ["--popover", settings.popover],
    ["--popover-foreground", settings.popoverForeground],
    ["--primary", settings.primary],
    ["--primary-foreground", settings.primaryForeground],
    ["--secondary", settings.secondary],
    ["--secondary-foreground", settings.secondaryForeground],
    ["--muted", settings.muted],
    ["--muted-foreground", settings.mutedForeground],
    ["--accent", settings.accent],
    ["--accent-foreground", settings.accentForeground],
    ["--destructive", settings.destructive],
    ["--destructive-foreground", settings.destructiveForeground],
    ["--border", settings.border],
    ["--input", settings.input],
    ["--ring", settings.ring],
    ["--radius", settings.radius],
  ];

  return `
      :root {
        ${vars.map(([name, value]) => `${name}: ${color(value)};`).join("\n        ")}
      }

      h1, h2, h3, h4, h5, h6 {
        color: ${color(settings.primaryTitleColor)} !important;
      }

      p, span, div {
        color: ${color(settings.secondaryTextColor)};
      }

      a {
        color: ${color(settings.linkAccentColor)} !important;
      }

      nav a {
        color: ${color(settings.navLinkColor)} !important;
      }

      nav a:hover {
        color: ${color(settings.navLinkHoverColor)} !important;
      }

      nav a.active, nav a[aria-current="page"] {
        color: ${color(settings.navLinkActiveColor)} !important;
      }

      .text-muted, .text-muted-foreground {
        color: ${color(settings.mutedTextColor)} !important;
      }

      header a:not(nav a) { color: inherit !important; }
      .site-footer a, .site-footer button { color: var(--footer-link-color, #c5d0de) !important; }
      .legal-page h1, .legal-page h2, .legal-page h3, .legal-page h4 { color: unset !important; }
      .legal-page a { color: inherit !important; }
      button.layout-sign-in, button.layout-toc-item { background-color: transparent; }
    `;
}

export function applyLayoutThemeMedia(doc: Document, settings: ThemeOverridePayload): void {
  const layer = doc.querySelector<HTMLElement>("div.pointer-events-none.fixed.inset-0");
  if (layer && settings.backgroundImage) {
    layer.style.backgroundImage = `url('${settings.backgroundImage}')`;
    layer.style.backgroundPosition = "center";
    layer.style.backgroundRepeat = "no-repeat";
    layer.style.backgroundSize = "cover";
    layer.style.opacity = `${(settings.backgroundOpacity ?? 10) / 100}`;
  }

  if (!settings.logoImage) return;
  doc.querySelectorAll<HTMLImageElement>("header a img, footer a img").forEach((img) => {
    if (img.alt.toLowerCase().includes("logo")) {
      img.src = settings.logoImage;
    }
  });
}
