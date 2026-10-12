"use client";

import { backendApi } from "@/lib/api";
import { getAuthToken } from "@/lib/laravel-auth";
import { MapVote, UserVote } from "@/types/vote";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import useServerData from "@/hooks/use-server-data";
import { mapOptionWorldSize } from "@/lib/server-card-helpers";
import { withMapsDefaults } from "@/lib/maps-theme-defaults";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { splitBrandName } from "@/lib/layout-theme-defaults";
import { useMapsTheme } from "@/hooks/use-maps-theme";
import { ErrorCta, ErrorHint, ErrorPageContent } from "@/components/error-page";
import { HomeCardCorners } from "@/components/home/home-card-corners";

interface MapViewContainerProps {
    id: string;
    theme?: Record<string, unknown>;
}

function formatCountdown(end: Date, now: Date): string {
    const ms = end.getTime() - now.getTime();
    if (ms <= 0) return "00:00";
    const totalSec = Math.floor(ms / 1000);
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export default function MapViewContainer({ id, theme: serverTheme }: MapViewContainerProps) {
    const queryClient = useQueryClient();
    const { data: clientTheme } = useMapsTheme();
    const theme = withMapsDefaults(clientTheme || serverTheme);
    const { serverList } = useServerData();
    const { data: siteSettings } = useSiteSettings();
    const siteKicker = splitBrandName(siteSettings?.name).filter(Boolean).join(" ");
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const timer = window.setInterval(() => setNow(new Date()), 1000);
        return () => window.clearInterval(timer);
    }, []);

    const { data: mapVote, isLoading, error } = useQuery<MapVote>({
        queryKey: ["mapVote", id],
        queryFn: () => fetchMapVote(id),
    });

    const { data: userVotes } = useQuery<UserVote[]>({
        queryKey: ["userVotes"],
        queryFn: async () => {
            const token = getAuthToken();
            const headers: Record<string, string> = { Accept: "application/json" };
            if (token) headers["Authorization"] = `Bearer ${token}`;
            const response = await fetch(backendApi("vote"), { credentials: "include", headers });
            if (!response.ok) {
                if (response.status === 401) return [];
                throw new Error("Failed to fetch votes");
            }
            return response.json();
        },
    });

    const userVote = useMemo(() => userVotes?.find((vote) => vote.vote_id === id), [userVotes, id]);

    const isActive = useMemo(() => {
        if (!mapVote) return false;
        const startDate = new Date(mapVote.vote_start);
        const endDate = new Date(mapVote.vote_end);
        return now >= startDate && now < endDate;
    }, [mapVote, now]);

    const liveServer = useMemo(() => {
        return serverList
            .map((item) => item.data)
            .find((server) =>
                server &&
                (server.server_id === mapVote?.server?.server_id ||
                    server.name === mapVote?.server?.server_name),
            );
    }, [serverList, mapVote]);

    const totalVotes = useMemo(
        () => (mapVote?.map_options ?? []).reduce((sum, option) => sum + (option.vote_count || 0), 0),
        [mapVote],
    );

    const leadingId = useMemo(() => {
        const options = mapVote?.map_options ?? [];
        if (!options.length) return null;
        return options.reduce((best, option) =>
            (option.vote_count || 0) > (best.vote_count || 0) ? option : best,
        ).id;
    }, [mapVote]);

    const serverName = mapVote?.server?.server_name || "SERVER";
    const countdown = mapVote ? formatCountdown(new Date(mapVote.vote_end), now) : "00:00";

    if (isLoading) {
        return (
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-[#ba9142]" />
                <p className="text-sm text-[#a5b1bb]">Loading map vote…</p>
            </div>
        );
    }

    if (error || !mapVote) {
        return (
            <ErrorPageContent
                kicker="MAP VOTES"
                title="VOTE"
                titleAccent="NOT FOUND"
                subtitle="This map vote doesn't exist or is no longer available."
                actions={
                    <>
                        <ErrorCta href="/maps">ALL MAP VOTES</ErrorCta>
                        <ErrorCta href="/servers" variant="secondary">
                            VIEW SERVERS
                        </ErrorCta>
                    </>
                }
            >
                {error instanceof Error && error.message && !/^failed to (fetch|load)/i.test(error.message) ? (
                    <ErrorHint>
                        <p>{error.message}</p>
                    </ErrorHint>
                ) : null}
            </ErrorPageContent>
        );
    }

    return (
        <div>
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-[575px]">
                    <p className="text-[11px] font-medium tracking-[2.6px] text-[#ba9142]">{siteKicker || "MAP VOTE"}</p>
                    <h1 className="pt-1 text-[40px] font-bold leading-[60px] tracking-[-2px] text-[#f2f7ff] sm:text-[50px]">
                        {serverName.toUpperCase()}{" "}
                        <span className="text-[#ba9142]">MAP VOTES</span>
                    </h1>
                    <p className="max-w-[448px] pt-2 text-[14px] leading-6 text-[#9facc0]">
                        Choose the next map for the {serverName} server. The map with the most votes will become this coming wipe.
                    </p>
                </div>
                <div className="flex items-center gap-6 border-l border-white/10 pl-5">
                    <div>
                        <p className="text-[10px] tracking-[1.5px] text-[#a5b1bb]">
                            {isActive ? "VOTING CLOSES IN" : "VOTING CLOSED"}
                        </p>
                        <p className="pt-1 text-[28px] font-medium leading-9 tracking-tight text-[#f2f7ff]">
                            {isActive ? countdown : "00:00"}
                        </p>
                    </div>
                    {liveServer ? (
                        <>
                            <span className="h-11 w-px bg-white/10" />
                            <div>
                                <p className="text-[10px] tracking-[1.5px] text-[#a5b1bb]">PLAYERS ONLINE</p>
                                <p className="pt-1 text-[22px] leading-7 text-[#f2f7ff]">
                                    {liveServer.attributes.players}
                                    <span className="text-[#a5b1bb]"> / {liveServer.attributes.maxPlayers}</span>
                                </p>
                            </div>
                        </>
                    ) : null}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-5 pt-12 md:grid-cols-2 xl:grid-cols-3">
                {(mapVote.map_options ?? []).map((option, index) => (
                    <MapOption
                        key={option.id}
                        voteId={mapVote.id}
                        isActive={isActive}
                        hasVoted={!!userVote}
                        userVoted={userVote?.vote_option_id === option.id}
                        leading={option.id === leadingId && totalVotes > 0}
                        option={option}
                        index={index}
                        totalVotes={totalVotes}
                        onVoteSuccess={() => {
                            queryClient.invalidateQueries({ queryKey: ["mapVote", id] });
                            queryClient.invalidateQueries({ queryKey: ["userVotes"] });
                        }}
                    />
                ))}
            </div>
        </div>
    );
}

type MapVoteVoteData = {
    vote_id: string;
    map_option_id: string;
};

function MapOption({
    option,
    voteId,
    isActive,
    hasVoted = false,
    userVoted,
    leading,
    index,
    totalVotes,
    onVoteSuccess,
}: {
    option: MapVote["map_options"][number];
    voteId: string;
    isActive: boolean;
    index: number;
    hasVoted?: boolean;
    userVoted?: boolean;
    leading?: boolean;
    totalVotes: number;
    onVoteSuccess?: () => void;
}) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const voteCount = option.vote_count ?? 0;
    const percent = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
    const size = option.size ?? mapOptionWorldSize(option);
    const mapSrc = option.thumbnailUrl || option.imageUrl || option.rawImageUrl;
    const iconSrc =
        option.imageIconUrl && option.imageIconUrl !== mapSrc ? option.imageIconUrl : undefined;
    const rustmapsHref =
        typeof option.url === "string" && /^https?:\/\/(?:www\.)?rustmaps\.com\//i.test(option.url)
            ? option.url
            : `https://rustmaps.com/map/${String(option.id).replace(/-\d+$/, "")}`;

    const mutation = useMutation({
        mutationFn: async (data: MapVoteVoteData) => {
            const token = getAuthToken();
            const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
            if (token) headers["Authorization"] = `Bearer ${token}`;
            const response = await fetch(backendApi("vote"), {
                method: "POST",
                headers,
                body: JSON.stringify(data),
                credentials: "include",
            });
            if (!response.ok) {
                let message = "Failed to complete request";
                try {
                    const errorData = await response.json();
                    if (errorData?.error) message = errorData.error;
                    else if (errorData?.message) message = errorData.message;
                    else if (errorData?.errors && typeof errorData.errors === "object") {
                        const parts = Object.entries(errorData.errors).flatMap(([k, v]) =>
                            Array.isArray(v) ? v.map((s: string) => `${k}: ${s}`) : [`${k}: ${v}`],
                        );
                        if (parts.length) message = parts.join(". ");
                    }
                } catch {
                    if (response.status === 401) message = "Please log in to vote.";
                }
                if (response.status === 401 && message === "Failed to complete request") message = "Please log in to vote.";
                throw new Error(message);
            }
            return response.json();
        },
        onSuccess: () => {
            setIsDialogOpen(false);
            onVoteSuccess?.();
            toast.success("Your vote has been recorded");
        },
        onError: (error) => {
            toast.error(error.message || "Failed to complete request");
        },
    });

    const openVote = () => {
        setIsDialogOpen(true);
    };

    return (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <button
                type="button"
                onClick={openVote}
                className="ghost map-vote-option relative min-h-[430px] w-full overflow-visible border text-left"
                style={{ borderColor: "rgba(255,255,255,0.12)", backgroundColor: "#0b1014" }}
            >
                <span className="pointer-events-none absolute inset-0 overflow-hidden">
                    {mapSrc ? (
                        <Image
                            src={mapSrc}
                            alt=""
                            fill
                            sizes="(max-width: 768px) 100vw, 33vw"
                            className="object-cover opacity-80"
                        />
                    ) : null}
                    {iconSrc ? (
                        <Image
                            src={iconSrc}
                            alt=""
                            fill
                            sizes="(max-width: 768px) 100vw, 33vw"
                            className="object-cover"
                        />
                    ) : null}
                    <span
                        aria-hidden
                        className="absolute inset-0 bg-gradient-to-b from-[rgba(5,7,10,0.05)] via-[rgba(5,7,10,0.7)] to-[#080c0f]"
                    />
                    <span
                        aria-hidden
                        className="absolute inset-0"
                        style={{
                            backgroundImage:
                                "linear-gradient(124deg, rgba(255,255,255,0.06) 6%, rgba(255,255,255,0) 22%, rgba(214,168,80,0.12) 94%)",
                        }}
                    />
                </span>
                <div className="relative flex min-h-[430px] flex-col justify-between p-6">
                    <div className="flex items-start justify-between">
                        <span className="border border-white/15 bg-[rgba(5,7,10,0.75)] px-2.5 py-1 text-[10px] tracking-[1.8px] text-[#d2dce6]">
                            #{index + 1}
                        </span>
                        {userVoted ? (
                            <span className="border border-[rgba(214,168,80,0.55)] bg-[rgba(24,20,10,0.85)] px-2 py-1 text-[9px] tracking-[1.35px] text-[#e6bb60]">
                                YOUR VOTE
                            </span>
                        ) : leading ? (
                            <span className="border border-[rgba(214,168,80,0.55)] bg-[rgba(24,20,10,0.85)] px-2 py-1 text-[9px] tracking-[1.35px] text-[#e6bb60]">
                                LEADING
                            </span>
                        ) : null}
                    </div>
                    <div>
                        <div className="flex items-end justify-between border-b border-white/15 pb-3">
                            <p className="text-[24px] leading-8 tracking-[-1px] text-[#f2f7ff]">
                                {size ? (
                                    <>
                                        {size} <span className="text-[18px] text-[#a5b1bb]">km²</span>
                                    </>
                                ) : (
                                    <span className="text-[18px] text-[#a5b1bb]">MAP</span>
                                )}
                            </p>
                            <p className="text-right">
                                <span className="text-[20px] leading-7 text-[#f2f7ff]">{voteCount}</span>
                                {" "}
                                <span className="text-[12px] text-[#a5b1bb]">VOTES</span>
                            </p>
                        </div>
                        <div className="flex items-center gap-3 pt-3">
                            <div className="h-1.5 min-w-0 flex-1 bg-[#26313a]">
                                <div
                                    className="h-1.5 bg-gradient-to-r from-[#aa8137] to-[#e2b84f]"
                                    style={{
                                        width: `${percent}%`,
                                        boxShadow: percent > 0 ? "0 0 10px rgba(214,168,80,0.65)" : undefined,
                                    }}
                                />
                            </div>
                            <span className="w-9 text-right text-[12px] text-[#d6a850]">{percent}%</span>
                        </div>
                        <div className="flex items-center justify-between pt-5">
                            <span className="text-[10px] tracking-[1.5px] text-[#a5b1bb]">
                                {isActive ? (userVoted ? "VOTED" : "CLICK TO VOTE") : "VIEW MAP"}
                            </span>
                            <span className="flex size-7 items-center justify-center border border-white/20 text-[14px] text-[#d6a850]">
                                →
                            </span>
                        </div>
                    </div>
                </div>
                <HomeCardCorners color="#ba9142" show />
            </button>
            <DialogContent
                className="rounded-none"
                style={{
                    backgroundColor: "#0b1014",
                    border: "1px solid rgba(255,255,255,0.12)",
                }}
            >
                <DialogHeader>
                    <DialogTitle className="text-[#f2f7ff]">
                        {isActive ? "Confirm Vote" : "Map option"}
                    </DialogTitle>
                    <DialogDescription className="text-[#a5b1bb]">
                        {isActive
                            ? hasVoted
                                ? `Switch your vote to map option #${index + 1}? Your previous vote will be replaced.`
                                : `Vote for map option #${index + 1}?`
                            : "Voting is closed for this wipe."}
                    </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end gap-2">
                    <Link
                        href={rustmapsHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ghost support-form-btn-secondary inline-flex h-10 items-center px-4 text-[10px] font-bold tracking-[1.4px]"
                    >
                        VIEW MAP
                    </Link>
                    {isActive ? (
                        <button
                            type="button"
                            onClick={() =>
                                mutation.mutate({
                                    vote_id: voteId,
                                    map_option_id: option.id,
                                })
                            }
                            disabled={mutation.isPending}
                            className="ghost support-form-btn-primary inline-flex h-10 items-center px-4 text-[10px] font-bold tracking-[1.4px]"
                        >
                            {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "CONFIRM"}
                        </button>
                    ) : null}
                </div>
            </DialogContent>
        </Dialog>
    );
}

async function fetchMapVote(id: string): Promise<MapVote> {
    const response = await fetch(backendApi(`maps/${id}`), { credentials: "include" });
    if (!response.ok) {
        throw new Error("Failed to fetch map vote");
    }
    return response.json();
}
