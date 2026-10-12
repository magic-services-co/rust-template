"use client";

import { Product } from "@/types/store";
import { useCallback, useMemo, useState, type MouseEvent } from "react";
import { ProductDialog } from "./product-dialog";
import { useCartContext } from "../context/store-context";
import { STORE_CARD_PALETTES, splitBrandName, withStoreDefaults } from "@/lib/layout-theme-defaults";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { cn } from "@/lib/utils";
import { HomeCardCorners } from "@/components/home/home-card-corners";

function decodeHtml(value: string): string {
    const named: Record<string, string> = {
        nbsp: " ",
        amp: "&",
        lt: "<",
        gt: ">",
        quot: '"',
        apos: "'",
        middot: "·",
        bull: "•",
        ndash: "–",
        mdash: "—",
    };
    let text = value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, body: string) => {
        const key = body.toLowerCase();
        if (key.startsWith("#x")) {
            const code = Number.parseInt(key.slice(2), 16);
            return Number.isFinite(code) ? String.fromCodePoint(code) : entity;
        }
        if (key.startsWith("#")) {
            const code = Number.parseInt(key.slice(1), 10);
            return Number.isFinite(code) ? String.fromCodePoint(code) : entity;
        }
        return named[key] ?? entity;
    });
    if (text.includes("&")) text = text.replace(/&([a-z]+);/gi, (entity, body: string) => named[body.toLowerCase()] ?? entity);
    return text;
}

function featureBullets(html?: unknown): string[] {
    if (typeof html !== "string" || !html.trim()) return [];
    const withBreaks = html
        .replace(/<\/(li|p|div|h\d|tr)>/gi, "\n")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<li[^>]*>/gi, "\n");
    const text = decodeHtml(withBreaks.replace(/<[^>]+>/g, " "));
    return text
        .split(/\n+/)
        .map((line) => line.replace(/^[-•*]\s*/, "").replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .slice(0, 3);
}

export default function DisplayProduct({
    product,
    theme,
    hidePurchaseTypeSelector: _hidePurchaseTypeSelector = false,
    index = 0,
    categoryLabel,
}: {
    product: Product;
    theme?: any;
    hidePurchaseTypeSelector?: boolean;
    index?: number;
    categoryLabel?: string;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const { selectedPackage, setSelectedPackage } = useCartContext();
    const { data: siteSettings } = useSiteSettings();
    const t = withStoreDefaults(theme);
    const accent = STORE_CARD_PALETTES[index % STORE_CARD_PALETTES.length];
    const [brandLeft, brandRight] = splitBrandName(siteSettings?.name);
    const brand = [brandLeft, brandRight].filter(Boolean).join(" ");
    const productTitle = (product.name || "Package").trim();
    const showBrand = brand.toLowerCase() !== productTitle.toLowerCase();
    const bullets = useMemo(() => {
        const name = productTitle.toLowerCase();
        return featureBullets(product.description).filter((line) => line.toLowerCase() !== name);
    }, [product.description, productTitle]);
    const priceCents =
        ((product.pricing as { price_final?: number } | undefined)?.price_final ??
            (product.price as number | undefined) ??
            0);
    const price = (priceCents / 100).toFixed(2);
    const selected = selectedPackage?.id === product.id;
    const productImage =
        typeof product.image_url === "string" && product.image_url.trim()
            ? product.image_url
            : "/images/logo.svg";

    const handleSelect = useCallback(() => {
        if (selected) {
            setSelectedPackage(null);
            return;
        }
        setSelectedPackage({
            id: product.id,
            name: product.name ?? "Package",
            price: priceCents,
            allow_one_time_purchase: !!product.allow_one_time_purchase,
            allow_subscription: !!product.allow_subscription,
            single_game_server_only: !!product.single_game_server_only,
            gameservers: product.gameservers ?? [],
        });
    }, [product, priceCents, selected, setSelectedPackage]);

    const openDetails = useCallback((event: MouseEvent) => {
        event.stopPropagation();
        setIsOpen(true);
    }, []);

    return (
        <article
            className="store-pack group relative flex min-h-[350px] flex-col overflow-visible border shadow-[0px_18px_35px_0px_rgba(0,0,0,0.2)]"
            style={{
                backgroundColor: t.productCardBackground,
                borderColor: selected ? accent : t.productCardBorder,
                ["--store-pack-accent" as string]: accent,
                ["--store-pack-meta" as string]: t.productCardMetaColor,
                ["--store-pack-brand" as string]: t.productCardBrandColor,
                ["--store-pack-name" as string]: t.productCardTitleColor,
                ["--store-pack-feature" as string]: t.productCardDescriptionColor,
                ["--store-pack-price" as string]: t.productCardPriceColor,
                ["--store-pack-currency" as string]: t.productCardOriginalPriceColor,
            }}
        >
            <button
                type="button"
                className="ghost absolute inset-0 z-[1] cursor-pointer"
                onClick={handleSelect}
                aria-label={selected ? `Deselect ${product.name || "package"}` : `Select ${product.name || "package"}`}
            />
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-40"
                style={{
                    backgroundImage:
                        "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0) 1px), linear-gradient(90deg, rgba(255,255,255,0.06), rgba(0,0,0,0) 1px)",
                }}
            />
            <div className="pointer-events-none relative z-[2] flex min-h-[350px] flex-1 flex-col">
                <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.1)] px-5 py-3">
                    <p className="store-pack-index text-[9px] font-bold tracking-[1.8px]">#{index + 1}</p>
                    <p className="store-pack-meta text-[9px] tracking-[1.44px]">{categoryLabel || "PACKAGE ACCESS"}</p>
                </div>
                <div className="relative flex flex-1 flex-col overflow-hidden px-5 pb-5 pt-7">
                    <img
                        src={productImage}
                        alt=""
                        className="pointer-events-none absolute right-0 top-0 h-[210px] w-44 origin-top object-contain object-top opacity-[0.18] transition-transform duration-500 ease-out group-hover:scale-110"
                    />
                    <div className="pointer-events-none">
                        {showBrand ? (
                            <p className="store-pack-brand text-[10px] tracking-[1.8px]">{brand}</p>
                        ) : null}
                        <h2 className="store-pack-name line-clamp-2 pt-1 text-[24px] font-extrabold leading-7 tracking-[-1.6px] sm:text-[28px] sm:tracking-[-2.24px]">
                            {productTitle.toUpperCase()}
                        </h2>
                    </div>
                    <div className="pointer-events-none mt-5 h-px w-12" style={{ backgroundColor: accent }} />
                    <button
                        type="button"
                        className="ghost relative z-[2] flex min-h-[85px] flex-col pt-5 text-left pointer-events-auto"
                        onClick={openDetails}
                    >
                        <ul>
                        {bullets.length > 0 ? (
                            bullets.map((bullet, bulletIndex) => (
                                <li
                                    key={`${product.id}-feat-${bulletIndex}`}
                                    className={cn("flex items-center gap-2", bulletIndex > 0 && "pt-2")}
                                >
                                    <span className="size-1.5 shrink-0" style={{ backgroundColor: accent }} />
                                    <span className="store-pack-feature text-[11px] leading-[16.5px]">{bullet}</span>
                                </li>
                            ))
                        ) : (
                            <li className="store-pack-feature text-[11px] leading-[16.5px]">View details for included perks.</li>
                        )}
                        </ul>
                    </button>
                    <div className="mt-auto flex w-full items-end justify-between pt-6">
                        <div className="pointer-events-none text-left">
                            <p className="store-pack-meta text-[9px] tracking-[1.44px]">STARTING AT</p>
                            <p className="pt-1">
                                <span className="store-pack-price text-[18px] font-extrabold leading-7">${price}</span>
                                <span className="store-pack-currency ml-1.5 text-[10px] font-medium">USD</span>
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                className="ghost relative z-[2] store-help-cta pointer-events-auto px-2 py-2 text-[9px] font-bold tracking-[1.08px]"
                                onClick={openDetails}
                            >
                                DETAILS
                            </button>
                            <span className="pointer-events-none store-pack-select inline-flex items-center justify-center border px-3 py-2 text-[9px] font-bold tracking-[1.08px]">
                                {selected ? "SELECTED" : "SELECT"}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            <ProductDialog
                product={product}
                isOpen={isOpen}
                setIsOpen={setIsOpen}
                theme={t}
            />
            <HomeCardCorners color="var(--store-pack-accent, #ba9142)" show />
        </article>
    );
}
