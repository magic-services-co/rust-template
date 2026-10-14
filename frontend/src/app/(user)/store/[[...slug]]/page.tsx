import { getProducts } from "@/app/actions/store";
import StoreContent from '@/components/store/store-content';
import StoreContentTabsLeft from '@/components/store/store-content-tabs-left';
import StoreContentAllPacks from '@/components/store/store-content-all-packs';
import { backendApi } from "@/lib/api";
import { getMetadata, requestOrigin, requestPublicPath } from "@/lib/metadata";
import { parsePageTheme } from "@/lib/parse-page-theme";
import { jsonLdHtml, storeProductList } from "@/lib/structured-data";
import type { NavLink } from "@/types/store";
import { headers } from "next/headers";
import { Suspense } from "react";

export const revalidate = 300;

export async function generateMetadata() {
  return await getMetadata('store');
}

export default async function StorePage({ params }: { params: Promise<{ slug?: string[] }> }) {
    const { slug } = await params;
    const headersList = await headers();
    const siteRes = await fetch(backendApi("data?include=siteSettings"), { headers: { Accept: "application/json" }, next: { revalidate: 60, tags: ["public-pages"] } });
    const siteData = siteRes.ok ? await siteRes.json() : {};
    const siteSettings = siteData.siteSettings;
    const showAdaptive = (siteSettings as { showAdaptiveCurrencyOnStorefront?: boolean } | null)?.showAdaptiveCurrencyOnStorefront !== false;

    const options: { countryCode?: string } = {};
    if (showAdaptive) {
        const country =
            headersList.get("x-vercel-ip-country") ||
            headersList.get("cf-ipcountry") ||
            headersList.get("cloudfront-viewer-country");
        const code = country?.toUpperCase();
        if (code && /^[A-Z]{2}$/.test(code) && code !== "XX" && code !== "T1") {
            options.countryCode = code;
        }
    }

    const pageRes = await fetch(backendApi("data?include=pageTheme:store"), { headers: { Accept: "application/json" }, next: { revalidate: 60, tags: ["public-pages"] } });
    const pageData = pageRes.ok ? await pageRes.json() : {};
    const pageTheme = pageData.pageTheme;
    const products = await getProducts(Object.keys(options).length ? options : undefined);

    const theme = parsePageTheme(pageTheme && "settings" in pageTheme ? pageTheme.settings : undefined, "store");
    const layoutPreset = (theme?.layoutPreset as string | undefined) || "default";
    const path = (await requestPublicPath()) ?? "/store";
    const origin = await requestOrigin();
    const pageUrl = origin ? `${origin}${path}` : path;
    let navlinks: NavLink[] = [];
    if (layoutPreset !== "all-packs") {
        const navRes = await fetch(backendApi("store/navlinks"), {
            headers: { Accept: "application/json" },
            next: { revalidate: 60, tags: ["public-pages"] },
        });
        const navJson = navRes.ok ? await navRes.json() : [];
        navlinks = Array.isArray(navJson) ? navJson as NavLink[] : [];
    }
    const productList = storeProductList(products.data ?? [], navlinks, slug || [], layoutPreset, pageUrl);

    return (
        <>
        {productList ? (
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: jsonLdHtml({ "@context": "https://schema.org", "@graph": [productList] }),
                }}
            />
        ) : null}
        <Suspense fallback={<div className="min-h-[300px]" />}>
            {layoutPreset === 'tabs-left' ? (
                <StoreContentTabsLeft 
                    initialProducts={products.data} 
                    params={{ slug: slug || [] }}
                    theme={theme}
                />
            ) : layoutPreset === 'all-packs' ? (
                <StoreContentAllPacks 
                    initialProducts={products.data} 
                    theme={theme}
                />
            ) : (
                <StoreContent 
                    initialProducts={products.data} 
                    params={{ slug: slug || [] }}
                    theme={theme}
                />
            )}
        </Suspense>
        </>
    );
}