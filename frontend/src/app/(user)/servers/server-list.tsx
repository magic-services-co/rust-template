"use client";

import Server from "@/components/server";
import useServerData, { EnhancedServerData } from "@/hooks/use-server-data";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { compareServersByRankThenPlayers, serverAlign, serverGridClass } from "@/lib/server-display";
import { cn } from "@/lib/utils";
import { SERVERS_THEME_DEFAULTS, withServersDefaults } from "@/lib/servers-theme-defaults";
import { useServerTheme } from "@/hooks/use-server-theme";

interface GroupedServers {
    [categoryId: number]: {
        name: string;
        servers: EnhancedServerData[];
        categoryOrder: number;
    };
}

interface ServerListProps {
    serverTheme: Record<string, unknown>;
}

export default function ServerList({ serverTheme }: ServerListProps) {
    const siteSettings = useSiteSettings();
    const { serverList: serverQueries, isLoading, isError } = useServerData();
    const { data: clientTheme } = useServerTheme();
    const theme = withServersDefaults(clientTheme || serverTheme);

    if (siteSettings.isLoading || isLoading) {
        return (
            <div className="space-y-10 pt-6">
                {[1, 2].map((category) => (
                    <section key={category} className="space-y-4">
                        <div className="h-10 w-48 bg-white/5" />
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {[1, 2, 3].map((server) => (
                                <div key={server} className="h-[250px] border border-white/10 bg-white/[0.03]" />
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        );
    }

    if (isError) {
        return <p className="pt-10 text-center text-sm text-[#e8a0a3]">Error loading servers. Please try again later.</p>;
    }

    const groupedServers = serverQueries.reduce<GroupedServers>((acc, query) => {
        if (query.data) {
            const { categoryId, categoryName, categoryOrder } = query.data;
            if (!acc[categoryId]) {
                acc[categoryId] = { name: categoryName, servers: [], categoryOrder };
            }
            acc[categoryId].servers.push(query.data);
        }
        return acc;
    }, {});

    const sortedCategories = Object.entries(groupedServers)
        .map(([categoryId, category]: [string, GroupedServers[number]]) => ({
            id: Number(categoryId),
            ...category,
            servers: [...category.servers].sort((a, b) => a.order - b.order),
        }))
        .sort((a, b) => a.categoryOrder - b.categoryOrder);

    const useTags = siteSettings.data?.serversUseTags === true;
    const align = serverAlign(siteSettings.data?.serversAlign);
    const allServers = serverQueries
        .map((query) => query.data)
        .filter((server): server is EnhancedServerData => server !== undefined);

    const featuredId = useTags
        ? [...allServers].sort(compareServersByRankThenPlayers)[0]?.id ?? null
        : serverQueries.reduce<string | null>((best, query) => {
            const server = query.data;
            if (!server) return best;
            if (!best) return server.id;
            const current = serverQueries.find((item) => item.data?.id === best)?.data;
            if (!current) return server.id;
            return (server.attributes.players || 0) > (current.attributes.players || 0) ? server.id : best;
        }, null);

    const sections = useTags
        ? [{
            id: 0,
            name: "Servers",
            servers: [...allServers].sort(compareServersByRankThenPlayers),
        }]
        : sortedCategories;

    return (
        <div className="space-y-[15px] pt-6">
            {sections.map((category) => {
                const online = category.servers.reduce((sum: number, server: EnhancedServerData) => sum + (server.attributes.players || 0), 0);
                return (
                    <section key={category.id} className="pt-4">
                        <div className={cn("pb-[15px]", align === "center" && "text-center", align === "rtl" && "text-right")}>
                            <p className={cn("flex items-center gap-2 text-[9px] tracking-[3px]", align === "center" && "justify-center", align === "rtl" && "justify-end")} style={{ color: theme.playerCountTextColor }}>
                                <span className="inline-block h-px w-6 bg-[#8b6c32]" />
                                {online} PLAYERS ONLINE
                            </p>
                            <h2
                                className="pt-1 text-[28px] font-extrabold leading-[42px] tracking-[-1.3px] text-[#eef4fb]"
                                style={{ color: theme.categoryTitleColor }}
                            >
                                {category.name.toUpperCase()}
                            </h2>
                        </div>
                        <div className={serverGridClass(align)}>
                            {category.servers.map((server) => (
                                <Server
                                    key={server.id}
                                    data={server}
                                    copyServerAddress={siteSettings.data?.copyServerAddress || false}
                                    categoryName={category.name}
                                    tags={server.tags}
                                    featured={server.id === featuredId}
                                />
                            ))}
                        </div>
                    </section>
                );
            })}
            <p className={cn("flex flex-wrap items-center gap-3.5 pt-8", align === "center" && "justify-center", align === "rtl" && "justify-end")}>
                <span className="text-[9px] tracking-[1px] text-[#ba9142]">
                    {theme.includeLabel || SERVERS_THEME_DEFAULTS.includeLabel}
                </span>
                <span className="text-[10px] leading-[10px] text-[rgba(159,184,207,0.56)]">
                    {theme.includeText || SERVERS_THEME_DEFAULTS.includeText}
                </span>
            </p>
        </div>
    );
}
