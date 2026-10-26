"use client"

import * as React from "react"
import {
  AudioWaveform,
  BookOpen,
  Bot,
  Command,
  Cpu,
  Workflow,
  Frame,
  FileText,
  GalleryVerticalEnd,
  Map,
  Package2,
  PieChart,
  Server,
  Settings2,
  SquareTerminal,
  Ticket,
  Users2,
  Key,
  Globe,
  Image,
  Shield,
} from "lucide-react"

import { useQuery } from "@tanstack/react-query"
import { useSavedPageTheme } from "@/hooks/use-saved-page-theme"

import { NavMain } from "@/components/admin/navigation/nav-main"
import { NavUser } from "@/components/admin/navigation/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { AdminSidebarPrefsProvider } from "@/components/admin/navigation/admin-sidebar-prefs"
import { useAddonAdminNavItems } from "@/hooks/use-addon-admin-nav"
import { useSiteSettings } from "@/hooks/use-site-settings"
import { backendApi } from "@/lib/api"
import { LAYOUT_THEME_DEFAULTS } from "@/lib/layout-theme-defaults"
import Link from "next/link"

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Users",
      url: "/users",
      icon: Users2,
    },
    {
      title: "Bans",
      url: "/bans",
      icon: Shield,
    },
    {
      title: "Tickets",
      url: "/tickets",
      icon: Ticket,
    },
    {
      title: "Map Voting",
      url: "/map-voting",
      icon: Map,
    },
    {
      title: "Servers",
      url: "/servers",
      icon: Server,
    },
    {
      title: "Automation",
      url: "/automation",
      icon: Workflow,
    },
    {
      title: "Pages",
      url: "/server-pages",
      icon: FileText,
    },
    {
      title: "CDN",
      url: "/cdn",
      icon: Image,
    },
    {
      title: "Global Settings",
      url: "#",
      icon: Globe,
      items: [
        {
          title: "Site Settings",
          url: "/settings/site-settings",
        },
        {
          title: "Navigation",
          url: "/settings/navigation",
        },
        {
          title: "Redirects",
          url: "/settings/redirects",
        },
        {
          title: "Store Settings",
          url: "/settings/store",
        },
        {
          title: "Discord Integration",
          url: "/settings/discord",
        },
        {
          title: "BattleMetrics Integration",
          url: "/settings/battlemetrics",
        },
        {
          title: "Roles",
          url: "/settings/permissions",
        },
        {
          title: "Grid Images & Retention",
          url: "/settings/grid-images",
        },
      ],
    },
    {
      title: "Settings",
      url: "#",
      icon: Settings2,
      items: [
        {
          title: "Ticket Settings",
          url: "/ticket-settings",
        },
        {
          title: "Leaderboard Settings",
          url: "/leaderboard",
        },
        {
          title: "SEO Settings",
          url: "/seo",
        },
        {
          title: "Site Editor",
          url: "/theme",
        },
        {
          title: "Legal Information",
          url: "/legal",
        },
        {
          title: "Admin Logs",
          url: "/logs",
        },
        {
          title: "API Keys",
          url: "/settings/api-keys",
        },
        {
          title: "API Reference",
          url: "/api",
        },
      ],
    },
    {
      title: "System Control",
      url: "#",
      icon: Cpu,
      items: [
        {
          title: "Dashboard",
          url: "system-control",
        },
        {
          title: "Website update",
          url: "/update",
        },
        {
          title: "Addons",
          url: "system-control/addons",
        },
        {
          title: "Discord Bot",
          url: "system-control/discord-bot",
        },
        {
          title: "Harmony mod",
          url: "system-control/harmony",
        },
        {
          title: "Import data",
          url: "system-control/import",
        },
      ],
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: siteSettings, isLoading } = useSiteSettings();
  const { data: layoutTheme } = useSavedPageTheme("layout");
  const { data: logoImage } = useQuery({
    queryKey: ["themeSettings", "logoImage"],
    queryFn: async () => {
      const res = await fetch(backendApi("theme-settings"), {
        headers: { Accept: "application/json" },
        credentials: "include",
      });
      if (!res.ok) return "";
      const data = (await res.json()) as { logoImage?: string };
      return data.logoImage?.trim() || "";
    },
    staleTime: 60 * 1000,
  });
  const layoutLogo = typeof layoutTheme?.logoImage === "string" ? layoutTheme.logoImage.trim() : "";
  const logoSrc = layoutLogo || logoImage || LAYOUT_THEME_DEFAULTS.logoImage;
  const [logoFailed, setLogoFailed] = React.useState(false);
  React.useEffect(() => {
    setLogoFailed(false);
  }, [logoSrc]);
  const addonNavItems = useAddonAdminNavItems();
  return (
    <AdminSidebarPrefsProvider sections={[{ label: "Platform", items: data.navMain }, { label: "Addons", items: addonNavItems }]}>
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/admin">
                {logoFailed ? (
                  <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <Package2 className="size-4" />
                  </div>
                ) : (
                  <img
                    src={logoSrc}
                    alt=""
                    width={32}
                    height={32}
                    className="shrink-0 rounded-lg object-contain"
                    style={{ width: 32, height: 32, maxWidth: 32, maxHeight: 32 }}
                    onError={() => setLogoFailed(true)}
                  />
                )}
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{isLoading ? "Loading..." : siteSettings?.name}</span>
                  <span className="truncate text-xs text-muted-foreground">magicthemes.co</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} addonItems={addonNavItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
    </AdminSidebarPrefsProvider>
  )
}
