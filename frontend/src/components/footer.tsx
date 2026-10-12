"use client";

import Link from "next/link";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { CookiePreferencesLink } from "./cookie-preferences-link";
import { BrandMark } from "@/components/brand-mark";
import { NavigationItem } from "@/types/navigation";
import {
  LAYOUT_THEME_DEFAULTS,
  LEGAL_THEME_DEFAULTS,
  withLayoutDefaults,
  type LayoutTheme,
} from "@/lib/layout-theme-defaults";
import type { LayoutChromeTheme } from "@/lib/layout-chrome-defaults";

function isAssistanceItem(item: NavigationItem): boolean {
  const haystack = `${item.label} ${item.url}`.toLowerCase();
  return /support|status|ticket|help/.test(haystack);
}

function isHomeItem(item: NavigationItem): boolean {
  return item.url === "/" || item.label.toLowerCase() === "home";
}

export default function Footer({
  navigationItems = [],
  theme,
  chrome,
  siteName,
}: {
  navigationItems?: NavigationItem[];
  theme?: LayoutTheme;
  chrome?: LayoutChromeTheme;
  siteName?: string;
}) {
  const { data: settings } = useSiteSettings();
  const t = withLayoutDefaults(theme);
  const name = (settings?.name || siteName || "Magic Rust").replace(/[\s\u00a0\u2000-\u200b\ufeff]+/g, " ").trim();
  const year = new Date().getFullYear();
  const visible = navigationItems.filter((item) => !item.hidden && !isHomeItem(item));
  const assistance = visible.filter(isAssistanceItem);
  const explore = visible.filter((item) => !isAssistanceItem(item));
  const linkColor = chrome?.footerLinkColor || "#c5d0de";
  const headingColor = chrome?.footerHeadingColor || "#9fb8cf";
  const muted = chrome?.footerMutedColor || "rgba(159,172,192,0.48)";
  const taglineColor = chrome?.footerTaglineColor || "rgba(202,216,233,0.65)";
  const tagline =
    chrome?.footerTagline ||
    (typeof settings?.siteDescription === "string" && settings.siteDescription) ||
    LEGAL_THEME_DEFAULTS.footerTagline;
  const establishedYear = chrome?.footerEstablishedYear || LEGAL_THEME_DEFAULTS.establishedYear;
  const footerBg = chrome?.footerBackground || "#05070a";
  const footerBorder = chrome?.footerBorder || "rgba(49,58,67,0.2)";
  const wordmarkColor = chrome?.footerWordmarkColor || t.primaryTitleColor;

  const discordUrl = typeof settings?.discordInvite === "string" ? settings.discordInvite : "";
  const steamUrl = typeof settings?.steamGroupUrl === "string" ? settings.steamGroupUrl : "";
  const youtubeUrl =
    typeof settings?.youtubeUrl === "string" && settings.youtubeUrl
      ? settings.youtubeUrl
      : "https://www.youtube.com";

  const socials = [
    { name: "YouTube", href: youtubeUrl, src: "/images/social/youtube.svg" },
    { name: "Discord", href: discordUrl || "https://discord.com", src: "/images/social/discord.svg" },
    { name: "Steam", href: steamUrl || "https://steamcommunity.com", src: "/images/social/steam.svg" },
  ];

  return (
    <footer
      className="site-footer relative z-20 shrink-0 overflow-hidden border-t shadow-[inset_0px_1px_0px_0px_rgba(255,255,255,0.02)]"
      style={{ backgroundColor: footerBg, borderColor: footerBorder }}
      data-theme-field="footerBackground"
      data-theme-label="Footer"
    >
      <div className="relative mx-auto max-w-[1196px] px-[42px] py-[34px]">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-[366px] shrink-0">
            <span data-theme-field="footerWordmarkColor" data-theme-label="Footer wordmark">
              <BrandMark logoImage={t.logoImage} wordmarkColor={wordmarkColor} size="footer" siteName={siteName} />
            </span>
            <p
              className="mt-[18px] max-w-[314px] text-[12px] font-normal leading-[18.6px]"
              style={{ color: taglineColor }}
              data-theme-field="footerTagline"
              data-theme-label="Footer tagline"
            >
              {tagline}
            </p>
          </div>

          <div className="grid min-w-[286px] grid-cols-2 gap-x-7">
            <p
              className="pt-1 text-[9px] font-normal leading-[9px] tracking-[1.4px]"
              style={{ color: headingColor }}
              data-theme-field="footerHeadingColor"
              data-theme-label="Footer headings"
            >
              EXPLORE
            </p>
            <p className="pt-1 text-[9px] font-normal leading-[9px] tracking-[1.4px]" style={{ color: headingColor }}>
              ASSISTANCE
            </p>
            <div className="mt-4 flex flex-col gap-[10px]">
              {explore.map((item) => (
                <Link
                  key={item.id || item.url}
                  href={item.url}
                  className="text-[12px] leading-[16.2px] transition-opacity hover:opacity-80"
                  style={{ color: linkColor }}
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="mt-4 flex flex-col gap-[10px]">
              {assistance.map((item) => (
                <Link
                  key={item.id || item.url}
                  href={item.url}
                  className="text-[12px] leading-[16.2px] transition-opacity hover:opacity-80"
                  style={{ color: linkColor }}
                >
                  {item.label}
                </Link>
              ))}
              {assistance.length === 0 ? (
                <Link href="/support" className="text-[12px] leading-[16.2px]" style={{ color: linkColor }}>
                  Support
                </Link>
              ) : null}
            </div>
          </div>

          <div className="w-[132px] shrink-0">
            <p className="pt-1 text-[9px] font-normal leading-[9px] tracking-[1.4px]" style={{ color: headingColor }}>
              OTHER
            </p>
            <div className="mt-4 flex flex-col gap-[10px]" data-theme-field="footerLinkColor" data-theme-label="Footer links">
              <Link href="/terms-of-service" className="text-[12px] leading-[16.2px] hover:opacity-80" style={{ color: linkColor }}>
                Terms of Service
              </Link>
              <Link href="/privacy-policy" className="text-[12px] leading-[16.2px] hover:opacity-80" style={{ color: linkColor }}>
                Privacy Policy
              </Link>
              <CookiePreferencesLink
                className="self-start text-left text-[12px] leading-[16.2px] hover:opacity-80"
                style={{ color: linkColor }}
              />
            </div>
          </div>

          <div className="min-w-[196px] shrink-0">
            <p className="pt-1 text-[9px] font-normal leading-[9px] tracking-[1.4px]" style={{ color: headingColor }}>
              JOIN THE COMMUNITY
            </p>
            <div className="mt-4 flex gap-[10px]">
              {socials.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={social.name}
                  className="flex h-11 w-[50px] items-center justify-center rounded-lg border border-[rgba(242,247,255,0.5)] bg-white/[0.06]"
                >
                  <img src={social.src} alt="" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div
        className="relative mx-auto flex max-w-[1112px] items-center justify-between border-t px-[18px] py-4"
        style={{ borderColor: footerBorder }}
      >
        <p
          className="text-[9px] font-normal leading-[11.7px] tracking-[0.68px]"
          style={{ color: muted }}
          data-theme-field="footerMutedColor"
          data-theme-label="Footer copyright"
        >
          © {year} {name.trim()}. All rights reserved.
        </p>
        <p
          className="text-[9px] font-normal leading-[11.7px] tracking-[0.68px]"
          style={{ color: muted }}
          data-theme-field="footerEstablishedYear"
          data-theme-label="Established year"
        >
          EST. {establishedYear}
        </p>
      </div>
    </footer>
  );
}

export { LAYOUT_THEME_DEFAULTS };
