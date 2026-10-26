import type { ComponentType, ReactNode } from "react"
import type { User } from "next-auth"

import type { CookieConsent } from "@/hooks/use-cookie-consent"

import type { AdminNavMainItem } from "@/components/admin/navigation/nav-main"
import type { NavigationItem } from "@/types/navigation"
import type { RustItemInfo } from "@/lib/rust-items"
import type { UserSession } from "@/types/next-auth"

export type PublicFrontLinkKit = {
  id?: number
  label?: string
  kitName?: string
  items?: { shortname: string; amount: number; slot?: string | null; condition?: number | null }[]
}

export type PublicFrontSlots = {
  home?: ComponentType
  chrome?: ComponentType<{
    children: ReactNode
    navItems: NavigationItem[]
    navTheme: Record<string, unknown>
    siteName?: string
    logoImage?: string
  }>
  mainNav?: ComponentType<{ items: NavigationItem[] }>
  userNav?: ComponentType
  mobileNav?: ComponentType<{
    items: NavigationItem[]
    logoImage?: string
    wordmarkColor?: string
    siteName?: string
  }>
  profile?: ComponentType<{ user: UserSession; theme?: Record<string, unknown> }>
  linkPage?: ComponentType<{
    user?: UserSession | null
    linkStatus?: "success" | "error" | "join_required" | null
    needsDiscordJoin?: boolean
    initialKits?: PublicFrontLinkKit[]
  }>
  linkStepper?: ComponentType<{
    step: number
    user?: UserSession | null
    kits: PublicFrontLinkKit[]
    kitItems: { shortname: string; amount: number; slot?: string | null; condition?: number | null }[]
    activeIndex: number
    setSelectedKit: (index: number) => void
    isGroupEnabled: boolean
    steamGroupUrl?: string | null
    isLinkingDiscord: boolean
    setIsLinkingDiscord: (value: boolean) => void
    unlinkPending: boolean
    onUnlink: () => void
    needsDiscordJoin?: boolean
    discordInvite?: string | null
    discordRefreshPending?: boolean
    onRefreshDiscord?: () => void
    catalog?: Map<string, RustItemInfo>
  }>
  supportPage?: ComponentType<{
    isSignedIn: boolean
    isBanned: boolean
    banReason?: string | null
  }>
  supportCategory?: ComponentType<{
    slug: string
    categoryName: string
    categorySubtitle?: string
    theme?: Record<string, unknown>
  }>
  leaderboard?: ComponentType<{ section: "casual" | "ranked" | "weapons" | "player" | "rules" | "compare" | "match" | "sandbox"; steamId?: string; matchId?: string }>
  ticketView?: ComponentType<{ ticketId: number; currentUser: User }>
  legalPage?: ComponentType<{ kind: "terms" | "privacy" }>
  cookieBanner?: ComponentType
  cookieDialog?: ComponentType<{
    open: boolean
    onOpenChange: (open: boolean) => void
    initialConsent: CookieConsent
    onSave: (consent: CookieConsent) => void
  }>
  errorPage?: ComponentType<{
    kicker: string
    title: string
    titleAccent?: string
    subtitle?: string
    children?: ReactNode
    actions?: ReactNode
    fillViewport?: boolean
  }>
  storeFrame?: ComponentType<{
    theme?: Record<string, unknown>
    showSidebar: boolean
    children: ReactNode
  }>
}

export type PublicFrontDefinition = {
  id: string
  adminNav?: AdminNavMainItem[]
  slots: PublicFrontSlots
}
