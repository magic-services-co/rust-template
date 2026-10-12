"use client";

import { useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";
import { Input } from "../ui/input";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "../ui/skeleton";
import { useDebouncedCallback } from "use-debounce";
import Image from "next/image";
import { backendApi } from "@/lib/api";

export interface Player {
    steam_id: string;
    username: string;
    avatar?: string | null;
    user?: { id: string; name?: string | null; image?: string | null };
}

type PlayerGridProps = {
    value: string[];
    onChange: (value: string[]) => void;
    min?: number;
    max?: number;
}

const staggerVariants = {
    visible: {
        transition: {
            delayChildren: 0.3,
            staggerChildren: 0.15,
        }
    }
};

const itemVariants: Variants = {
    hidden: { y: -150, opacity: 0 },
    visible: {
        y: 0,
        opacity: 1,
        transition: {
            type: "spring" as const,
            stiffness: 300,
            damping: 20,
            mass: 0.8,
        }
    },
    exit: {
        scale: 0,
        opacity: 0,
        transition: {
            duration: 0.3,
            ease: "easeInOut"
        }
    }
};


export default function PlayerGrid({ value, onChange, min, max }: PlayerGridProps) {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [filterQuery, setFilterQuery] = useState<string>("");
    const debouncedSetFilterQuery = useDebouncedCallback(setFilterQuery, 300);
    const { data: players, isLoading, isError } = useQuery<Player[]>({
        queryKey: ['reportablePlayers', filterQuery],
        queryFn: async () => {
            const url = backendApi(`tickets/reportable${filterQuery ? `?search=${encodeURIComponent(filterQuery)}` : ""}`);
            const res = await fetch(url, { credentials: 'include', headers: { Accept: 'application/json' } });
            if (!res.ok) return [];
            return res.json();
        },
    });

    const onClick = (player: Player) => {
        const currentValue = value || [];
        if (max && currentValue.length >= max && !currentValue.includes(player.steam_id)) {
            return;
        }
        const newValue = currentValue.includes(player.steam_id) ? (
            currentValue.filter(id => id !== player.steam_id)
        ) : (
            [...currentValue, player.steam_id]
        )
        onChange(newValue);
    }

    return (
        <div>
            <div className="mb-4 ml-auto max-w-sm">
                <Input
                    placeholder="Search players"
                    defaultValue={filterQuery}
                    onChange={(e) => debouncedSetFilterQuery(e.target.value)}
                    className="support-form-input h-[41px] rounded-none"
                />
            </div>
            {isLoading ? (
                <SkeletonPlayerGrid />
            ) : isError ? (
                <p className="support-form-help text-sm">Failed to load players. Please try again.</p>
            ) : !Array.isArray(players) || players.length === 0 ? (
                <p className="support-form-help text-sm">No players found. Try a different search.</p>
            ) : (
                <AnimatePresence mode="wait">
                    <motion.div
                        key={filterQuery}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
                        variants={staggerVariants}
                        initial="visible"
                        animate="visible"
                    >
                        {players.map((player, idx) => (
                            <motion.div
                                key={player.steam_id}
                                variants={itemVariants}
                                layout
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                            >
                                <PlayerGridItem
                                    player={player}
                                    isSelected={value?.includes(player.steam_id)}
                                    onMouseEnter={() => setHoveredIndex(idx)}
                                    onMouseLeave={() => setHoveredIndex(null)}
                                    isHovered={hoveredIndex === idx}
                                    onClick={() => onClick(player)}
                                />
                            </motion.div>
                        ))}
                    </motion.div>
                </AnimatePresence>
            )}
        </div>
    )
}

function PlayerGridItem({
    player,
    isSelected,
    onMouseEnter,
    onMouseLeave,
    isHovered,
    onClick,
}: {
    player: Player;
    isSelected: boolean;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    isHovered: boolean;
    onClick: () => void;
}) {
    return (
        <motion.div
            className="relative block h-full w-full cursor-pointer"
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onClick={onClick}
            variants={itemVariants}
            layout={"size"}
            initial="hidden"
            animate="visible"
            exit="exit"
        >
            <div className={cn(
                "support-grid-card relative h-full w-full overflow-hidden",
                isSelected && "support-grid-card-selected"
            )}>
                <div className="relative flex flex-row items-center gap-4 p-3">
                    <Image
                        src={player.avatar ?? `https://avatar.iran.liara.run/username?username=${encodeURIComponent(player.steam_id)}`}
                        alt={player.username}
                        width={48}
                        height={48}
                        className="hidden h-12 w-12 rounded-none md:block"
                    />
                    <div>
                        <h4 className="m-0 text-[14px] font-bold tracking-wide" style={{ color: "#eef4fb" }}>
                            {player.username}
                        </h4>
                        <span className="support-form-meta mt-0 text-[11px]">{player.steam_id}</span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

function SkeletonPlayerGrid() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, index) => (
                <SkeletonPlayerGridItem key={index} />
            ))}
        </div>
    );
}

function SkeletonPlayerGridItem() {
    return (
        <div className="relative block h-full w-full">
            <div className="support-grid-card h-full w-full overflow-hidden p-3">
                <div className="flex flex-row items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-none" />
                    <Skeleton className="h-6 w-24" />
                </div>
            </div>
        </div>
    );
}
