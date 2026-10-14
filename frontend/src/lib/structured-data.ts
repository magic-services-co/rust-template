import { backendApi } from "@/lib/api";
import type { NavLink, Product } from "@/types/store";

export type JsonLd = Record<string, unknown>;

export function jsonLdHtml(data: JsonLd | JsonLd[]): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

type ServerRow = {
  name?: string;
  attributes?: { players?: number };
};

export async function serversItemList(pageUrl: string): Promise<JsonLd | null> {
  try {
    const res = await fetch(backendApi("servers-data"), {
      headers: { Accept: "application/json" },
      next: { revalidate: 60, tags: ["public-pages"] },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { data?: ServerRow[] };
    const servers = (data.data ?? [])
      .map((server) => {
        const name = (server.name ?? "").trim();
        const players = server.attributes?.players;
        return {
          name,
          players: typeof players === "number" && Number.isFinite(players) ? players : undefined,
        };
      })
      .filter((server) => server.name !== "")
      .slice(0, 50);
    if (servers.length === 0) return null;

    return {
      "@type": "ItemList",
      "@id": `${pageUrl}#servers`,
      name: "Servers",
      itemListElement: servers.map((server, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "GameServer",
          name: server.name,
          game: { "@type": "VideoGame", name: "Rust" },
          url: pageUrl,
          ...(server.players !== undefined ? { playersOnline: server.players } : {}),
        },
      })),
    };
  } catch {
    return null;
  }
}

function productEnabled(product: Product): boolean {
  if (!product.enabled_at && !product.enabled_until) return true;
  const now = Date.now();
  const enabledAt = product.enabled_at ? new Date(product.enabled_at as string).getTime() : null;
  const enabledUntil = product.enabled_until ? new Date(product.enabled_until as string).getTime() : null;
  if (enabledAt !== null && !Number.isNaN(enabledAt) && now < enabledAt) return false;
  if (enabledUntil !== null && !Number.isNaN(enabledUntil) && now > enabledUntil) return false;
  return true;
}

function tagInTree(tag: string, link: NavLink): boolean {
  if (!tag) return false;
  if (link.tag_slug === tag) return true;
  return (link.children ?? []).some((child) => tagInTree(tag, child));
}

function categoryForSlug(navlinks: NavLink[], slug: string[]): NavLink | undefined {
  if (navlinks.length === 0) return undefined;
  if (slug.length === 0) return navlinks[0];
  let level = navlinks;
  let current: NavLink | undefined;
  for (const part of slug) {
    current = level.find((link) => link.tag_slug === part);
    if (!current) return navlinks[0];
    level = current.children ?? [];
  }
  return current ?? navlinks[0];
}

function visiblePrice(product: Product): { name: string; price: string } | null {
  const name = typeof product.name === "string" ? product.name.trim() : "";
  if (!name) return null;
  const pricing = product.pricing as { price_final?: number } | undefined;
  const cents = typeof pricing?.price_final === "number"
    ? pricing.price_final
    : typeof product.price === "number"
      ? product.price
      : null;
  if (cents === null || !Number.isFinite(cents) || cents <= 0) return null;
  return { name, price: (cents / 100).toFixed(2) };
}

export function storeProductList(
  products: Product[],
  navlinks: NavLink[],
  slug: string[],
  layoutPreset: string,
  pageUrl: string,
): JsonLd | null {
  const category = layoutPreset === "all-packs" ? undefined : categoryForSlug(navlinks, slug);
  const offers = products
    .filter((product) => productEnabled(product))
    .filter((product) => {
      if (!category) return true;
      return (product.tags ?? []).some((tag) => tagInTree(tag.slug ?? "", category));
    })
    .map(visiblePrice)
    .filter((row): row is { name: string; price: string } => row !== null)
    .slice(0, 50);

  if (offers.length === 0) return null;

  return {
    "@type": "ItemList",
    "@id": `${pageUrl}#products`,
    name: "Store",
    itemListElement: offers.map((offer, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Product",
        name: offer.name,
        url: pageUrl,
        offers: {
          "@type": "Offer",
          price: offer.price,
          priceCurrency: "USD",
          url: pageUrl,
        },
      },
    })),
  };
}
