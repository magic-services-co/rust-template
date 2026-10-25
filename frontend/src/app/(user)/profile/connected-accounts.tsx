'use client'

import { DiscordIcon, SteamIcon } from '@/components/icons'
import { CheckIcon, Loader2, RefreshCcwIcon, UnlinkIcon } from 'lucide-react'
import Link from "next/link"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { getAuthToken } from "@/lib/laravel-auth"
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
} from "@/components/ui/alert-dialog"
import { useMemo, type ReactNode } from "react"
import { refreshSteamGroup, SteamGroupResponse } from "@/app/actions/steam"
import { useRouter } from "next/navigation"
import { useSiteSettings } from "@/hooks/use-site-settings"
import type { SiteSettings } from "@/hooks/use-site-settings"
import { UserSession } from "@/types/next-auth"
import { useProfileTheme } from "@/hooks/use-profile-theme"
import { withUserDefaults } from "@/lib/user-theme-defaults"
import { ProfilePanel } from "@/components/profile/profile-ui"
import { cn } from "@/lib/utils"

interface ConnectedAccountsProps {
    user?: UserSession | null;
    serverTheme?: Record<string, unknown>;
}

export default function ConnectedAccounts({ user, serverTheme }: ConnectedAccountsProps) {
    const { data: clientTheme } = useProfileTheme();
    const theme = withUserDefaults(clientTheme || serverTheme);
    const { data: settings } = useSiteSettings()

    return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2" style={{ gap: theme.spacing }}>
            <RenderSteam user={user} settings={settings} serverTheme={theme} />
            <RenderDiscord user={user} serverTheme={theme} />
        </div>
    )
}

function AccountCard({
    icon,
    kicker,
    title,
    stage,
    children,
}: {
    icon: ReactNode
    kicker: string
    title: string
    stage: string
    children: ReactNode
}) {
    return (
        <ProfilePanel hover className="min-h-[168px]">
            <div className="relative flex h-full flex-col justify-between gap-6 p-5 sm:p-6">
                <div className="flex items-start gap-4">
                    <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center border"
                        style={{ borderColor: "rgba(255,255,255,0.1)", color: "#eef4fb" }}
                    >
                        {icon}
                    </div>
                    <div className="min-w-0">
                        <p className="support-form-kicker text-[9px] font-bold tracking-[1.62px]">{kicker}</p>
                        <h3 className="support-form-title truncate pt-1 text-[18px] font-extrabold leading-6">
                            {title}
                        </h3>
                        <p className="support-form-help pt-1 text-[12px]">{stage}</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {children}
                </div>
            </div>
        </ProfilePanel>
    )
}

function RenderSteam({ user, settings, serverTheme }: { user?: UserSession | null, settings?: SiteSettings, serverTheme?: Record<string, unknown> }) {
    const { data: clientTheme } = useProfileTheme();
    const theme = withUserDefaults(clientTheme || serverTheme);
    const router = useRouter()
    const isGroupEnabled = useMemo(() => {
        return !!settings?.steamGroupId && !!settings?.steamGroupUrl
    }, [settings?.steamGroupId, settings?.steamGroupUrl])

    const stage = useMemo(() => {
        if (!isGroupEnabled) return "Steam account connected"
        if (user?.joinedSteamGroup) return "Joined the Steam group"
        return "Join the Steam group to finish linking"
    }, [isGroupEnabled, user?.joinedSteamGroup])

    const mutation = useMutation({
        mutationFn: async () => {
            const result: SteamGroupResponse = await refreshSteamGroup();
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
        }
    });

    return (
        <AccountCard
            icon={<SteamIcon className="h-6 w-6" />}
            kicker="STEAM"
            title="Steam"
            stage={stage}
        >
            {!isGroupEnabled || user?.joinedSteamGroup ? (
                <span className="ticket-chip ticket-chip-yes">
                    <CheckIcon className="mr-1.5 h-3.5 w-3.5" />
                    CONNECTED
                </span>
            ) : (
                <Link
                    href={!user ? "#" : settings?.steamGroupUrl ?? ""}
                    target="_blank"
                    className={cn(
                        "ghost support-form-btn-primary flex h-[41px] items-center px-4 text-[10px] font-bold tracking-[1.4px]",
                        { "pointer-events-none opacity-50": !user },
                    )}
                >
                    JOIN GROUP
                </Link>
            )}
            {isGroupEnabled ? (
                <button
                    type="button"
                    onClick={() => mutation.mutate()}
                    disabled={!user || mutation.isPending}
                    className="ghost support-form-btn-secondary flex h-[41px] w-[41px] items-center justify-center disabled:opacity-40"
                    aria-label="Refresh Steam group"
                    style={{ color: theme.buttonSecondaryText }}
                >
                    {mutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <RefreshCcwIcon className="h-4 w-4" />
                    )}
                </button>
            ) : null}
        </AccountCard>
    )
}

function RenderDiscord({ user, serverTheme }: { user?: UserSession | null, serverTheme?: Record<string, unknown> }) {
    const { data: clientTheme } = useProfileTheme();
    const theme = withUserDefaults(clientTheme || serverTheme);
    const linked = !!user?.discordId
    const boosting = !!user?.isBoosting
    const stage = !linked
        ? "Connect your Discord account"
        : boosting
            ? "Linked and boosting the server"
            : "Linked — boosting is optional"

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
                const reason = data?.reason;
                const msg = data?.error ?? data?.message ?? "Failed to unlink account";
                if (response.status === 401 && (reason === "no_token" || !token)) {
                    throw new Error("Your session has expired or you're signed in from a different address. Please sign in again.");
                }
                throw new Error(msg);
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

    return (
        <AccountCard
            icon={<DiscordIcon className="h-6 w-6" />}
            kicker="DISCORD"
            title="Discord"
            stage={stage}
        >
            {linked ? (
                <span className={cn("ticket-chip", boosting ? "ticket-chip-yes" : "")}>
                    <CheckIcon className="mr-1.5 h-3.5 w-3.5" />
                    {boosting ? "BOOSTING" : "LINKED"}
                </span>
            ) : (
                <button
                    type="button"
                    onClick={() => { window.location.href = '/api/link/discord/start' }}
                    disabled={!user}
                    className="ghost support-form-btn-primary flex h-[41px] items-center px-4 text-[10px] font-bold tracking-[1.4px] disabled:opacity-40"
                >
                    LINK DISCORD
                </button>
            )}
            {linked ? (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <button
                            type="button"
                            disabled={unlinkMutation.isPending}
                            className="ghost support-form-btn-secondary flex h-[41px] items-center px-4 text-[10px] font-bold tracking-[1.4px] disabled:opacity-40"
                            style={{ color: theme.buttonDestructiveText, borderColor: "rgba(232, 160, 163, 0.35)" }}
                        >
                            {unlinkMutation.isPending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <UnlinkIcon className="mr-2 h-4 w-4" />
                            )}
                            UNLINK
                        </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="z-[200] rounded-none border" style={{
                        backgroundColor: theme.contentCardBackground,
                        borderColor: theme.contentCardBorder,
                    }}>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="support-form-title">Unlink Discord</AlertDialogTitle>
                            <AlertDialogDescription className="support-form-help">
                                Are you sure you want to unlink your Discord account?
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="ghost support-form-btn-secondary h-[41px] rounded-none px-4 text-[10px] font-bold tracking-[1.4px]">
                                CANCEL
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() => unlinkMutation.mutate()}
                                className="ghost support-form-btn-primary h-[41px] rounded-none px-4 text-[10px] font-bold tracking-[1.4px]"
                                style={{ color: theme.buttonDestructiveText, borderColor: "rgba(232, 160, 163, 0.45)" }}
                            >
                                UNLINK
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            ) : null}
        </AccountCard>
    )
}
