import type { MetadataRoute } from "next";

function siteOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_DOMAIN || process.env.FRONTEND_URL || "";
  if (!raw) return "";
  const withProtocol = raw.includes("://") ? raw : `https://${raw}`;
  return withProtocol.replace(/\/$/, "");
}

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteOrigin();
  if (!origin) return [];
  const paths = [
    "/",
    "/servers",
    "/store",
    "/leaderboard",
    "/maps",
    "/rules",
    "/support",
    "/bans",
    "/terms-of-service",
    "/privacy-policy",
  ];
  return paths.map((path) => ({
    url: path === "/" ? origin : `${origin}${path}`,
    changeFrequency: "daily",
  }));
}
