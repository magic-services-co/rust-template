import { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { backendApi } from "@/lib/api";
import { LicenseRequiredBlock } from "@/components/license-required-block";
import { UserLayoutClient } from "./user-layout-client";
import type { LayoutTheme } from "@/lib/layout-theme-defaults";
import type { NavigationItem } from "@/types/navigation";
import { installedFrontIds } from "@/addons/installed-ids";
import { PublicStructuredData } from "@/components/seo/public-structured-data";
import { getPublicChrome } from "@/lib/public-chrome";

export const metadata = {};

function clientFacingHost(headersList: Headers): string {
  const forwarded = headersList.get("x-forwarded-host");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "";
  }
  return headersList.get("host") ?? "";
}

export default async function UserLayout({ children }: { children: ReactNode }) {
  const headersList = await headers();
  const host = clientFacingHost(headersList);
  const pathname = headersList.get("x-pathname") ?? "";

  const pageHeaders = {
    Accept: "application/json",
    ...(host && { Host: host }),
    ...(host && { "X-Forwarded-Host": host }),
  };
  const setupPromise = pathname.startsWith("/setup")
    ? Promise.resolve(null)
    : fetch(backendApi("setup/status?lite=1"), {
        headers: pageHeaders,
        cache: "no-store",
        signal: AbortSignal.timeout(4000),
      }).catch(() => null);

  const [setupRes, licenseRes, data, addonsRes] = await Promise.all([
    setupPromise,
    fetch(backendApi("license/status"), {
      headers: pageHeaders,
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    }).catch(() => null),
    getPublicChrome(),
    fetch(backendApi("addons"), {
      headers: pageHeaders,
      next: { revalidate: 30, tags: ["public-pages"] },
      signal: AbortSignal.timeout(4000),
    }).catch(() => null),
  ]);

  if (setupRes?.ok) {
    const setupJson = (await setupRes.json()) as { wizardPending?: boolean };
    if (setupJson.wizardPending === true) {
      redirect("/setup");
    }
  }

  const licenseData = licenseRes?.ok
    ? await licenseRes.json()
    : {
        valid: false,
        message: "The license check failed on the server. Enter your key again, and if it still stays on this page the saved key could not be read.",
      };

  if (licenseData.valid !== true) {
    return (
      <LicenseRequiredBlock message={licenseData.message} />
    );
  }

  const navItems = (Array.isArray(data.navigationItems) ? data.navigationItems : []) as NavigationItem[];
  const theme = data.themeSettings as LayoutTheme | undefined;
  const siteName = typeof data.siteSettings?.name === "string" ? data.siteSettings.name : undefined;
  const addonsJson = addonsRes?.ok ? await addonsRes.json() : { addons: [] };
  const enabledIds = new Set(
    (Array.isArray(addonsJson.addons) ? addonsJson.addons : [])
      .map((addon: { id?: string }) => addon.id)
      .filter((id: string | undefined): id is string => typeof id === "string"),
  );
  const initialFrontId = installedFrontIds.find((id) => enabledIds.has(id)) ?? null;

  const safeChildren = children ?? null;

  return (
    <UserLayoutClient navItems={navItems} theme={theme} siteName={siteName} initialFrontId={initialFrontId}>
      <PublicStructuredData />
      {safeChildren}
    </UserLayoutClient>
  );
}
