import type { MetadataRoute } from "next";
import { backendApi } from "@/lib/api";

function siteOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_DOMAIN || process.env.FRONTEND_URL || "";
  if (!raw) return "";
  const withProtocol = raw.includes("://") ? raw : `https://${raw}`;
  return withProtocol.replace(/\/$/, "");
}

const FALLBACK_PATHS = [
  "/",
  "/servers",
  "/store",
  "/leaderboard",
  "/maps",
  "/support",
  "/link",
  "/bans",
  "/terms-of-service",
  "/privacy-policy",
];

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = siteOrigin();
  if (!origin) return [];

  let paths = FALLBACK_PATHS;
  try {
    const res = await fetch(backendApi("sitemap"), {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const data = (await res.json()) as { paths?: unknown };
      if (Array.isArray(data.paths)) {
        const next = data.paths.filter((path): path is string => typeof path === "string" && path.startsWith("/"));
        paths = next;
      }
    }
  } catch {
    paths = FALLBACK_PATHS;
  }

  return paths.map((path) => ({
    url: path === "/" ? origin : `${origin}${path}`,
    changeFrequency: "daily",
  }));
}
