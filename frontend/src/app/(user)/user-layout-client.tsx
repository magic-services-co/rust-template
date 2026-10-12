"use client";

import { ReactNode } from "react";
import Footer from "@/components/footer";
import Navigation from "@/components/nav/nav";
import { NavigationItem } from "@/types/navigation";
import type { LayoutTheme } from "@/lib/layout-theme-defaults";
import { useLayoutChromeTheme } from "@/hooks/use-layout-chrome-theme";

export function UserLayoutClient({
  children,
  navItems,
  theme,
  siteName,
}: {
  children: ReactNode;
  navItems: NavigationItem[];
  theme: LayoutTheme | undefined;
  siteName?: string;
}) {
  const chrome = useLayoutChromeTheme(theme);
  const navTheme: LayoutTheme = {
    ...theme,
    logoImage: chrome.logoImage,
    primaryTitleColor: chrome.navWordmarkColor,
    navLinkColor: chrome.navLinkColor,
    navLinkHoverColor: chrome.navLinkHoverColor,
    navLinkActiveColor: chrome.navLinkActiveColor,
    primaryButtonBg: chrome.signInBackground,
    primaryButtonHover: chrome.signInHover,
    primaryButtonText: chrome.signInText,
  };

  return (
    <>
      <Navigation navigationItems={navItems} theme={navTheme} siteName={siteName} />
      <div className="relative z-0 flex min-h-screen flex-col">
        <main className="relative z-0 isolate flex flex-1 flex-col text-foreground">
          {children ?? null}
        </main>
        <Footer navigationItems={navItems} theme={navTheme} chrome={chrome} siteName={siteName} />
        <div
          className="pointer-events-none fixed inset-0 -z-10 h-screen max-h-screen w-screen max-w-screen bg-cover"
          style={{
            backgroundImage: `url('${theme?.backgroundImage || "/images/legal-hero.png"}')`,
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
            opacity: (theme?.backgroundOpacity ?? 10) / 100,
          }}
        />
      </div>
    </>
  );
}
