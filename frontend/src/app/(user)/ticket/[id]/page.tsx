import { TicketPageClient } from "./ticket-page-client"
import { backendApi } from "@/lib/api"
import { getMetadata } from "@/lib/metadata"
import { getServerSession } from "@/lib/get-server-session"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import type { User } from "next-auth"
import { parsePageTheme } from "@/lib/parse-page-theme"

export async function generateMetadata() {
  return await getMetadata('ticket');
}

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession()
    if (!session?.user) {
        return redirect('/link')
    }
    const { id } = await params;
    const cookieStore = await cookies();
    const ticketRes = await fetch(backendApi(`tickets/check?id=${encodeURIComponent(id)}`), {
        headers: { Accept: "application/json", Cookie: cookieStore.toString() },
        cache: "no-store",
    });
    const allowed = ticketRes.ok && (await ticketRes.json())?.allowed === true;
    if (!allowed) {
        return redirect('/support')
    }

    const themeRes = await fetch(backendApi("data?include=themeSettings,pageTheme:support"), {
        headers: { Accept: "application/json" },
        next: { revalidate: 60, tags: ["public-pages"] },
    });
    const themeData = themeRes.ok ? await themeRes.json() : {};
    const pageTheme = themeData.pageTheme;
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

    return (
        <TicketPageClient
            ticketId={parseInt(id)}
            currentUser={session.user as unknown as User}
            theme={theme}
        />
    )
}
