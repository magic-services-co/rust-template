import { getMetadata } from "@/lib/metadata";
import { backendApi } from "@/lib/api";
import { USER_THEME_DEFAULTS } from "@/lib/user-theme-defaults";
import { type Rule } from "@/components/home/rules";
import { type TeamMember } from "@/components/home/team";
import { HomePageClient } from "./home-page-client";

if (typeof HomePageClient === "undefined") {
  throw new Error(
    "[home page] HomePageClient is undefined. Check that ./home-page-client exports HomePageClient."
  );
}

interface PageSettings {
  features?: {
    showJoinCommunity?: boolean;
    showServerRules?: boolean;
    showServers?: boolean;
    showTeam?: boolean;
  };
  featureSettings?: {
    serverRules?: { rules?: Rule[] };
    team?: { members?: TeamMember[] };
  };
  home?: Record<string, unknown>;
}

interface UserWithRoles {
  id: string;
  roles?: Array<{ role?: { order?: number; name?: string; color?: string | null } }>;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v) && (v as object).constructor === Object;
}

export async function generateMetadata() {
  return await getMetadata("home");
}

export default async function Home() {
  try {
    const res = await fetch(backendApi("data?include=themeSettings,siteSettings,pageTheme:home"), {
      headers: { Accept: "application/json" },
      next: { revalidate: 60, tags: ["public-pages"] },
    });
    const data = res.ok ? await res.json() : {};
    const rawTheme = data.themeSettings;
    const theme = isPlainObject(rawTheme) ? rawTheme : USER_THEME_DEFAULTS;
    const siteSettings = data.siteSettings as { name?: string; discordInvite?: string | null } | undefined;
    const pageTheme = data.pageTheme;

    let settings: PageSettings | undefined;
    const rawSettings = pageTheme && typeof pageTheme === "object" && "settings" in pageTheme ? pageTheme.settings : null;
    if (rawSettings) {
      try {
        settings = typeof rawSettings === "string" ? JSON.parse(rawSettings) : (rawSettings as PageSettings);
      } catch {
        settings = undefined;
      }
    }
    if (!settings) {
      settings = {
        features: {
          showJoinCommunity: true,
          showServerRules: true,
          showServers: true,
        },
      };
    }

    let teamMembersWithRoles: TeamMember[] = settings?.featureSettings?.team?.members ?? [];
    const showTeam = settings?.features?.showTeam ?? false;
    if (showTeam && teamMembersWithRoles.length > 0) {
      const userIds = teamMembersWithRoles.map((m) => m.userId).filter(Boolean) as string[];
      if (userIds.length > 0) {
        const usersRes = await fetch(backendApi(`data?include=${encodeURIComponent("users:" + userIds.join(","))}`), {
          headers: { Accept: "application/json" },
          next: { revalidate: 60, tags: ["public-pages"] },
        });
        const usersData = usersRes.ok ? await usersRes.json() : {};
        const usersWithRoles: UserWithRoles[] = Array.isArray(usersData.users) ? usersData.users : [];
        usersWithRoles.forEach((user) => {
          if (user.roles && user.roles.length > 0) {
            user.roles.sort((a, b) => {
              const orderA = a.role?.order ?? Infinity;
              const orderB = b.role?.order ?? Infinity;
              if (orderA !== orderB) return orderA - orderB;
              return (a.role?.name || "").localeCompare(b.role?.name || "");
            });
          }
        });

        const userRolesMap = new Map<string, { name: string; color?: string | null }>();
        usersWithRoles.forEach((user) => {
          if (user.roles && user.roles.length > 0) {
            const highestRole = user.roles[0].role;
            if (highestRole) {
              userRolesMap.set(user.id, { name: highestRole.name ?? "", color: highestRole.color ?? undefined });
            }
          }
        });

        teamMembersWithRoles = teamMembersWithRoles.map((member) => {
          const userRole = userRolesMap.get(member.userId as string);
          return {
            ...member,
            role: member.role || userRole?.name || undefined,
            roleColor:
              member.roleColor ||
              (userRole?.color && /^#[0-9A-F]{6}$/i.test(userRole.color) ? userRole.color : undefined) ||
              undefined,
          };
        });
      }
    }

    return (
      <HomePageClient
        theme={theme}
        siteSettings={siteSettings}
        settings={settings}
        teamMembersWithRoles={teamMembersWithRoles}
      />
    );
  } catch (error) {
    console.error("Error rendering home page:", error);
    const theme = USER_THEME_DEFAULTS;
    const settings: PageSettings = {
      features: { showJoinCommunity: true, showServerRules: true, showServers: true },
    };
    return (
      <HomePageClient
        theme={theme}
        siteSettings={{ name: "Magic Rust Template" }}
        settings={settings}
        teamMembersWithRoles={[]}
      />
    );
  }
}
