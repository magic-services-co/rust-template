"use client";
import { appTableFeatures, type AppTableFeatures } from "@/lib/table-features"

import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
    ColumnDef,
    flexRender,
    useTable,
    SortingState,
    Row,
    Column,
    OnChangeFn,
} from "@tanstack/react-table"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    ArrowUp,
    ArrowDown,
    Filter,
    Search,
    Skull,
    Trophy,
} from "lucide-react"

import { parseAsInteger, useQueryState } from 'nuqs';
import { cn } from "@/lib/utils";
import { useStatsQuery } from '@/hooks/leaderboard-hooks';
import useServers from '@/hooks/use-servers';
import { useSession, signIn } from '@/lib/laravel-auth-react';
import { useLeaderboardTheme } from '@/hooks/use-leaderboard-theme';
import { withLeaderboardDefaults } from '@/lib/leaderboard-theme-defaults';
import { LeaderboardColumn } from '@/hooks/use-leaderboard-tabs';
import Link from 'next/link';
import { useDebouncedCallback } from 'use-debounce';
import { ServerCombobox } from '../server-combobox';
import { WipeCombobox } from '../wipe-combobox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import Image from 'next/image';
import { lootyWeaponImageUrl } from '@/lib/looty-item-image';
import { useWipes } from '@/hooks/use-wipes';
import { useLeaderboardSettings } from '@/hooks/use-leaderboard-settings';

type LeaderboardThemeMerged = ReturnType<typeof withLeaderboardDefaults>

const LEFT_ALIGN_IDS = new Set(["rank", "player", "time_played"])
const EMPTY_ROWS: Record<string, any>[] = []
const EMPTY_SORTING: SortingState = []
const HIDDEN_COLUMNS = { steam_id: false }

function steamAvatarSrc(value: unknown): string {
    if (typeof value !== "string") return "";
    const url = value.trim();
    try {
        const host = new URL(url).hostname.toLowerCase();
        if (
            host === "avatars.steamstatic.com" ||
            host === "avatars.akamai.steamstatic.com" ||
            host === "avatars.cloudflare.steamstatic.com" ||
            host === "steamcdn-a.akamaihd.net"
        ) {
            return url;
        }
    } catch {
        return "";
    }
    return "";
}

function PlayerCell({
    row,
    theme,
}: {
    row: Record<string, unknown>;
    theme: LeaderboardThemeMerged;
}) {
    const username = String(row.username ?? "Unknown");
    const sid = String(row.steam_id ?? "");
    const avatar = steamAvatarSrc(row.avatar);
    const [avatarFailed, setAvatarFailed] = useState(false);
    return (
        <div className="flex items-center gap-2 text-left">
            {avatar && !avatarFailed ? (
                <img
                    src={avatar}
                    alt=""
                    width={27}
                    height={27}
                    className="size-[27px] shrink-0 rounded-[4px] border border-[rgba(161,191,218,0.3)] object-cover"
                    onError={() => setAvatarFailed(true)}
                />
            ) : (
            <div
                className="flex size-[27px] shrink-0 items-center justify-center rounded-[4px] border border-[rgba(161,191,218,0.3)] text-[12px] text-[#dff7ff]"
                style={{ backgroundImage: "linear-gradient(135deg, rgb(48, 65, 80) 0%, rgb(17, 25, 33) 100%)" }}
            >
                {username.charAt(0).toUpperCase()}
            </div>
            )}
            <Link
                href={`https://steamcommunity.com/profiles/${sid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-[11px] text-[#f1f6fc] hover:text-white"
            >
                {username}
            </Link>
        </div>
    );
}

function FavoriteWeaponCell({
    row,
    theme,
}: {
    row: Record<string, unknown>;
    theme: LeaderboardThemeMerged;
}) {
    const raw = row.favorite_weapon;
    const kills = Number(row.favorite_weapon_kills) || 0;
    const src = lootyWeaponImageUrl(raw);
    const numericUnknown =
        raw != null &&
        raw !== "" &&
        !src &&
        (typeof raw === "number" ||
            (typeof raw === "string" && /^\d+$/.test(raw.trim())));

    if (!src) {
        if (numericUnknown) {
            return (
                <span className="font-mono text-xs text-zinc-500" title="Unknown item id">
                    {String(raw)}
                </span>
            );
        }
        return <span className="text-zinc-600">—</span>;
    }

    return (
        <div className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-zinc-800/90 px-2 py-1 ring-1 ring-white/10">
            <img
                src={src}
                alt=""
                className="h-6 w-14 shrink-0 object-contain object-left md:h-7 md:w-16"
            />
            <Skull className="h-3.5 w-3.5 shrink-0 text-red-500" aria-hidden />
            <span
                className="min-w-[2ch] shrink-0 tabular-nums text-xs font-semibold"
                style={{ color: theme.textPrimaryColor }}
            >
                {kills}
            </span>
        </div>
    );
}

type GetColumnsOpts = {
    page: number;
    pageSize: number;
    lockSort: boolean;
    tab: string;
    dataColumns: LeaderboardColumn[];
    sortedColumnId?: string | null;
};

const getColumns = (
    theme: LeaderboardThemeMerged,
    opts: GetColumnsOpts,
): ColumnDef<AppTableFeatures, Record<string, any>>[] => {
    const { page, pageSize, lockSort, tab, dataColumns, sortedColumnId } = opts;

    const sortHeader = (
        column: Column<AppTableFeatures, Record<string, any>>,
        columnData: LeaderboardColumn,
        label: React.ReactNode,
    ) =>
        columnData.icon ? (
            <TooltipProvider delayDuration={300}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            type="button"
                            variant="ghost"
                            disabled={lockSort}
                            onClick={() => {
                                if (!lockSort) column.toggleSorting(column.getIsSorted() === "asc");
                            }}
                            className="leaderboard-sort h-8 -ml-2 px-1.5 hover:bg-white/5"
                            style={{ color: theme.tableHeaderText }}
                        >
                            <div className="relative h-5 w-5">
                                <Image
                                    src={
                                        columnData.icon.includes("http")
                                            ? columnData.icon
                                            : `/images/icons/${columnData.icon}`
                                    }
                                    alt={columnData.columnLabel}
                                    fill
                                    className="object-contain"
                                    sizes="20px"
                                />
                            </div>
                            {column.getIsSorted() === "asc" ? (
                                <ArrowUp className="ml-2 h-4 w-4" />
                            ) : column.getIsSorted() === "desc" ? (
                                <ArrowDown className="ml-2 h-4 w-4" />
                            ) : null}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>{columnData.columnLabel}</TooltipContent>
                </Tooltip>
            </TooltipProvider>
        ) : (
            <Button
                type="button"
                variant="ghost"
                disabled={lockSort}
                onClick={() => {
                    if (!lockSort) column.toggleSorting(column.getIsSorted() === "asc");
                }}
                className="leaderboard-sort h-8 -ml-2 px-1.5 text-[10px] hover:bg-white/5"
                style={{ color: column.getIsSorted() ? "#ba9142" : theme.tableHeaderText }}
            >
                {label}
                {column.getIsSorted() === "asc" ? (
                    <ArrowUp className="ml-2 h-4 w-4" />
                ) : column.getIsSorted() === "desc" ? (
                    <ArrowDown className="ml-2 h-4 w-4" />
                ) : null}
            </Button>
        );

    const rankCol: ColumnDef<AppTableFeatures, Record<string, any>> = {
        id: "rank",
        accessorFn: () => "",
        header: "#",
        cell: ({ row }) => {
            const globalRank = (page - 1) * pageSize + row.index + 1;
            const medalClass =
                globalRank === 1
                    ? "text-[#edca70]"
                    : globalRank === 2
                      ? "text-[#cbd8e7]"
                      : globalRank === 3
                        ? "text-[#c58e61]"
                        : "text-[rgba(173,191,209,0.58)]";
            return (
                <span className={cn("text-[11px] tabular-nums", medalClass)}>
                    {String(globalRank).padStart(2, "0")}
                </span>
            );
        },
        enableSorting: false,
    };

    const playerCol: ColumnDef<AppTableFeatures, Record<string, any>> = {
        id: "player",
        header: "Player",
        accessorFn: (r) => r.username,
        cell: ({ row }) => <PlayerCell row={row.original} theme={theme} />,
        enableSorting: false,
    };

    const timeCol: ColumnDef<AppTableFeatures, Record<string, any>> = {
        id: "time_played",
        accessorKey: "time_played",
        header: ({ column }) => (
            <Button
                type="button"
                variant="ghost"
                disabled={lockSort || tab !== "misc_stats"}
                onClick={() => {
                    if (!lockSort && tab === "misc_stats") {
                        column.toggleSorting(column.getIsSorted() === "asc");
                    }
                }}
                className="leaderboard-sort h-8 -ml-2 px-1.5 text-[10px] hover:bg-white/5"
                style={{ color: theme.tableHeaderText }}
            >
                Time played
                {tab === "misc_stats" && column.getIsSorted() === "asc" ? (
                    <ArrowUp className="ml-2 h-4 w-4" />
                ) : tab === "misc_stats" && column.getIsSorted() === "desc" ? (
                    <ArrowDown className="ml-2 h-4 w-4" />
                ) : null}
            </Button>
        ),
        cell: ({ row }) => {
            const v = row.original.time_played;
            if (v == null || v === "") {
                return <span className="text-zinc-600">—</span>;
            }
            return (
                <div className="text-[11px] tabular-nums text-[#a7b7c9]">
                    {renderValue(
                        { columnKey: "time_played", columnLabel: "Time played" },
                        v,
                    )}
                </div>
            );
        },
        enableSorting: tab === "misc_stats",
        sortFn: "basic",
    };

    const metricCols = dataColumns.map(
        (columnData) =>
            ({
                accessorKey: columnData.columnKey,
                id: columnData.columnKey,
                header: ({ column }: { column: Column<AppTableFeatures, Record<string, any>> }) =>
                    sortHeader(column, columnData, columnData.columnLabel),
                cell: ({ row }: { row: Row<AppTableFeatures, Record<string, any>> }) =>
                    columnFormat(columnData) === "weapon" ? (
                        <div className="flex items-center justify-center">
                            <FavoriteWeaponCell row={row.original} theme={theme} />
                        </div>
                    ) : (
                        <div className="flex items-center justify-center gap-1">
                            {columnFormat(columnData) === "computed" ? (
                                <Trophy className="h-3.5 w-3.5 shrink-0 text-[#ba9142]" aria-hidden />
                            ) : null}
                            <span
                                className="tabular-nums text-[12px]"
                                style={{
                                    color:
                                        sortedColumnId === columnData.columnKey
                                            ? "#f0cc76"
                                            : "#d8e2ed",
                                }}
                            >
                                {renderValue(columnData, row.getValue(columnData.columnKey))}
                            </span>
                        </div>
                    ),
            }) satisfies ColumnDef<AppTableFeatures, Record<string, any>>,
    );

    return [
        {
            accessorKey: "steam_id",
            header: "Steam ID",
            cell: ({ row }: { row: Row<AppTableFeatures, Record<string, any>> }) => <div>{row.getValue("steam_id")}</div>,
            enableHiding: true,
            enableSorting: false,
        },
        rankCol,
        playerCol,
        timeCol,
        ...metricCols,
    ];
}

function columnFormat(columnData: LeaderboardColumn): string {
    if (columnData.format) return columnData.format;
    if (columnData.columnKey === "kdr") return "computed";
    if (columnData.columnKey === "favorite_weapon") return "weapon";
    if (columnData.columnKey === "time_played") return "duration";
    return "number";
}

function renderValue(columnData: LeaderboardColumn, value: unknown) {
    const fmt = columnFormat(columnData);
    if (fmt === "computed" || columnData.columnKey === "kdr") {
        return Number(value).toFixed(2);
    }
    if (fmt === "weapon") {
        return value == null || value === "" ? "—" : String(value);
    }
    if (fmt === "duration") {
        const n = Number(value);
        if (!Number.isFinite(n)) return "—";
        const h = Math.floor(n / 3600);
        const m = Math.floor((n % 3600) / 60);
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    }
    if (fmt === "percent") {
        return `${Number(value).toFixed(1)}%`;
    }
    return value as React.ReactNode;
}

export function StatsTable({
    tab,
    columnData,
    leaderboardTheme: serverTheme,
    isActive = true,
    hideFilterCard = false,
    lockSort = false,
}: {
    tab: string;
    columnData: LeaderboardColumn[];
    leaderboardTheme?: any;
    isActive?: boolean;
    hideFilterCard?: boolean;
    lockSort?: boolean;
}) {
    const { data: session } = useSession();
    const { data: clientTheme } = useLeaderboardTheme();
    const { data: leaderboardSettings } = useLeaderboardSettings();
    const [selectedServer, setSelectedServer] = useQueryState('server');
    const [selectedWipeId, setSelectedWipeId] = useQueryState('wipeId', parseAsInteger);
    
    const showWipeSelection = leaderboardSettings?.showWipeSelection ?? true;
    const lifetime = !showWipeSelection || selectedWipeId === -1;
    
    const leaderboardTheme = useMemo(
        () => withLeaderboardDefaults(clientTheme || serverTheme),
        [clientTheme, serverTheme],
    );
    const [searchQuery, setSearchQuery] = useQueryState('filter', {
        defaultValue: '',
        shallow: false,
        clearOnDefault: true,
    });
    const [sortingQuery, setSortingQuery] = useQueryState('sort');
    const [sortOrder, setSortOrder] = useQueryState('sortOrder');
    const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1));
    const [pageSize, setPageSize] = useQueryState('pageSize', parseAsInteger.withDefault(10));

    const { data: servers, ...serversQuery } = useServers();
    const { data: wipesData } = useWipes(selectedServer ? selectedServer : undefined, false);
    const wipes = wipesData.data;

    const setSelectedServerRef = useRef(setSelectedServer);
    const setSelectedWipeIdRef = useRef(setSelectedWipeId);
    const setPageRef = useRef(setPage);
    const setSortingQueryRef = useRef(setSortingQuery);
    const setSortOrderRef = useRef(setSortOrder);
    setSelectedServerRef.current = setSelectedServer;
    setSelectedWipeIdRef.current = setSelectedWipeId;
    setPageRef.current = setPage;
    setSortingQueryRef.current = setSortingQuery;
    setSortOrderRef.current = setSortOrder;

    const firstServerId = servers[0]?.servers?.[0]?.server_id ?? null;
    useEffect(() => {
        if (!selectedServer && firstServerId) {
            setSelectedServerRef.current(firstServerId);
        }
    }, [selectedServer, firstServerId]);

    useEffect(() => {
        if (selectedWipeId === -1) {
            return;
        }

        if (selectedServer && wipes.length > 0) {
            const activeWipe = wipes.find(w => w.is_active);
            const latestWipe = [...wipes].sort((a, b) =>
                new Date(b.started_at ?? 0).getTime() - new Date(a.started_at ?? 0).getTime()
            )[0];

            const wipeToSelect = activeWipe || latestWipe;
            const selectedMatches = selectedWipeId != null && wipes.some(w => String(w.id) === String(selectedWipeId));
            const nextId = wipeToSelect ? Number(wipeToSelect.id) : NaN;

            if (wipeToSelect && !selectedMatches && Number.isFinite(nextId) && nextId !== selectedWipeId) {
                setSelectedWipeIdRef.current(nextId);
            }
        } else if (!selectedServer && selectedWipeId != null) {
            setSelectedWipeIdRef.current(null);
        }
    }, [selectedServer, wipes, selectedWipeId]);

    const debouncedSetSearchQuery = useDebouncedCallback(setSearchQuery, 300);

    const { data, error, isLoading } = useStatsQuery({
        tab,
        filter: searchQuery || undefined,
        page: page ? +page : 1,
        sortField: sortingQuery || undefined,
        pageSize: +pageSize,
        server: selectedServer || '',
        wipeId: lifetime ? undefined : (selectedWipeId || undefined),
        lifetime: lifetime,
        sortOrder: sortOrder ? (
            sortOrder.toUpperCase() === "DESC" ? "DESC" : "ASC"
        ) : undefined,
    });

    const sorting = React.useMemo((): SortingState => {
        if (!sortingQuery) return EMPTY_SORTING;
        return [{ id: sortingQuery, desc: !sortOrder || sortOrder.toLowerCase() === 'desc' }];
    }, [sortingQuery, sortOrder]);

    const setSorting = (newSorting: SortingState) => {
        if (!newSorting.length) return;
        setSortingQuery(newSorting[0].id);
        setSortOrder(newSorting[0].desc ? 'desc' : 'asc')
    };

    const pageResetKey = `${searchQuery}|${sortingQuery}|${sortOrder}|${selectedServer}|${selectedWipeId}|${tab}`;
    const pageResetKeyRef = useRef(pageResetKey);
    useEffect(() => {
        if (pageResetKeyRef.current === pageResetKey) return;
        pageResetKeyRef.current = pageResetKey;
        if (page !== 1) setPageRef.current(1);
    }, [pageResetKey, page]);

    const columnKeyList = columnData.map((column) => column.columnKey).join("|");
    useEffect(() => {
        if (!isActive || !sortingQuery) return;
        const isValidSort = columnKeyList.split("|").includes(sortingQuery);
        const timeSortOk = tab === "misc_stats" && sortingQuery === "time_played";
        if (!isValidSort && !timeSortOk) {
            setSortingQueryRef.current(null);
            setSortOrderRef.current(null);
        }
    }, [isActive, tab, columnKeyList, sortingQuery]);

    const handleSortingChange: OnChangeFn<SortingState> = (updaterOrValue) => {
        if (lockSort) {
            return;
        }
        const newSorting = typeof updaterOrValue === 'function'
            ? updaterOrValue(sorting)
            : updaterOrValue;
        setSorting(newSorting);
    };

    const dataColumns = useMemo(
        () => columnData.filter((c) => c.columnKey !== "time_played"),
        [columnData],
    );

    const columns = useMemo(
        () =>
            getColumns(leaderboardTheme, {
                page,
                pageSize,
                lockSort,
                tab,
                dataColumns,
                sortedColumnId: sortingQuery,
            }),
        [
            leaderboardTheme,
            page,
            pageSize,
            lockSort,
            tab,
            dataColumns,
            sortingQuery,
        ],
    );
    const tableRows = data?.data ?? EMPTY_ROWS;
    const pagination = useMemo(
        () => ({
            pageIndex: Math.max(0, page - 1),
            pageSize: Number(pageSize) || 10,
        }),
        [page, pageSize],
    );
    const tableState = useMemo(
        () => ({
            sorting,
            pagination,
            columnVisibility: HIDDEN_COLUMNS,
        }),
        [sorting, pagination],
    );
    const table = useTable({
        features: appTableFeatures,
        data: tableRows,
        columns,
        onSortingChange: handleSortingChange,
        manualPagination: true,
        manualSorting: true,
        manualFiltering: true,
        pageCount: data?.totalPages || 1,
        state: tableState,
        initialState: {
            columnVisibility: HIDDEN_COLUMNS,
        },
    })

    const inputControlStyle = useMemo(
        () =>
            ({
                backgroundColor: leaderboardTheme.inputBackground,
                border: leaderboardTheme.inputBorder
                    ? `1px solid ${leaderboardTheme.inputBorder}`
                    : undefined,
                color: leaderboardTheme.inputTextColor,
                borderRadius: leaderboardTheme.inputBorderRadius,
            }) as React.CSSProperties,
        [leaderboardTheme],
    )

    const secondaryButtonStyle = useMemo(
        () =>
            ({
                backgroundColor: leaderboardTheme.buttonSecondaryBackground,
                color: leaderboardTheme.buttonSecondaryText,
                border: leaderboardTheme.buttonSecondaryBorder
                    ? `1px solid ${leaderboardTheme.buttonSecondaryBorder}`
                    : undefined,
                borderRadius: leaderboardTheme.buttonBorderRadius,
            }) as React.CSSProperties,
        [leaderboardTheme],
    )

    const primaryButtonStyle = useMemo(
        () =>
            ({
                backgroundColor: leaderboardTheme.buttonPrimaryBackground,
                color: leaderboardTheme.buttonPrimaryText,
                border: `1px solid ${leaderboardTheme.buttonPrimaryBackground}`,
                borderRadius: leaderboardTheme.buttonBorderRadius,
            }) as React.CSSProperties,
        [leaderboardTheme],
    )

    const searchCardStyle = useMemo(
        () =>
            ({
                backgroundColor: leaderboardTheme.searchBackground,
                border: leaderboardTheme.searchBorder
                    ? `1px solid ${leaderboardTheme.searchBorder}`
                    : undefined,
                borderRadius: leaderboardTheme.searchBorderRadius,
            }) as React.CSSProperties,
        [leaderboardTheme],
    )

    const tableCardStyle = useMemo(
        () =>
            ({
                backgroundColor: leaderboardTheme.cardBackground,
                border: leaderboardTheme.cardBorder
                    ? `1px solid ${leaderboardTheme.cardBorder}`
                    : undefined,
                borderRadius: leaderboardTheme.cardBorderRadius,
                boxShadow: leaderboardTheme.cardShadow,
            }) as React.CSSProperties,
        [leaderboardTheme],
    )

    const tableBorderColor = leaderboardTheme.cardBorder ?? leaderboardTheme.inputBorder

    const comboboxTriggerClass =
        "w-full justify-between h-10 px-3 py-2 text-sm border shadow-none ring-offset-background"

    return (
        <div className="space-y-6">
            {!hideFilterCard ? (
                <Card style={searchCardStyle}>
                    <CardHeader>
                        <CardTitle
                            className="flex items-center space-x-2"
                            style={{ color: leaderboardTheme.textPrimaryColor }}
                        >
                            <Filter className="h-5 w-5" />
                            <span>Search & filters</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <div className="relative xl:col-span-2">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <Input
                                    type="search"
                                    value={searchQuery ?? ""}
                                    placeholder="Search by Username or SteamID..."
                                    className="h-10 pl-10"
                                    style={inputControlStyle}
                                    onChange={(e) => debouncedSetSearchQuery(e.target.value)}
                                />
                            </div>
                            <div className="min-w-0">
                                <ServerCombobox
                                    allowGlobal={false}
                                    value={selectedServer}
                                    triggerClassName={comboboxTriggerClass}
                                    triggerStyle={inputControlStyle}
                                    onChange={(currentValue) => {
                                        setSelectedServer(currentValue);
                                    }}
                                />
                            </div>
                            {showWipeSelection && (
                                <div className="min-w-0">
                                    {selectedServer ? (
                                        <WipeCombobox
                                            value={selectedWipeId}
                                            onChange={(wipeId) => {
                                                setSelectedWipeId(wipeId);
                                            }}
                                            serverId={selectedServer}
                                            showLifetime={true}
                                            triggerClassName={comboboxTriggerClass}
                                            triggerStyle={inputControlStyle}
                                        />
                                    ) : (
                                        <div
                                            className="flex h-10 w-full items-center rounded-md border px-3 text-sm"
                                            style={{
                                                borderColor: leaderboardTheme.inputBorder,
                                                color: leaderboardTheme.textMutedColor,
                                                borderRadius: leaderboardTheme.inputBorderRadius,
                                            }}
                                        >
                                            Select a server
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ) : null}

            <Card
                className={cn(
                    "transition-shadow",
                    hideFilterCard ? "border-0 bg-transparent shadow-none" : "hover:shadow-md",
                )}
                style={hideFilterCard ? undefined : tableCardStyle}
            >
                <CardContent
                    className={hideFilterCard ? "p-0" : undefined}
                    style={
                        hideFilterCard ? undefined : { padding: leaderboardTheme.cardPadding }
                    }
                >
                    <div
                        className={cn(!hideFilterCard && "overflow-hidden rounded-md border")}
                        style={hideFilterCard ? undefined : { borderColor: tableBorderColor }}
                    >
                        <Table className="leaderboard-table w-full text-sm" style={{ color: leaderboardTheme.tableHeaderText }}>
                            <TableHeader>
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <TableRow
                                        key={headerGroup.id}
                                        className="border-0 hover:bg-transparent"
                                        style={{
                                            backgroundColor: leaderboardTheme.tableHeaderBg,
                                            borderColor: "rgba(154,179,205,0.1)",
                                        }}
                                    >
                                        {headerGroup.headers.map((header) => (
                                            <TableHead
                                                key={header.id}
                                                className={cn(
                                                    "h-11 min-h-0 py-3 text-[8px] font-normal uppercase tracking-[0.15px]",
                                                    LEFT_ALIGN_IDS.has(header.column.id)
                                                        ? "pl-2 pr-1 text-left"
                                                        : "px-1 text-center",
                                                )}
                                                style={{
                                                    color: leaderboardTheme.tableHeaderText,
                                                }}
                                            >
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                          header.column.columnDef.header,
                                                          header.getContext(),
                                                      )}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableHeader>
                            <TableBody>
                                {table.getRowModel().rows?.length ? (
                                    table.getRowModel().rows.map((row) => {
                                        const isYou = row.original.steam_id === session?.user?.steamId;
                                        return (
                                        <TableRow
                                            key={row.id}
                                            data-state={row.getIsSelected() && "selected"}
                                            className="group h-14 border-t border-[rgba(154,179,205,0.1)] hover:bg-white/[0.03]"
                                            style={{
                                                backgroundColor: isYou
                                                    ? leaderboardTheme.tableRowHighlightBg
                                                    : "transparent",
                                            }}
                                        >
                                            {row.getVisibleCells().map((cell) => (
                                                <TableCell
                                                    key={cell.id}
                                                    className={cn(
                                                        "py-3 align-middle text-xs",
                                                        LEFT_ALIGN_IDS.has(cell.column.id)
                                                            ? "pl-2 pr-1 text-left"
                                                            : "px-1 text-center",
                                                    )}
                                                    style={{
                                                        color: leaderboardTheme.tableRowText,
                                                    }}
                                                >
                                                    {flexRender(
                                                        cell.column.columnDef.cell,
                                                        cell.getContext(),
                                                    )}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow className="border-0">
                                        <TableCell
                                            colSpan={columns.length}
                                            className="h-14 py-4 text-center text-sm"
                                            style={{
                                                color: leaderboardTheme.textMutedColor,
                                            }}
                                        >
                                            {isLoading ? "Loading..." : "No results."}
                                        </TableCell>
                                    </TableRow>
                                )}
                                {!session?.user && hideFilterCard ? (
                                    <TableRow className="h-14 border-t border-[rgba(154,179,205,0.1)]">
                                        <TableCell className="pl-2 pr-1">
                                            <span className="text-[8px] font-medium tracking-[0.6px] text-[#f0c970]">##</span>
                                        </TableCell>
                                        <TableCell colSpan={Math.max(1, table.getVisibleLeafColumns().length - 1)} className="pl-2">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex size-[27px] items-center justify-center rounded-[4px] border border-[rgba(240,201,112,0.7)] bg-[rgba(90,62,20,0.3)] text-[8px] font-medium tracking-[0.6px] text-[#f0c970]">
                                                        YOU
                                                    </div>
                                                    <p className="text-[11px] text-[#f1f6fc]">Want to see where you are ranking?</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => signIn("steam")}
                                                    className="ghost inline-flex h-5 min-w-[107px] items-center justify-center gap-1 border border-[#ba9142] bg-[rgba(57,42,17,0.45)] px-3 text-[10px] font-medium tracking-[0.35px] text-[#f3ead9]"
                                                >
                                                    Sign in →
                                                </button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : null}
                            </TableBody>
                        </Table>
                        <div
                            className="flex flex-col gap-3 px-[26px] py-4 sm:flex-row sm:items-center sm:justify-between"
                            style={{
                                backgroundImage:
                                    "linear-gradient(90deg, rgba(63, 45, 14, 0.28) 0%, rgba(17, 20, 24, 0.92) 48%, rgba(58, 42, 15, 0.22) 100%)",
                            }}
                        >
                            <p className="text-[10px] tracking-[0.4px] text-[rgba(159,184,207,0.52)]">
                                Showing {table.getRowModel().rows.length} of{" "}
                                {(data?.totalPages ?? 1) * pageSize} players
                            </p>
                            <div className="flex flex-wrap items-center justify-end gap-1">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="leaderboard-page-btn h-6 min-w-6 px-2 text-[10px]"
                                    onClick={() => setPage(page - 1)}
                                    disabled={!table.getCanPreviousPage()}
                                >
                                    ←
                                </Button>
                                {Array.from({ length: Math.min(5, data?.totalPages ?? 1) }, (_, i) => {
                                    const pageNum = table.state.pagination.pageIndex - 2 + i
                                    if (pageNum < 0 || pageNum >= (data?.totalPages ?? 1)) return null
                                    const isActivePage =
                                        table.state.pagination.pageIndex === pageNum
                                    return (
                                        <Button
                                            type="button"
                                            key={pageNum}
                                            variant="ghost"
                                            size="sm"
                                            className={cn(
                                                "leaderboard-page-btn h-6 min-w-6 px-2 text-[10px]",
                                                isActivePage && "leaderboard-page-btn-active",
                                            )}
                                            onClick={() => setPage(pageNum + 1)}
                                        >
                                            {pageNum + 1}
                                        </Button>
                                    )
                                })}
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="leaderboard-page-btn h-6 min-w-6 px-2 text-[10px]"
                                    onClick={() => setPage(page + 1)}
                                    disabled={!table.getCanNextPage()}
                                >
                                    →
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}