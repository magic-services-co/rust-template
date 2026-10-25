import { CartProvider } from "@/components/context/store-context";
import { StoreThemeProvider } from "@/components/store-theme-provider";
import { StoreFront } from "@/components/store/store-front";
import { backendApi } from "@/lib/api";
import { parsePageTheme } from "@/lib/parse-page-theme";
import { withStoreDefaults } from "@/lib/layout-theme-defaults";
import Script from "next/script";

export default async function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const res = await fetch(backendApi("data?include=siteSettings,themeSettings,pageTheme:store"), {
    headers: { Accept: "application/json" },
    next: { revalidate: 60, tags: ["public-pages"] },
  });
  const data = res.ok ? await res.json() : {};
  const pageTheme = data.pageTheme;
  const rawSettings = pageTheme && "settings" in pageTheme ? pageTheme.settings : null;
  const settings =
    typeof rawSettings === "string"
      ? (() => {
          try {
            return JSON.parse(rawSettings);
          } catch {
            return {};
          }
        })()
      : rawSettings;
  const theme = withStoreDefaults(parsePageTheme(settings, "store"));
  const layoutPreset = theme.layoutPreset ?? "default";
  const showSidebar = layoutPreset === "default";

  return (
    <CartProvider>
      <Script src="https://cdn.paynow.gg/paynow-js/bundle.js" strategy="afterInteractive" defer />
      <StoreThemeProvider serverTheme={theme}>
        <StoreFront theme={theme} showSidebar={showSidebar}>
          {children}
        </StoreFront>
      </StoreThemeProvider>
    </CartProvider>
  );
}
