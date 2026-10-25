"use client";

import { usePublicFront } from "@/lib/public-front";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavigationItem } from "@/types/navigation";
import React from "react";
import { LAYOUT_THEME_DEFAULTS } from "@/lib/layout-theme-defaults";

export function MainNav({
  items,
  theme,
}: {
  items: NavigationItem[];
  theme?: {
    navLinkColor?: string;
    navLinkHoverColor?: string;
    navLinkActiveColor?: string;
  };
}) {
  const path = usePathname();
  const AimNav = usePublicFront().slots.mainNav;
  const [hoveredItems, setHoveredItems] = React.useState<Record<number, boolean>>({});
  const visible = items.filter((item) => !item.hidden);

  if (AimNav) return <AimNav items={items} />;

  return (
    <nav
      className="flex items-center gap-8"
      data-theme-field="navLinkColor"
      data-theme-label="Nav links"
    >
      {visible.map((item, index) => {
        const isActive = item.url === path || (item.url !== "/" && path.startsWith(item.url));
        return (
          <Link
            key={item.id || index}
            href={item.url}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "relative py-2 text-[15px] font-medium leading-5 tracking-[0.01em] transition-colors",
              isActive && "active",
            )}
            style={{
              color: isActive
                ? theme?.navLinkActiveColor || LAYOUT_THEME_DEFAULTS.navLinkActiveColor
                : hoveredItems[index]
                  ? theme?.navLinkHoverColor || LAYOUT_THEME_DEFAULTS.navLinkHoverColor
                  : theme?.navLinkColor || LAYOUT_THEME_DEFAULTS.navLinkColor,
            }}
            onMouseEnter={() => setHoveredItems((prev) => ({ ...prev, [index]: true }))}
            onMouseLeave={() => setHoveredItems((prev) => ({ ...prev, [index]: false }))}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
