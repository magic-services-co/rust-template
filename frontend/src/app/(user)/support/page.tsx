import { PublicFrontSwitch } from "@/lib/public-front";
import TicketCategories from "@/components/support/ticket-categories";
import { getMetadata } from "@/lib/metadata";
import { getServerSession } from "@/lib/get-server-session";
import { backendApi } from "@/lib/api";
import { SupportThemeProvider } from "@/components/support-theme-provider";
import { SupportTitles } from "@/components/support-titles";
import { SupportPageShell } from "@/components/support/support-page-shell";
import { parsePageTheme } from "@/lib/parse-page-theme";
import { HomeCardCorners } from "@/components/home/home-card-corners";

export async function generateMetadata() {
  return await getMetadata("support");
}

function readTheme(pageTheme: unknown) {
  const rawSettings = pageTheme && typeof pageTheme === "object" && "settings" in pageTheme
    ? (pageTheme as { settings: unknown }).settings
    : null;
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
  return parsePageTheme(settings, "support");
}

export default async function SupportPage() {
  const session = await getServerSession();
  const isSignedIn = !!session;
  const res = await fetch(backendApi("data?include=themeSettings,pageTheme:support"), {
    headers: { Accept: "application/json" },
    next: { revalidate: 60, tags: ["public-pages"] },
  });
  const data = res.ok ? await res.json() : {};
  const theme = readTheme(data.pageTheme);

  const user = session?.user as { isBanned?: boolean; banReason?: string | null } | undefined;
  const isBanned = isSignedIn && user?.isBanned === true;
  const banReason = isSignedIn ? (user?.banReason ?? null) : null;

  return (
    <PublicFrontSwitch name="supportPage" slotProps={{ isSignedIn, isBanned, banReason }}>
      {isSignedIn && isBanned ? (
        <SupportThemeProvider serverTheme={theme}>
          <SupportPageShell theme={theme}>
            <SupportTitles serverTheme={theme} isSignedIn={isSignedIn} />
            <div
              className="relative mx-auto mt-10 max-w-[555px] overflow-visible border p-5 text-center"
              style={{
                backgroundColor: (theme.banMessageBackground as string) || "rgba(141, 37, 42, 0.16)",
                borderColor: (theme.banMessageBorder as string) || "#8d252a",
                color: (theme.banMessageTextColor as string) || "#eef4fb",
              }}
            >
              <p className="text-[18px] tracking-[-0.6px]">Account banned</p>
              <p className="pt-3 text-[13px] leading-6 text-[rgba(225,231,237,0.74)]">
                Your account has been banned from creating tickets.
                {banReason && (
                  <span className="mt-2 block font-medium">Reason: {banReason}</span>
                )}
              </p>
              <HomeCardCorners color="#ba9142" show />
            </div>
          </SupportPageShell>
        </SupportThemeProvider>
      ) : (
        <SupportThemeProvider serverTheme={theme}>
          <SupportPageShell theme={theme}>
            <SupportTitles serverTheme={theme} isSignedIn={isSignedIn} />
            <TicketCategories isSignedIn={isSignedIn} serverTheme={theme} />
          </SupportPageShell>
        </SupportThemeProvider>
      )}
    </PublicFrontSwitch>
  );
}
