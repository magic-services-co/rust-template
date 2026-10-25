"use client";

import { SteamIcon, DiscordIcon } from "@/components/icons";
import { UserSession } from "@/types/next-auth";
import { signIn } from "@/lib/laravel-auth-react";
import { CheckIcon, Loader2, UnlinkIcon, StarIcon, RefreshCcwIcon } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { getAuthToken } from "@/lib/laravel-auth";
import { useMemo, useEffect, useState, type ReactNode } from "react";
import { usePublicFront } from "@/lib/public-front";
import Link from "next/link";
import { refreshSteamGroup } from "@/app/actions/steam";
import { useRouter } from "next/navigation";
import { LINKED_USERS_COUNT_QUERY_KEY, LinkedUsersCount } from "@/components/linked-users-count";
import { cn } from "@/lib/utils";
import { HomeCardCorners } from "@/components/home/home-card-corners";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { backendApi } from "@/lib/api";
import { KitInventory } from "@/components/kit-inventory";
import { rustItemMap, type RustItemInfo } from "@/lib/rust-items";

interface LinkProps {
    user?: UserSession | null;
    linkStatus?: "success" | "error" | null;
    initialKits?: PublicLinkedKit[];
}

type LinkedKitItem = { shortname: string; amount: number; slot?: string | null; condition?: number | null };

type PublicLinkedKit = {
    id?: number;
    label?: string;
    kitName?: string;
    items?: LinkedKitItem[];
};

type LinkedKitResponse = {
    kits?: PublicLinkedKit[];
    kitName?: string;
    items?: LinkedKitItem[];
};

function getStepStatus(user?: UserSession | null) {
    const steamLinked = !!user?.steamId;
    const discordLinked = !!user?.discordId;
    if (!steamLinked) return 0;
    if (!discordLinked) return 1;
    return 2;
}

function LinkCta({
    children,
    onClick,
    href,
    disabled,
}: {
    children: ReactNode;
    onClick?: () => void;
    href?: string;
    disabled?: boolean;
}) {
    const className = cn(
        "ghost link-cta inline-flex h-12 min-w-[216px] items-center justify-center gap-2 rounded-lg border px-3.5",
        disabled && "pointer-events-none opacity-70",
    );
    const style = {
        backgroundColor: "#0a0e13",
        borderColor: "#ba9142",
        color: "#ecf3fc",
    } as const;

    if (href) {
        return (
            <Link href={href} className={className} style={style}>
                {children}
            </Link>
        );
    }

    return (
        <button type="button" onClick={onClick} disabled={disabled} className={className} style={style}>
            {children}
        </button>
    );
}

function StepNode({
    label,
    active,
    complete,
    icon,
}: {
    label: string;
    active: boolean;
    complete: boolean;
    icon: ReactNode;
}) {
    return (
        <div className="flex w-16 shrink-0 flex-col items-center gap-2">
            <div
                className="flex size-[58px] items-center justify-center rounded-full border"
                style={{
                    backgroundColor: "rgba(5,5,5,0.69)",
                    borderColor: active ? "#f2f6fc" : complete ? "#ba9142" : "rgba(236,243,252,0.8)",
                    boxShadow: active
                        ? "0 0 24px rgba(89,147,238,0.24)"
                        : "none",
                }}
            >
                {icon}
            </div>
            <span
                className="text-[12px] font-medium tracking-[0.4px]"
                style={{ color: "rgba(236,243,252,0.8)" }}
            >
                {label}
            </span>
        </div>
    );
}

function StepConnector({ filled }: { filled: boolean }) {
    return (
        <div
            className="mt-[27.5px] h-[3px] min-w-0 flex-1 bg-gradient-to-r"
            style={{
                backgroundImage: filled
                    ? "linear-gradient(90deg, rgba(186,145,66,0.88), rgba(186,145,66,0.42))"
                    : "linear-gradient(90deg, rgba(236,243,252,0.88), rgba(236,243,252,0.42))",
            }}
        />
    );
}

export default function AccountLinkStepper({ user, linkStatus, initialKits }: LinkProps) {
    const step = getStepStatus(user);
    const queryClient = useQueryClient();
    const { data: settings } = useSiteSettings();
    const router = useRouter();
    const [isLinkingDiscord, setIsLinkingDiscord] = useState(false);
    const [selectedKit, setSelectedKit] = useState(0);

    const rustItemsQuery = useQuery({
        queryKey: ["rust-items"],
        queryFn: async () => {
            const response = await fetch("/api/rust-items", { headers: { Accept: "application/json" }, cache: "no-store" });
            if (!response.ok) return rustItemMap([]);
            const data = (await response.json()) as RustItemInfo[];
            return rustItemMap(Array.isArray(data) ? data : []);
        },
        staleTime: 60 * 60 * 1000,
    });

    const kitQuery = useQuery({
        queryKey: ["link-kit"],
        queryFn: async () => {
            const response = await fetch(backendApi("link/kit"), { headers: { Accept: "application/json" } });
            if (!response.ok) return { kits: [] } satisfies LinkedKitResponse;
            return (await response.json()) as LinkedKitResponse;
        },
        initialData: initialKits ? { kits: initialKits } : undefined,
        staleTime: 60_000,
    });
    const kits = useMemo(() => {
        const rows = kitQuery.data?.kits;
        if (rows && rows.length > 0) return rows;
        if (kitQuery.data?.items) {
            return [{ label: "All servers", kitName: kitQuery.data.kitName, items: kitQuery.data.items }];
        }
        return [];
    }, [kitQuery.data]);
    const activeIndex = kits[selectedKit] ? selectedKit : 0;
    const activeKit = kits[activeIndex];
    const kitItems = activeKit?.items ?? [];
    const kitName = (activeKit?.kitName || "linked").trim();
    const isGroupEnabled = useMemo(() => {
        return !!settings?.steamGroupId && !!settings?.steamGroupUrl;
    }, [settings?.steamGroupId, settings?.steamGroupUrl]);

    const statusLabel = step === 0 ? "READY TO LINK" : step === 1 ? "LINK DISCORD" : "ACCOUNTS LINKED";

    useEffect(() => {
        if (linkStatus === "success") {
            toast.success("Successfully linked Discord and imported previous tickets");
            document.cookie = "discord_link_status=; Max-Age=0; path=/";
            queryClient.invalidateQueries({ queryKey: LINKED_USERS_COUNT_QUERY_KEY });
        } else if (linkStatus === "error") {
            toast.error("Discord linking failed. Please try again.");
            document.cookie = "discord_link_status=; Max-Age=0; path=/";
        }
    }, [linkStatus, queryClient]);

    const unlinkMutation = useMutation({
        mutationFn: async () => {
            const token = getAuthToken();
            const headers: Record<string, string> = { Accept: "application/json" };
            if (token) headers["Authorization"] = `Bearer ${token}`;
            const response = await fetch("/api/user/unlink", {
                method: "DELETE",
                credentials: "include",
                headers,
            });
            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data?.error ?? data?.message ?? "Failed to unlink account");
            }
            window.location.reload();
        },
        onSuccess: () => {
            toast.success("Discord account unlinked");
        },
        onError: (error) => {
            toast.error(error instanceof Error ? error.message : "Failed to unlink Discord account");
        },
    });

    const refreshMutation = useMutation({
        mutationFn: async () => {
            const result = await refreshSteamGroup();
            if (result?.error) {
                throw new Error(result.error);
            }
            return result.data;
        },
        onSuccess: () => {
            toast.success("Steam group membership refreshed");
            router.refresh();
        },
        onError: (error) => {
            toast.error(error instanceof Error ? error.message : "Failed to refresh steam group membership");
        },
    });

    const LinkStepper = usePublicFront().slots.linkStepper
    if (LinkStepper) {
        return (
            <LinkStepper
                step={step}
                user={user}
                kits={kits}
                kitItems={kitItems}
                activeIndex={activeIndex}
                setSelectedKit={setSelectedKit}
                isGroupEnabled={isGroupEnabled}
                steamGroupUrl={settings?.steamGroupUrl}
                isLinkingDiscord={isLinkingDiscord}
                setIsLinkingDiscord={setIsLinkingDiscord}
                unlinkPending={unlinkMutation.isPending}
                onUnlink={() => unlinkMutation.mutate()}
                catalog={rustItemsQuery.data}
            />
        )
    }

    return (
        <article
            className="link-card support-ticket-card relative overflow-visible border"
            style={{ borderColor: "rgba(72,97,125,0.6)" }}
        >
            <span
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                    backgroundImage:
                        "linear-gradient(139.28deg, rgba(17, 23, 30, 0.96) 8.5%, rgba(8, 12, 17, 0.94) 91.5%)",
                }}
            />
            <span
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                    backgroundImage:
                        "linear-gradient(90deg, rgba(186, 145, 66, 0.06) 0%, rgba(186, 145, 66, 0) 25%), linear-gradient(180deg, rgba(255, 255, 255, 0.043) 0%, rgba(255, 255, 255, 0) 20%)",
                }}
            />

            <div className="relative flex flex-col lg:min-h-[560px] lg:flex-row">
                <aside
                    className="flex w-full shrink-0 flex-col border-b px-6 py-8 sm:px-8 lg:w-[640px] lg:border-b-0 lg:border-r lg:px-10 lg:py-10"
                    style={{
                        borderColor: "rgba(106,130,157,0.22)",
                        backgroundImage:
                            "linear-gradient(180deg, rgba(7,10,14,0.24), rgba(6,9,12,0.48))",
                    }}
                >
                    <div className="flex items-center gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                            <div
                                className="flex size-[34px] shrink-0 items-center justify-center border"
                                style={{
                                    backgroundColor: "rgba(65,34,5,0.36)",
                                    borderColor: "#ba9142",
                                }}
                            >
                                <img src="/images/link/gift.svg" alt="" className="size-6" />
                            </div>
                            <div className="min-w-0">
                                <p className="font-mono text-[9px] leading-[9px] tracking-[1.25px]" style={{ color: "#ba9142" }}>
                                    FREE REWARDS
                                </p>
                                <p className="pt-1 text-[14px] font-semibold leading-[14px]" style={{ color: "#ecf3fc" }}>
                                    Linked Kit
                                </p>
                            </div>
                        </div>

                        {kits.length > 1 ? (
                            <div className="ml-auto w-[min(100%,220px)] shrink-0">
                                <Select value={String(activeIndex)} onValueChange={(value) => setSelectedKit(Number(value))}>
                                    <SelectTrigger
                                        aria-label="Server"
                                        className="h-10 rounded-none border bg-[#0a0e13] text-[13px] font-semibold text-[#ecf3fc] focus:ring-[#ba9142] focus:ring-offset-0"
                                        style={{ borderColor: "rgba(186,145,66,0.55)" }}
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {kits.map((kit, index) => (
                                            <SelectItem key={kit.id ?? kit.label ?? index} value={String(index)}>
                                                {kit.label || kit.kitName || "Server"}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : activeKit?.label ? (
                            <p className="ml-auto truncate text-right text-[13px] font-semibold" style={{ color: "#ecf3fc" }}>
                                {activeKit.label}
                            </p>
                        ) : null}
                    </div>

                    <div className="flex items-center gap-[7px] pt-[14px] font-mono text-[8px] tracking-[0.85px]" style={{ color: "rgba(186,145,66,0.7)" }}>
                        <span>{kitItems.length} {kitItems.length === 1 ? "ITEM" : "ITEMS"}</span>
                        <span className="size-[2px] rounded-[1px] bg-[#ba9142]" />
                        <span>ACCESS IN /KIT {kitName.toUpperCase()}</span>
                    </div>

                    {kits.length > 0 ? (
                        <div className="mt-4">
                            <KitInventory items={kitItems} catalog={rustItemsQuery.data} showCredit={false} />
                        </div>
                    ) : (
                        <p className="pt-4 text-[11px] leading-4" style={{ color: "rgba(142,156,175,0.72)" }}>
                            Kit contents show here after the server reports them, or after they are set in site settings.
                        </p>
                    )}

                    <p
                        className="mt-auto pt-6 font-mono text-[8px] tracking-[0.8px] lg:pt-4"
                        style={{ color: "rgba(142,156,175,0.52)" }}
                    >
                        <Link href="/terms-of-service" className="hover:text-[#ba9142]">
                            TERMS OF SERVICE
                        </Link>
                        {" · "}
                        <Link href="/privacy-policy" className="hover:text-[#ba9142]">
                            PRIVACY POLICY
                        </Link>
                    </p>
                </aside>

                <div className="flex min-w-0 flex-1 flex-col px-6 py-8 sm:px-12 sm:py-10 lg:px-16 lg:py-12">
                    <LinkedUsersCount />

                    <div
                        className="mt-[23px] flex items-start justify-between border-b pb-[9px]"
                        style={{ borderColor: "rgba(148,171,195,0.13)" }}
                    >
                        <p className="font-mono text-[8px] tracking-[1.05px]" style={{ color: "rgba(159,172,192,0.58)" }}>
                            ACCOUNT CONNECTION
                        </p>
                        <p className="font-mono text-[8px] tracking-[1.05px]" style={{ color: "#ba9142" }}>
                            {statusLabel}
                        </p>
                    </div>

                    <div className="flex w-full items-start pt-[22px]">
                        <StepNode
                            label="Steam"
                            active={step === 0}
                            complete={step > 0}
                            icon={<img src="/images/social/steam.svg" alt="" className="size-[22px]" />}
                        />
                        <StepConnector filled={step >= 1} />
                        <StepNode
                            label="Discord"
                            active={step === 1}
                            complete={step > 1}
                            icon={<DiscordIcon className="size-[22px] text-[#ecf3fc]" />}
                        />
                        <StepConnector filled={step >= 2} />
                        <StepNode
                            label="Done"
                            active={step === 2}
                            complete={step >= 2}
                            icon={<CheckIcon className="size-[22px] text-[#ecf3fc]" strokeWidth={2.2} />}
                        />
                    </div>

                    <div className="flex flex-col items-center gap-3 pt-8">
                        {step === 0 && (
                            <LinkCta onClick={() => signIn("steam")}>
                                <img src="/images/social/steam.svg" alt="" className="size-5" />
                                <span className="text-[12px] font-semibold leading-3">Sign in through Steam</span>
                                <span className="link-cta-chevron">›</span>
                            </LinkCta>
                        )}

                        {step === 1 && (
                            <LinkCta
                                disabled={isLinkingDiscord}
                                onClick={() => {
                                    setIsLinkingDiscord(true);
                                    try {
                                        window.location.href = "/api/link/discord/start";
                                    } catch (error) {
                                        console.error("Failed to start Discord linking:", error);
                                        toast.error("Failed to start Discord linking. Please try again.");
                                        setIsLinkingDiscord(false);
                                    }
                                }}
                            >
                                {isLinkingDiscord ? (
                                    <Loader2 className="size-5 animate-spin text-[#ba9142]" />
                                ) : (
                                    <DiscordIcon className="size-5 text-[#ecf3fc]" />
                                )}
                                <span className="text-[12px] font-semibold leading-3">
                                    {isLinkingDiscord ? "Redirecting to Discord…" : "Link Discord"}
                                </span>
                                <span className="link-cta-chevron">›</span>
                            </LinkCta>
                        )}

                        {step === 2 && (
                            <LinkCta href="/profile">
                                <span className="text-[12px] font-semibold leading-3">Continue to profile</span>
                                <span className="link-cta-chevron">›</span>
                            </LinkCta>
                        )}

                        {user?.discordId ? (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <button
                                        type="button"
                                        className="ghost inline-flex items-center gap-1.5 pt-1 text-[11px] tracking-[0.4px]"
                                        style={{ color: "rgba(232,160,163,0.86)" }}
                                        disabled={unlinkMutation.isPending}
                                    >
                                        {unlinkMutation.isPending ? (
                                            <Loader2 className="size-3.5 animate-spin" />
                                        ) : (
                                            <UnlinkIcon className="size-3.5" />
                                        )}
                                        Unlink Discord
                                    </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Unlink Discord Account</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Are you sure you want to unlink your Discord account?
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={() => unlinkMutation.mutate()}
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                            Unlink
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        ) : null}
                    </div>

                    {step === 2 ? (
                        <div className="mt-6 grid w-full gap-3 sm:grid-cols-2">
                            {isGroupEnabled ? (
                                <div
                                    className="border px-4 py-3"
                                    style={{
                                        borderColor: "rgba(255,255,255,0.1)",
                                        backgroundColor: "rgba(7,10,14,0.4)",
                                    }}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <SteamIcon className="h-4 w-7 text-[#ecf3fc]" />
                                            <span className="text-[12px] font-semibold" style={{ color: "#ecf3fc" }}>
                                                Steam group
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            {user?.joinedSteamGroup ? (
                                                <CheckIcon className="size-4 text-[#81d875]" />
                                            ) : (
                                                <span className="font-mono text-[8px] tracking-[0.8px]" style={{ color: "rgba(159,172,192,0.58)" }}>
                                                    OPTIONAL
                                                </span>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => refreshMutation.mutate()}
                                                disabled={!user || refreshMutation.isPending}
                                                className="ghost flex size-7 items-center justify-center border"
                                                style={{ borderColor: "rgba(255,255,255,0.1)", color: "#c5d0de" }}
                                            >
                                                {refreshMutation.isPending ? (
                                                    <Loader2 className="size-3.5 animate-spin" />
                                                ) : (
                                                    <RefreshCcwIcon className="size-3.5" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                    <a
                                        href={settings?.steamGroupUrl ?? "#"}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="ghost mt-3 inline-flex h-8 items-center border px-3 text-[10px] font-bold tracking-[1.2px]"
                                        style={{ borderColor: "rgba(186,145,66,0.6)", color: "#f0c970" }}
                                    >
                                        JOIN GROUP
                                    </a>
                                </div>
                            ) : null}

                            <div
                                className="border px-4 py-3"
                                style={{
                                    borderColor: "rgba(255,255,255,0.1)",
                                    backgroundColor: "rgba(7,10,14,0.4)",
                                }}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <StarIcon className="size-4 text-[#ba9142]" />
                                        <span className="text-[12px] font-semibold" style={{ color: "#ecf3fc" }}>
                                            Boost Discord
                                        </span>
                                    </div>
                                    {user?.isBoosting ? (
                                        <CheckIcon className="size-4 text-[#81d875]" />
                                    ) : (
                                        <span className="font-mono text-[8px] tracking-[0.8px]" style={{ color: "rgba(159,172,192,0.58)" }}>
                                            OPTIONAL
                                        </span>
                                    )}
                                </div>
                                <p className="pt-2 text-[11px] leading-4" style={{ color: "#8292a6" }}>
                                    {user?.isBoosting
                                        ? "Thanks for boosting the server."
                                        : "Support the community for extra perks."}
                                </p>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
            <HomeCardCorners color="#ba9142" show />
        </article>
    );
}
