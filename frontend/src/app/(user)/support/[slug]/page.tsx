import { DynamicTicketForm } from "@/components/support/dynamic-ticket-form";
import { getMetadata } from "@/lib/metadata";
import { getServerSession } from "@/lib/get-server-session";
import { redirect } from "next/navigation";
import { backendApi } from "@/lib/api";
import { SupportThemeProvider } from "@/components/support-theme-provider";
import { SupportTitles } from "@/components/support-titles";
import { SupportPageShell } from "@/components/support/support-page-shell";
import { parsePageTheme } from "@/lib/parse-page-theme";
import { withSupportDefaults } from "@/lib/layout-theme-defaults";
import Link from "next/link";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return await getMetadata(`support/${slug}`);
}

export default async function SupportCategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await getServerSession();

  if (!session) {
    return redirect("/link");
  }

  const res = await fetch(backendApi("data?include=themeSettings,pageTheme:support"), {
    headers: { Accept: "application/json" },
    next: { revalidate: 60, tags: ["public-pages"] },
  });
  const data = res.ok ? await res.json() : {};
  const pageTheme = data.pageTheme;
  const rawSettings = pageTheme && "settings" in pageTheme ? pageTheme.settings : null;
  const settings =
    typeof rawSettings === "string"
      ? (() => {
          try {
            return JSON.parse(rawSettings);
          } catch {
            return {};
          }
        })()
      : rawSettings;
  const theme = parsePageTheme(settings, "support");
  const t = withSupportDefaults(theme);

  const categoryRes = await fetch(backendApi(`support/${slug}`), {
    headers: { Accept: "application/json" },
    next: { revalidate: 30, tags: ["public-pages"] },
  });
  const category = categoryRes.ok ? await categoryRes.json() : null;
  const categoryName = typeof category?.name === "string" ? category.name : slug.replace(/-/g, " ");
  const categorySubtitle =
    typeof category?.description === "string"
      ? category.description.split(/\n+/)[0]?.trim()
      : undefined;

  return (
    <SupportThemeProvider serverTheme={theme}>
      <SupportPageShell theme={theme}>
        <SupportTitles
          serverTheme={theme}
          isSignedIn
          kicker={`SUPPORT / ${categoryName.toUpperCase()}`}
          title={categoryName.toUpperCase()}
          subtitle={categorySubtitle}
        />
        <nav className="flex items-center justify-center gap-2 pb-2 pt-8 text-[11px] font-medium tracking-[1.4px]">
          <Link href="/support" style={{ color: t.breadcrumbTextColor }}>
            SUPPORT
          </Link>
          <span style={{ color: "rgba(186,145,66,0.45)" }}>/</span>
          <span style={{ color: t.breadcrumbActiveColor }}>{categoryName.toUpperCase()}</span>
        </nav>
        <DynamicTicketForm categorySlug={slug} serverTheme={theme} />
      </SupportPageShell>
    </SupportThemeProvider>
  );
}
