"use client";

import { ReactNode } from "react";
import { withSupportDefaults } from "@/lib/layout-theme-defaults";

export function SupportPageShell({
  children,
  theme,
  wide = false,
}: {
  children: ReactNode;
  theme?: Record<string, unknown>;
  wide?: boolean;
}) {
  const t = withSupportDefaults(theme);

  return (
    <div className="relative flex-1 bg-[#05070a]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[570px] overflow-hidden opacity-[0.54]"
      >
        <img
          src="/images/legal-hero.png"
          alt=""
          className="h-[216%] w-full max-w-none object-cover object-top"
        />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[570px]"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(5,7,10,0.32) 0px, rgba(5,7,10,0.5) 160px, rgba(5,7,10,0.78) 320px, #05070a 430px, #05070a 570px)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[570px]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 84% 7%, rgba(186,145,66,0.09) 0%, rgba(186,145,66,0) 26%)",
        }}
      />
      <div
        className={
          wide
            ? "support-page relative mx-auto w-full max-w-[1760px] px-4 pb-12 pt-[157px] sm:px-6 lg:px-10"
            : "support-page relative mx-auto w-full max-w-[1200px] px-4 pb-12 pt-[157px] sm:px-6"
        }
        style={{
          ["--support-kicker" as string]: t.kickerColor,
          ["--support-title" as string]: t.titleColor,
          ["--support-subtitle" as string]: t.subtitleColor,
          ["--support-card-title" as string]: t.categoryCardTitleColor,
        }}
      >
        {children}
      </div>
    </div>
  );
}
