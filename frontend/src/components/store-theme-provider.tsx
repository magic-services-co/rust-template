"use client";

import { useStoreTheme } from "@/hooks/use-store-theme";
import { withStoreDefaults } from "@/lib/layout-theme-defaults";

interface StoreThemeProviderProps {
  children: React.ReactNode;
  serverTheme?: Record<string, unknown>;
}

export function StoreThemeProvider({ children, serverTheme }: StoreThemeProviderProps) {
  const { data: clientTheme } = useStoreTheme();
  const theme = withStoreDefaults(clientTheme || serverTheme);

  const surface =
    !theme.backgroundColor || theme.backgroundColor === "transparent"
      ? "#05070a"
      : theme.backgroundColor;

  return (
    <div
      className="store-theme-surface flex flex-1 flex-col"
      style={{
        backgroundColor: surface,
        backdropFilter: theme.blurIntensity ? `blur(${theme.blurIntensity * 10}px)` : undefined,
      }}
    >
      {children}
    </div>
  );
}
