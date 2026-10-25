"use client";

import { usePublicFront } from "@/lib/public-front";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ChevronDown, ShieldIcon, LogOutIcon, UserIcon } from "lucide-react";
import { useSession, signIn, signOut } from "@/lib/laravel-auth-react"
import Link from "next/link";
import { useMemo, useState } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "../ui/dropdown-menu";
import { LAYOUT_THEME_DEFAULTS } from "@/lib/layout-theme-defaults";
function getHighestRole(roles: Array<{ role?: { name?: string; color?: string | null; order?: number } }> | undefined) {
    if (!roles?.length) return null;
    const withOrder = roles
        .map((r) => r.role)
        .filter((r): r is { name?: string; color?: string | null; order?: number } => !!r)
        .map((r) => ({ ...r, order: typeof r.order === 'number' ? r.order : 0 }));
    if (withOrder.length === 0) return null;
    const lowest = Math.min(...withOrder.map((r) => r.order));
    return withOrder.find((r) => r.order === lowest) ?? withOrder[0];
}

export function UserNav({
    theme,
}: {
    theme?: {
        primaryButtonBg?: string;
        primaryButtonHover?: string;
        primaryButtonText?: string;
        primaryTitleColor?: string;
        secondaryTextColor?: string;
    };
} = {}) {
    const [isOpen, setIsOpen] = useState(false)
    const AimUserNav = usePublicFront().slots.userNav
    const { data: session, status } = useSession()
    const [signInHover, setSignInHover] = useState(false)

    const highestRole = useMemo(
        () => getHighestRole(session?.user?.roles as Array<{ role?: { name?: string; color?: string | null; order?: number } }> | undefined),
        [session?.user?.roles]
    )

    const handleLogout = () => {
        signOut({ callbackUrl: "/" })
    }

    const signInBg = signInHover
        ? theme?.primaryButtonHover || LAYOUT_THEME_DEFAULTS.primaryButtonHover
        : theme?.primaryButtonBg || LAYOUT_THEME_DEFAULTS.primaryButtonBg
    const signInColor = theme?.primaryButtonText || LAYOUT_THEME_DEFAULTS.primaryButtonText
    const nameColor = theme?.primaryTitleColor || LAYOUT_THEME_DEFAULTS.primaryTitleColor
    const mutedColor = theme?.secondaryTextColor || LAYOUT_THEME_DEFAULTS.secondaryTextColor
    const displayName = typeof session?.user?.name === "string" ? session.user.name : ""
    const displayImage = typeof session?.user?.image === "string" ? session.user.image : ""
    const roleLabel = highestRole?.name || "View profile"
    const roleColor = highestRole?.color || mutedColor

    if (AimUserNav) return <AimUserNav />

    if (status === "loading") {
        return (
            <div
                className="h-10 w-[168px] shrink-0"
                style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
            />
        )
    }

    if (status === "unauthenticated") {
        return (
            <button
                type="button"
                onClick={() => signIn("steam")}
                onMouseEnter={() => setSignInHover(true)}
                onMouseLeave={() => setSignInHover(false)}
                className="layout-sign-in ghost flex h-9 min-w-[96px] shrink-0 items-center justify-center rounded-md px-4 text-center text-[13px] font-medium leading-none"
                style={{
                    backgroundColor: signInBg,
                    color: signInColor,
                    ["--layout-signin-bg" as string]: signInBg,
                    ["--layout-signin-text" as string]: signInColor,
                }}
            >
                Sign in
            </button>
        )
    }

    return (
        <DropdownMenu modal={false} open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    className="ghost site-user-trigger relative flex h-full items-center gap-3 p-0 opacity-90 outline-none transition-opacity duration-300 hover:opacity-100"
                    data-theme-field="userMenuBackground"
                    data-theme-label="Profile dropdown"
                >
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={displayImage} alt={displayName} />
                        <AvatarFallback>{displayName ? displayName.charAt(0) : "?"}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start">
                        <span className="text-[15px] font-medium leading-5" style={{ color: nameColor }}>
                            {displayName}
                        </span>
                        <span className="text-[11px] leading-4" style={{ color: roleColor }}>
                            {roleLabel}
                        </span>
                    </div>
                    <ChevronDown
                        className="h-4 w-4 shrink-0 transition-transform duration-200"
                        style={{
                            color: mutedColor,
                            transform: isOpen ? "rotate(180deg)" : undefined,
                        }}
                    />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                sideOffset={14}
                className="site-user-menu z-[200] min-w-[228px] rounded-none border p-0"
                data-theme-field="userMenuBackground"
                data-theme-label="Profile dropdown"
                onCloseAutoFocus={(event) => event.preventDefault()}
            >
                <div className="px-4 py-3" data-theme-field="userMenuNameColor" data-theme-label="Dropdown name">
                    <p className="site-user-menu-kicker text-[9px] font-bold tracking-[1.62px]" data-theme-field="userMenuKickerColor" data-theme-label="ACCOUNT label">ACCOUNT</p>
                    <p className="site-user-menu-name truncate pt-1 text-[15px] font-extrabold leading-5">
                        {displayName}
                    </p>
                </div>
                <DropdownMenuSeparator className="site-user-menu-divider mx-0 my-0" />
                <DropdownMenuItem asChild className="site-user-menu-item rounded-none px-4 py-2.5">
                    <Link href="/profile" onClick={() => setIsOpen(false)} data-theme-field="userMenuItemColor" data-theme-label="Dropdown items">
                        <UserIcon className="mr-2.5 h-4 w-4" />
                        View profile
                    </Link>
                </DropdownMenuItem>
                {session?.user?.isAdmin ? (
                    <DropdownMenuItem asChild className="site-user-menu-item rounded-none px-4 py-2.5">
                        <Link href="/admin" onClick={() => setIsOpen(false)} data-theme-field="userMenuItemColor" data-theme-label="Dropdown items">
                            <ShieldIcon className="mr-2.5 h-4 w-4" />
                            Admin dashboard
                        </Link>
                    </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator className="site-user-menu-divider mx-0 my-0" />
                <DropdownMenuItem
                    className="site-user-menu-item site-user-menu-signout rounded-none px-4 py-2.5"
                    data-theme-field="userMenuSignoutColor"
                    data-theme-label="Sign out"
                    onClick={handleLogout}
                >
                    <LogOutIcon className="mr-2.5 h-4 w-4" />
                    Sign out
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
