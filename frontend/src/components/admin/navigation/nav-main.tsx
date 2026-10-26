"use client"

import { useEffect, useState } from "react"
import { ChevronRight, type LucideIcon } from "lucide-react"
import { usePathname } from "next/navigation"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import Link from "next/link"
import { adminNavKey, useAdminSidebarPrefs } from "@/components/admin/navigation/admin-sidebar-prefs"

export type AdminNavMainItem = {
  title: string
  url: string
  icon?: LucideIcon
  isActive?: boolean
  items?: {
    title: string
    url: string
  }[]
}

function toAdminHref(url: string) {
  if (!url || url === "#") return null
  const path = url.startsWith("/") ? url : `/${url}`
  return `/admin${path}`.replace(/\/{2,}/g, "/")
}

function pathMatches(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

function collectHrefs(items: AdminNavMainItem[]) {
  const hrefs: string[] = []
  for (const item of items) {
    if (!item.items) {
      const href = toAdminHref(item.url)
      if (href) hrefs.push(href)
    }
    for (const sub of item.items ?? []) {
      const href = toAdminHref(sub.url)
      if (href) hrefs.push(href)
    }
  }
  return hrefs
}

function resolveActiveHref(pathname: string, items: AdminNavMainItem[]) {
  const matches = collectHrefs(items).filter((href) => pathMatches(pathname, href))
  matches.sort((a, b) => b.length - a.length)
  return matches[0] ?? null
}

function NavCollapsibleItem({
  item,
  activeHref,
}: {
  item: AdminNavMainItem
  activeHref: string | null
}) {
  const sectionActive = (item.items ?? []).some(
    (subItem) => toAdminHref(subItem.url) === activeHref
  )
  const [open, setOpen] = useState(sectionActive || !!item.isActive)

  useEffect(() => {
    if (sectionActive) setOpen(true)
  }, [sectionActive])

  return (
    <Collapsible
      asChild
      open={open}
      onOpenChange={setOpen}
      className="group/collapsible"
    >
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip={item.title} isActive={sectionActive}>
            {item.icon && <item.icon />}
            <span>{item.title}</span>
            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.items?.map((subItem) => {
              const href = toAdminHref(subItem.url)
              const active = href === activeHref
              return (
                <SidebarMenuSubItem key={subItem.title}>
                  <SidebarMenuSubButton asChild isActive={active}>
                    <Link href={href ?? "#"}>
                      <span>{subItem.title}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              )
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
}

function visibleNavItems(items: AdminNavMainItem[], hidden: Set<string>, activeHref: string | null) {
  const visible: AdminNavMainItem[] = []
  for (const item of items) {
    const key = adminNavKey(item.title, item.url)
    const groupHidden = hidden.has(key)
    if (!item.items) {
      const href = toAdminHref(item.url)
      if (!groupHidden || href === activeHref) visible.push(item)
      continue
    }
    const subs = item.items.filter((sub) => {
      const href = toAdminHref(sub.url)
      if (href === activeHref) return true
      if (groupHidden) return false
      return !hidden.has(adminNavKey(`${item.title}/${sub.title}`, sub.url))
    })
    if (subs.length > 0) visible.push({ ...item, items: subs })
  }
  return visible
}

function NavMenuBlock({
  label,
  items,
  activeHref,
}: {
  label: string
  items: AdminNavMainItem[]
  activeHref: string | null
}) {
  const collapsibleItems = items.filter((item) => !!item.items)
  const nonCollapsibleItems = items.filter((item) => !item.items)

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarMenu>
        {nonCollapsibleItems.map((item) => {
          const href = toAdminHref(item.url)
          const active = href === activeHref
          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild tooltip={item.title} isActive={active}>
                <Link href={href ?? "#"}>
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}

        {collapsibleItems.map((item) => (
          <NavCollapsibleItem key={item.title} item={item} activeHref={activeHref} />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}

export function NavMain({
  items,
  addonItems = [],
}: {
  items: AdminNavMainItem[]
  addonItems?: AdminNavMainItem[]
}) {
  const pathname = usePathname()
  const { hidden } = useAdminSidebarPrefs()
  const activeHref = resolveActiveHref(pathname, [...items, ...addonItems])
  const platform = visibleNavItems(items, hidden, activeHref)
  const addons = visibleNavItems(addonItems, hidden, activeHref)

  return (
    <>
      {platform.length > 0 ? (
        <NavMenuBlock label="Platform" items={platform} activeHref={activeHref} />
      ) : null}
      {addons.length > 0 ? (
        <NavMenuBlock label="Addons" items={addons} activeHref={activeHref} />
      ) : null}
    </>
  )
}
