import { Suspense } from "react";
import { headers } from "next/headers";
import Content from "./content";
import { getMetadata } from "@/lib/metadata";
import { backendApi } from "@/lib/api";
import { parsePageTheme } from "@/lib/parse-page-theme";

export async function generateMetadata() {
  return await getMetadata("terms-of-service");
}

export default async function TermsPage() {
  const headersList = await headers();
  const host = headersList.get("x-forwarded-host")?.split(",")[0]?.trim() || headersList.get("host") || "";
  const res = await fetch(backendApi("data?include=pageTheme:terms-of-service"), {
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
  const legalTheme = parsePageTheme(settings, "terms-of-service");

  return (
    <Suspense>
      <Content legalTheme={legalTheme} />
    </Suspense>
  );
}
