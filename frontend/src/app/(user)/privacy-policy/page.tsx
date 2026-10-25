import { Suspense } from "react";
import { headers } from "next/headers";
import Content from "./content";
import { getMetadata } from "@/lib/metadata";
import { backendApi } from "@/lib/api";
import { parsePageTheme } from "@/lib/parse-page-theme";
import { PublicFrontSwitch } from "@/lib/public-front";

export async function generateMetadata() {
  return await getMetadata("privacy-policy");
}

export default async function PrivacyPolicyPage() {
  const headersList = await headers();
  const host = headersList.get("x-forwarded-host")?.split(",")[0]?.trim() || headersList.get("host") || "";
  const res = await fetch(backendApi("data?include=pageTheme:privacy-policy"), {
    headers: {
      Accept: "application/json",
      ...(host && { Host: host }),
      ...(host && { "X-Forwarded-Host": host }),
    },
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
  const legalTheme = parsePageTheme(settings, "privacy-policy");

  return (
    <Suspense>
      <PublicFrontSwitch name="legalPage" slotProps={{ kind: "privacy" }}>
        <Content legalTheme={legalTheme} />
      </PublicFrontSwitch>
    </Suspense>
  );
}
