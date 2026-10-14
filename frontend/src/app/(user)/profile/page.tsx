import { getServerSession } from "@/lib/get-server-session"
import { getMetadata } from "@/lib/metadata"
import { backendApi } from "@/lib/api"
import { ProfilePageClient } from "./profile-page-client"
import type { UserSession } from "@/types/next-auth"
import { redirect } from "next/navigation"

function isPlainObject(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null && !Array.isArray(v) && (v as object).constructor === Object
}

export async function generateMetadata() {
    return await getMetadata('profile');
}

export default async function Page() {
    const session = await getServerSession();
    if (!session?.user) {
        redirect("/link");
    }

    const res = await fetch(backendApi("data?include=pageTheme:profile"), { headers: { Accept: "application/json" }, next: { revalidate: 60, tags: ["public-pages"] } });
    const data = res.ok ? await res.json() : {};
    const pageTheme = data.pageTheme;

    const rawSettings = pageTheme && typeof pageTheme === "object" && "settings" in pageTheme ? pageTheme.settings : null;
    let settings: unknown = rawSettings;
    if (typeof settings === "string") {
        try {
            settings = JSON.parse(settings);
        } catch {
            settings = {};
        }
    }
    const rawTheme = settings && isPlainObject(settings) ? settings.profile : undefined;
    const theme = isPlainObject(rawTheme) ? rawTheme : undefined;

    const user = session.user as UserSession;

    return <ProfilePageClient user={user} theme={theme} />
}