"use client";

import Server from "@/components/server";
import useServerData, { EnhancedServerData } from "@/hooks/use-server-data";
import { Skeleton } from "@/components/ui/skeleton";
import { useSiteSettings } from "@/hooks/use-site-settings";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { HomeCardCorners } from "@/components/home/home-card-corners";
import { compareServersByRankThenPlayers, serverAlign } from "@/lib/server-display";
import { cn } from "@/lib/utils";

interface HomeServersProps {
    ctaLabel?: string;
    ctaHref?: string;
    showCta?: boolean;
    ctaStyle?: CSSProperties;
    limit?: number;
}

function ServerCardWrap({ children }: { children: ReactNode }) {
    return (
        <div
            className="home-server-wrap relative"
            data-theme-field="serversCardBackground"
            data-theme-label="Server card fill"
        >
            {children}
        </div>
    );
}

export default function HomeServers({
    ctaLabel = "VIEW ALL SERVERS",
    ctaHref = "/servers",
    showCta = true,
    ctaStyle,
    limit = 6,
}: HomeServersProps) {
    const siteSettings = useSiteSettings();
    const { serverList: serverQueries, isLoading, isError } = useServerData();

    if (siteSettings.isLoading || isLoading) {
        return (
            <div className="home-servers-grid">
                {[...Array(Math.min(6, limit))].map((_, i) => (
                    <Skeleton key={i} className="h-[211px] w-full" />
                ))}
            </div>
        );
    }

    if (isError) {
        return null;
    }

    const allServers: EnhancedServerData[] = serverQueries
        .map(query => query.data)
        .filter((server): server is EnhancedServerData => server !== undefined);

    const useTags = siteSettings.data?.serversUseTags === true;
    const align = serverAlign(siteSettings.data?.serversAlign);
    const sortedServers = useTags
        ? [...allServers].sort(compareServersByRankThenPlayers)
        : [...allServers].sort((a, b) => (b.attributes.players || 0) - (a.attributes.players || 0));

    const topServers = sortedServers.slice(0, limit);
    const hasMoreServers = sortedServers.length > limit;

    return (
        <div className="relative">
            <div className={cn("home-servers-grid", align === "center" && "align-center", align === "rtl" && "align-rtl")}>
                {topServers.length === 0 ? (
                    <ServerCardWrap>
                        <article className="server-card relative flex min-h-[211px] flex-col items-center justify-center overflow-visible border p-[17px]">
                            <p className="server-card-muted text-center text-[13px]">No servers to show yet.</p>
                            <HomeCardCorners color="var(--home-servers-corner, #ba9142)" show />
                        </article>
                    </ServerCardWrap>
                ) : (
                    topServers.map((server, index) => (
                        <ServerCardWrap key={server.id}>
                            <Server
                                data={server}
                                copyServerAddress={siteSettings.data?.copyServerAddress || false}
                                categoryName={server.categoryName}
                                tags={server.tags}
                                featured={useTags && index === 0}
                            />
                        </ServerCardWrap>
                    ))
                )}
            </div>
            {showCta && hasMoreServers ? (
                <div className="flex justify-center pt-8">
                    <Link
                        href={ctaHref}
                        data-theme-field="serversCtaLabel"
                        data-theme-label="View all button text"
                        data-theme-editable="text"
                        className="ghost link-cta inline-flex h-12 min-w-[216px] items-center justify-center gap-2 rounded-lg border px-3.5"
                        style={
                            ctaStyle ?? {
                                backgroundColor: "#0a0e13",
                                borderColor: "#ba9142",
                                color: "#ecf3fc",
                            }
                        }
                    >
                        {ctaLabel}
                        <span className="link-cta-chevron">›</span>
                    </Link>
                </div>
            ) : null}
        </div>
    );
}
