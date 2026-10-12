"use client";

import Link from "next/link";
import { useSiteSettings } from "@/hooks/use-site-settings";
import {
  LAYOUT_THEME_DEFAULTS,
  splitBrandName,
} from "@/lib/layout-theme-defaults";

export function BrandMark({
  logoImage,
  wordmarkColor,
  size = "header",
  siteName,
}: {
  logoImage?: string;
  wordmarkColor?: string;
  size?: "header" | "footer";
  siteName?: string;
}) {
  const { data: settings } = useSiteSettings();
  const [line1, line2] = splitBrandName(settings?.name || siteName);
  const color = wordmarkColor || LAYOUT_THEME_DEFAULTS.primaryTitleColor;
  const isFooter = size === "footer";
  const px = isFooter ? 48 : 50;
  const src = (logoImage || LAYOUT_THEME_DEFAULTS.logoImage).trim();

  return (
    <Link href="/" className="flex shrink-0 items-center" style={{ gap: isFooter ? 12 : 10 }}>
      <img
        src={src}
        alt="Server Logo"
        width={px}
        height={px}
        className="shrink-0 object-contain"
        style={{
          width: px,
          height: px,
          maxWidth: px,
          maxHeight: px,
          boxShadow: isFooter ? "0px 6px 24px 0px rgba(0,0,0,0.42)" : undefined,
        }}
      />
      <span className="flex flex-col items-start">
        <span
          className={
            isFooter
              ? "whitespace-nowrap text-[20px] font-extrabold leading-[15.6px] tracking-[1.65px]"
              : "whitespace-nowrap text-[12px] font-extrabold leading-[10.2px] tracking-[1.68px]"
          }
          style={{ color }}
        >
          {line1}
        </span>
        {line2 ? (
          <span
            className={
              isFooter
                ? "mt-[6px] whitespace-nowrap text-[15px] font-medium leading-[11.7px] tracking-[2.45px]"
                : "mt-[5px] whitespace-nowrap text-[10px] font-medium leading-[8.5px] tracking-[2.6px]"
            }
            style={{ color }}
          >
            {line2}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

