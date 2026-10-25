"use client";

import { usePublicFront } from "@/lib/public-front";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSession, signIn, signOut } from "@/lib/laravel-auth-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
    Sheet,
    SheetContent,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { LogOutIcon, MenuIcon, ShieldIcon, UserIcon, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { BrandMark } from "@/components/brand-mark";
import { HomeCardCorners } from "@/components/home/home-card-corners";
import { LAYOUT_THEME_DEFAULTS } from "@/lib/layout-theme-defaults";
import { NavigationItem } from "@/types/navigation";

const GOLD = "#ba9142";

function getHighestRole(roles: Array<{ role?: { name?: string; color?: string | null; order?: number } }> | undefined) {
    if (!roles?.length) return null;
    const withOrder = roles
        .map((r) => r.role)
        .filter((r): r is { name?: string; color?: string | null; order?: number } => !!r)
        .map((r) => ({ ...r, order: typeof r.order === "number" ? r.order : 0 }));
    if (withOrder.length === 0) return null;
    const lowest = Math.min(...withOrder.map((r) => r.order));
    return withOrder.find((r) => r.order === lowest) ?? withOrder[0];
}

export default function MobileNav({
    items,
    logoImage,
    wordmarkColor,
    theme,
    siteName,
}: {
    items: NavigationItem[];
    logoImage?: string;
    wordmarkColor?: string;
    siteName?: string;
    theme?: {
        navLinkColor?: string;
        navLinkHoverColor?: string;
        navLinkActiveColor?: string;
        primaryButtonBg?: string;
        primaryButtonHover?: string;
        primaryButtonText?: string;
        primaryTitleColor?: string;
        secondaryTextColor?: string;
    };
}) {
    const path = usePathname();
    const AimMobile = usePublicFront().slots.mobileNav;
    const { data: session, status } = useSession();
    const [isOpen, setIsOpen] = useState(false);
    const [signInHover, setSignInHover] = useState(false);
    const visible = items.filter((item) => !item.hidden);
    const highestRole = useMemo(
        () => getHighestRole(session?.user?.roles as Array<{ role?: { name?: string; color?: string | null; order?: number } }> | undefined),
        [session?.user?.roles],
    );

    const displayName = typeof session?.user?.name === "string" ? session.user.name : "";
    const displayImage = typeof session?.user?.image === "string" ? session.user.image : "";
    const mutedColor = theme?.secondaryTextColor || LAYOUT_THEME_DEFAULTS.secondaryTextColor;
    const roleLabel = highestRole?.name || "View profile";
    const roleColor = highestRole?.color || mutedColor;
    const signInBg = signInHover
        ? theme?.primaryButtonHover || LAYOUT_THEME_DEFAULTS.primaryButtonHover
        : theme?.primaryButtonBg || LAYOUT_THEME_DEFAULTS.primaryButtonBg;
    const signInColor = theme?.primaryButtonText || LAYOUT_THEME_DEFAULTS.primaryButtonText;

    if (AimMobile) {
        return <AimMobile items={items} logoImage={logoImage} wordmarkColor={wordmarkColor} siteName={siteName} />;
    }

    return (
        <>
            <BrandMark logoImage={logoImage} wordmarkColor={wordmarkColor} size="header" siteName={siteName} />
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                    <button
                        type="button"
                        className="ghost site-mobile-trigger relative flex h-10 w-10 shrink-0 items-center justify-center border outline-none"
                        aria-label={isOpen ? "Close menu" : "Open menu"}
                        data-theme-field="navLinkColor"
                        data-theme-label="Mobile menu"
                    >
                        {isOpen ? <X className="h-5 w-5" strokeWidth={1.75} /> : <MenuIcon className="h-5 w-5" strokeWidth={1.75} />}
                    </button>
                </SheetTrigger>
                <SheetContent
                    side="right"
                    className="site-mobile-nav flex h-full w-[min(88vw,360px)] flex-col gap-0 overflow-visible rounded-none border p-0 shadow-none sm:max-w-[360px]"
                    data-theme-field="userMenuBackground"
                    data-theme-label="Mobile menu"
                >
                    <SheetTitle className="sr-only">Menu</SheetTitle>
                    <HomeCardCorners color={GOLD} show />
                    <div className="relative z-[1] flex h-full min-h-0 flex-col">
                        <div className="flex h-[94px] items-center justify-between border-b px-4" style={{ borderColor: "var(--user-menu-divider, rgba(255,255,255,0.1))" }}>
                            <BrandMark logoImage={logoImage} wordmarkColor={wordmarkColor} size="header" siteName={siteName} />
                            <button
                                type="button"
                                className="ghost site-mobile-close flex h-10 w-10 items-center justify-center border outline-none"
                                aria-label="Close menu"
                                onClick={() => setIsOpen(false)}
                            >
                                <X className="h-5 w-5" strokeWidth={1.75} />
                            </button>
                        </div>

                        <p className="site-user-menu-kicker px-5 pt-6 text-[9px] font-bold tracking-[1.62px]">MENU</p>
                        <nav className="mt-3 flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-4" data-theme-field="navLinkColor" data-theme-label="Nav links">
                            {visible.map((item, index) => {
                                const isActive = item.url === path || (item.url !== "/" && path.startsWith(item.url));
                                return (
                                    <Link
                                        key={item.id || index}
                                        href={item.url}
                                        aria-current={isActive ? "page" : undefined}
                                        className={cn("site-mobile-link", isActive && "active")}
                                        onClick={() => setIsOpen(false)}
                                    >
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </nav>

                        <div className="mt-auto border-t px-3 py-4" style={{ borderColor: "var(--user-menu-divider, rgba(255,255,255,0.1))" }}>
                            {status === "authenticated" ? (
                                <>
                                    <div className="flex items-center gap-3 px-2 py-2" data-theme-field="userMenuNameColor" data-theme-label="Dropdown name">
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={displayImage} alt={displayName} />
                                            <AvatarFallback>{displayName ? displayName.charAt(0) : "?"}</AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0 flex-1">
                                            <p className="site-user-menu-kicker text-[9px] font-bold tracking-[1.62px]">ACCOUNT</p>
                                            <p className="site-user-menu-name truncate pt-0.5 text-[15px] font-extrabold leading-5">{displayName}</p>
                                            <p className="truncate text-[11px] leading-4" style={{ color: roleColor }}>{roleLabel}</p>
                                        </div>
                                    </div>
                                    <Link
                                        href="/profile"
                                        className="site-user-menu-item mt-1 flex items-center rounded-none px-3 py-2.5 text-[13px] font-medium"
                                        data-theme-field="userMenuItemColor"
                                        data-theme-label="Dropdown items"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        <UserIcon className="mr-2.5 h-4 w-4" />
                                        View profile
                                    </Link>
                                    {session?.user?.isAdmin ? (
                                        <Link
                                            href="/admin"
                                            className="site-user-menu-item flex items-center rounded-none px-3 py-2.5 text-[13px] font-medium"
                                            data-theme-field="userMenuItemColor"
                                            data-theme-label="Dropdown items"
                                            onClick={() => setIsOpen(false)}
                                        >
                                            <ShieldIcon className="mr-2.5 h-4 w-4" />
                                            Admin dashboard
                                        </Link>
                                    ) : null}
                                    <button
                                        type="button"
                                        className="site-user-menu-item site-user-menu-signout ghost mt-1 flex w-full items-center rounded-none px-3 py-2.5 text-left text-[13px] font-medium"
                                        data-theme-field="userMenuSignoutColor"
                                        data-theme-label="Sign out"
                                        onClick={() => {
                                            setIsOpen(false);
                                            signOut({ callbackUrl: "/" });
                                        }}
                                    >
                                        <LogOutIcon className="mr-2.5 h-4 w-4" />
                                        Sign out
                                    </button>
                                </>
                            ) : status === "loading" ? (
                                <div className="h-11 w-full" style={{ backgroundColor: "rgba(255,255,255,0.06)" }} />
                            ) : (
                                <button
                                    type="button"
                                    className="site-mobile-signin ghost flex h-11 w-full items-center justify-center text-[13px] font-medium"
                                    onMouseEnter={() => setSignInHover(true)}
                                    onMouseLeave={() => setSignInHover(false)}
                                    onClick={() => {
                                        setIsOpen(false);
                                        signIn("steam");
                                    }}
                                    style={{
                                        backgroundColor: signInBg,
                                        color: signInColor,
                                    }}
                                >
                                    Sign in
                                </button>
                            )}
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
}
