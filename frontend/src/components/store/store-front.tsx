"use client";

import type { ReactNode } from "react";

import StoreHero from "@/components/store/store-hero";
import { StorePageShell } from "@/components/store/store-page-shell";
import { usePublicFront } from "@/lib/public-front";

export function StoreFront({
  theme,
  showSidebar,
  children,
}: {
  theme?: Record<string, unknown>;
  showSidebar: boolean;
  children: ReactNode;
}) {
  const Frame = usePublicFront().slots.storeFrame;
  if (Frame) {
    return (
      <StorePageShell theme={theme} plain>
        <Frame theme={theme} showSidebar={showSidebar}>
          {children}
        </Frame>
      </StorePageShell>
    );
  }

  return (
    <StorePageShell theme={theme}>
      <StoreHero theme={theme} showSidebar={showSidebar}>
        {children}
      </StoreHero>
    </StorePageShell>
  );
}
