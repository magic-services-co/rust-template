'use client'

import Link from 'next/link'
import { useLayoutEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import ConnectedAccounts from './connected-accounts'
import Transactions from './transactions'
import Subscriptions from './subscriptions'
import { UserSession } from '@/types/next-auth'
import Tickets from './tickets'
import { useProfileTheme } from '@/hooks/use-profile-theme'
import { withUserDefaults } from '@/lib/user-theme-defaults'
import { UserBanStatus } from '@/components/bans/user-ban-status'
import { cn } from '@/lib/utils'

const TABS = [
    { value: 'connected-accounts', label: 'ACCOUNTS' },
    { value: 'tickets', label: 'TICKETS' },
    { value: 'transactions', label: 'ORDERS' },
    { value: 'subscriptions', label: 'SUBSCRIPTIONS' },
    { value: 'ban-status', label: 'BANS' },
] as const

function scrollActiveTab(scroller: HTMLElement, behavior: ScrollBehavior) {
    const active = scroller.querySelector(".store-tab-active")
    if (!(active instanceof HTMLElement)) return
    const left = active.offsetLeft - (scroller.clientWidth - active.offsetWidth) / 2
    const max = Math.max(0, scroller.scrollWidth - scroller.clientWidth)
    const target = Math.max(0, Math.min(left, max))
    if (Math.abs(target - scroller.scrollLeft) < 2) return
    scroller.scrollTo({ left: target, behavior })
}

function tabHref(value: string) {
    return value === 'connected-accounts' ? '/profile' : `/profile?tab=${value}`
}

interface ProfileTabsProps {
    user: UserSession;
    serverTheme?: Record<string, unknown>;
}

export function ProfileTabs({ user, serverTheme }: ProfileTabsProps) {
    const { data: clientTheme } = useProfileTheme();
    const theme = withUserDefaults(clientTheme || serverTheme);
    const searchParams = useSearchParams()
    const requested = searchParams.get('tab') || 'connected-accounts'
    const activeTab = TABS.some((tab) => tab.value === requested) ? requested : 'connected-accounts'
    const scrollerRef = useRef<HTMLDivElement>(null)
    const readyRef = useRef(false)

    useLayoutEffect(() => {
        const scroller = scrollerRef.current
        if (!scroller) return
        const behavior = readyRef.current ? "smooth" : "auto"
        readyRef.current = true
        scrollActiveTab(scroller, behavior)
    }, [activeTab])

    return (
        <div className="pt-8">
            <div
                ref={scrollerRef}
                className="store-tab-scroller flex min-w-0 max-w-full gap-1 overflow-x-auto border p-1"
                style={{
                    backgroundColor: "#0a0e14",
                    borderColor: "rgba(255, 255, 255, 0.1)",
                    ["--store-tab-inactive" as string]: "#93a4b8",
                    ["--store-tab-active-text" as string]: "#080a0e",
                    ["--store-tab-active-bg" as string]: "#ba9142",
                }}
            >
                {TABS.map((tab) => {
                    const isActive = activeTab === tab.value
                    return (
                        <Link
                            key={tab.value}
                            href={tabHref(tab.value)}
                            scroll={false}
                            prefetch
                            className={cn(
                                "ghost shrink-0 whitespace-nowrap px-4 py-2 text-center text-[10px] font-bold tracking-[1.4px]",
                                isActive ? "store-tab-active" : "store-tab",
                            )}
                        >
                            {tab.label}
                        </Link>
                    )
                })}
            </div>

            <div className="pt-6">
                {activeTab === 'connected-accounts' ? <ConnectedAccounts user={user} serverTheme={theme} /> : null}
                {activeTab === 'tickets' ? <Tickets serverTheme={theme} /> : null}
                {activeTab === 'transactions' ? <Transactions serverTheme={theme} /> : null}
                {activeTab === 'subscriptions' ? <Subscriptions serverTheme={theme} /> : null}
                {activeTab === 'ban-status' && user.id ? <UserBanStatus userId={user.id} serverTheme={theme} /> : null}
            </div>
        </div>
    )
}
