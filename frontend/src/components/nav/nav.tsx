"use client";

import { UserNav } from "@/components/nav/user-nav";
import { MainNav } from "@/components/nav/main-nav";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import MobileNav from "./mobile-nav";
import { NavigationItem } from "@/types/navigation";
import { BrandMark } from "@/components/brand-mark";
import {
  LAYOUT_THEME_DEFAULTS,
  withLayoutDefaults,
  type LayoutTheme,
} from "@/lib/layout-theme-defaults";

export default function Navigation({
  navigationItems,
  theme,
  siteName,
}: {
  navigationItems: NavigationItem[];
  theme?: LayoutTheme;
  siteName?: string;
}) {
  const [isScrolled, setIsScrolled] = useState(false);
  const t = withLayoutDefaults(theme);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "site-header fixed inset-x-0 top-0 z-[100] w-full transform-gpu transition-colors duration-300",
        isScrolled && "is-scrolled",
      )}
      data-theme-field="navScrolledBackground"
      data-theme-label="Navigation"
    >
      <div className="mx-auto hidden h-[94px] max-w-[1200px] items-center justify-between px-4 md:flex">
        <span data-theme-field="navWordmarkColor" data-theme-label="Nav wordmark">
          <BrandMark logoImage={t.logoImage} wordmarkColor={t.primaryTitleColor} size="header" siteName={siteName} />
        </span>
        <MainNav items={navigationItems} theme={t} />
        <UserNav theme={t} />
      </div>
      <div className="mx-auto flex h-[94px] max-w-[1200px] items-center justify-between px-4 md:hidden">
        <MobileNav
          items={navigationItems}
          logoImage={t.logoImage}
          wordmarkColor={t.primaryTitleColor}
          theme={t}
          siteName={siteName}
        />
      </div>
    </header>
  );
}

export { LAYOUT_THEME_DEFAULTS };
