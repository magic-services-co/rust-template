"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence, stagger, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";
import useServerData, { EnhancedServerData } from "@/hooks/use-server-data";
import { Input } from "../ui/input";
import Image from "next/image";

type ServerGridProps = {
    value: any
    onChange: (value: any) => void
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

export default function ServerGrid({ value, onChange }: ServerGridProps) {
    const { serverList, isLoading, isError } = useServerData();
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [filterQuery, setFilterQuery] = useState<string>("");

    const serverGrid = useMemo(() => {
        const servers = serverList.map((q) => q.data).filter((s): s is NonNullable<typeof s> => !!s);
        return servers.filter((server) => value === server.id || server?.name?.toLowerCase().includes(filterQuery.toLowerCase()));
    }, [serverList, filterQuery, value])

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="support-grid-card h-full min-h-[200px] animate-pulse" />
                ))}
            </div>
        );
    }

    if (isError) {
        return (
            <p className="support-form-help text-sm">Failed to load servers. Please try again.</p>
        );
    }

    return (
        <div>
            <div className="mb-4 ml-auto max-w-sm">
                <Input
                    placeholder="Search servers"
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    className="support-form-input h-[41px] rounded-none"
                />
            </div>
            <AnimatePresence mode="wait">
                <motion.div
                    key={filterQuery}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                    variants={staggerVariants}
                    initial="visible"
                    animate="visible"
                >
                    {serverGrid.map((server, idx) => (
                        <motion.div
                            key={server?.id}
                            variants={itemVariants}
                            layout
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                        >
                            <ServerGridItem
                                server={server}
                                isSelected={value === server.id}
                                onMouseEnter={() => setHoveredIndex(idx)}
                                onMouseLeave={() => setHoveredIndex(null)}
                                isHovered={hoveredIndex === idx}
                                onClick={() => {
                                    if (value === server.id) {
                                        onChange("");
                                        return;
                                    }
                                    onChange(server.id);
                                }}
                            />
                        </motion.div>
                    ))}
                </motion.div>
            </AnimatePresence>
            {serverGrid.length === 0 && (
                <p className="support-form-help text-sm">No servers match your search.</p>
            )}
        </div>
    )
}

function ServerGridItem({
    server,
    isSelected,
    onMouseEnter,
    onMouseLeave,
    isHovered,
    onClick,
}: {
    server: EnhancedServerData;
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
                "support-grid-card relative z-20 h-full w-full overflow-hidden",
                isSelected && "support-grid-card-selected"
            )}>
                <div className="relative">
                    <Image
                        src={server.image_path ?? server.attributes?.details?.rust_headerimage ?? ''}
                        alt={server.name ?? ''}
                        width={430}
                        height={240}
                        className="h-full w-full object-cover md:h-[180px] md:w-full"
                    />
                    <div className="p-4">
                        <h4 className="text-[14px] font-bold tracking-wide" style={{ color: "#eef4fb" }}>
                            {server.name}
                        </h4>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
