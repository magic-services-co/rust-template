import { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { backendApi } from "@/lib/api";
import { LicenseRequiredBlock } from "@/components/license-required-block";
import { UserLayoutClient } from "./user-layout-client";
import type { LayoutTheme } from "@/lib/layout-theme-defaults";
import { installedFrontIds } from "@/addons/installed-ids";
import { PublicStructuredData } from "@/components/seo/public-structured-data";

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

  if (!pathname.startsWith("/setup")) {
    const setupRes = await fetch(backendApi("setup/status"), {
      headers: {
        Accept: "application/json",
        ...(host && { Host: host }),
        ...(host && { "X-Forwarded-Host": host }),
      },
      cache: "no-store",
    });
    if (setupRes.ok) {
      const setupJson = (await setupRes.json()) as { wizardPending?: boolean };
      if (setupJson.wizardPending === true) {
        redirect("/setup");
      }
    }
  }

  const licenseRes = await fetch(backendApi("license/status"), {
    headers: {
      Accept: "application/json",
      ...(host && { Host: host }),
      ...(host && { "X-Forwarded-Host": host }),
    },
    cache: "no-store",
  });
  const licenseData = licenseRes.ok ? await licenseRes.json() : { valid: false };

  if (licenseData.valid !== true) {
    return (
      <LicenseRequiredBlock message={licenseData.message} />
    );
  }

  const pageHeaders = {
    Accept: "application/json",
    ...(host && { Host: host }),
    ...(host && { "X-Forwarded-Host": host }),
  };
  const [res, addonsRes] = await Promise.all([
    fetch(backendApi("data?include=navigationItems,themeSettings,siteSettings"), {
      headers: pageHeaders,
      next: { revalidate: 60, tags: ["public-pages"] },
    }),
    fetch(backendApi("addons"), {
      headers: pageHeaders,
      cache: "no-store",
    }),
  ]);

  if (res.status === 403) {
    let body: { error?: string; message?: string } = {};
    try {
      body = await res.json();
    } catch {
      // ignore
    }
    if (body.error === "license_required") {
      return (
        <LicenseRequiredBlock message={body.message} />
      );
    }
  }

  const data = res.ok ? await res.json() : {};
  const navItems = Array.isArray(data.navigationItems) ? data.navigationItems : [];
  const theme = data.themeSettings as LayoutTheme | undefined;
  const siteName = typeof data.siteSettings?.name === "string" ? data.siteSettings.name : undefined;
  const addonsJson = addonsRes.ok ? await addonsRes.json() : { addons: [] };
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
