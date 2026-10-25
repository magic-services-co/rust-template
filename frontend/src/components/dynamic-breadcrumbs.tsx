'use client'

import React from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { useNavlinks } from '@/hooks/store/use-storefront'
import { searchParamsBreadcrumbsMap } from '@/config/breadcrumbs'

type NavLink = {
    node_id: string
    name: string
    tag_slug: string
    children: NavLink[]
}

const findNavLinkBySlug = (navLinks: NavLink[], slug: string): NavLink | null => {
    for (const link of navLinks) {
        if (link.tag_slug === slug) return link
        const childResult = findNavLinkBySlug(link.children, slug)
        if (childResult) return childResult
    }
    return null
}

const buildBreadcrumbs = (navLinks: NavLink[], fullPath: string): { name: string; path: string }[] => {
    const pathParts = fullPath.split('/').filter(Boolean)
    const breadcrumbs: { name: string; path: string }[] = []

    let currentNavLinks = navLinks
    let accumulatedPath = ''

    for (const part of pathParts) {
        accumulatedPath += `/${part}`
        const navLink = findNavLinkBySlug(currentNavLinks, part)
        if (navLink) {
            breadcrumbs.push({
                name: navLink.name,
                path: accumulatedPath  
            })
            currentNavLinks = navLink.children
        } else {
            const segmentLabels: Record<string, string> = { theme: "Site Editor", api: "API" }
            const name = segmentLabels[part] ?? part.charAt(0).toUpperCase() + part.slice(1)
            if (name === 'Ticket' && accumulatedPath === '/admin/ticket') {
                breadcrumbs.push({
                    name: 'Tickets',
                    path: '/admin/tickets'
                })
                continue;
            }
            breadcrumbs.push({
                name,
                path: accumulatedPath 
            })
        }
    }

    return breadcrumbs
}

const tabMappings: Record<string, string> = {
    pvp_stats: "PvP Stats",
    resources_stats: "Resources",
    explosives_stats: "Explosives",
    farming_stats: "Farming",
    misc_stats: "Misc",
    events_stats: "Events",
    pve_stats: "PVE Stats",
    gambling_stats: "Gambling Stats",
}

export default function DynamicBreadcrumbs() {
    const navLinks = useNavlinks()
    const pathname = usePathname()
    const searchParams = useSearchParams();

    const breadcrumbs = buildBreadcrumbs(navLinks.data ?? [], pathname)

    const getSearchParamsBreadcrumbs = () => {
        return Object.entries(searchParamsBreadcrumbsMap).reduce((acc, [key, { label, getValue }]) => {
            const value = searchParams.get(key)
            if (value) {
                acc.push({
                    name: `${label}: ${getValue ? getValue(value) : value}`,
                    path: `${pathname}?${key}=${value}`
                })
            }
            return acc
        }, [] as { name: string; path: string }[])
    }

    const searchParamsBreadcrumbs = getSearchParamsBreadcrumbs()

    return (
        <Breadcrumb>
            <BreadcrumbList>
                <BreadcrumbItem>
                    <BreadcrumbLink href="/">Home</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                {breadcrumbs.map((crumb, index) => (
                    <React.Fragment key={crumb.path}>
                        <BreadcrumbItem>
                            {index === breadcrumbs.length - 1 && !searchParams.has("tab") ? (
                                <BreadcrumbPage className="capitalize">{formatBreadcrumbName(crumb.name)}</BreadcrumbPage>
                            ) : (
                                <BreadcrumbLink href={crumb.path} className="capitalize">
                                    {formatBreadcrumbName(crumb.name)}
                                </BreadcrumbLink>
                            )}
                        </BreadcrumbItem>
                        {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
                    </React.Fragment>
                ))}
                {searchParamsBreadcrumbs.map((crumb, index) => (
                    <React.Fragment key={crumb.path}>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>{formatBreadcrumbName(crumb.name)}</BreadcrumbPage>
                        </BreadcrumbItem>
                    </React.Fragment>
                ))}
                {searchParams.has("tab") ? (
                    <>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage className='capitalize'>
                                {(() => {
                                    const tab = searchParams.get("tab") ?? "";
                                    if (tab in tabMappings) {
                                        return tabMappings[tab as keyof typeof tabMappings];
                                    }
                                    return formatBreadcrumbName(tab);
                                })()}
                            </BreadcrumbPage>
                        </BreadcrumbItem>
                    </>
                ) : null}
            </BreadcrumbList>
        </Breadcrumb>
    )
}

function formatBreadcrumbName(name: string) {
    return (name.toLowerCase() === "admin" ? "Admin Dashboard" : name).replace(/[-_]/g, " ");
}