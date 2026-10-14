import { getMetadata } from "@/lib/metadata";
import { getServerSession } from "@/lib/get-server-session";
import AccountLinkStepper from "./link";
import { cookies } from "next/headers";
import { SupportPageShell } from "@/components/support/support-page-shell";
import { LinkTitles } from "@/components/link-titles";
import { backendApi } from "@/lib/api";

export async function generateMetadata() {
  return await getMetadata("link");
}

async function loadLinkedKits() {
    try {
        const response = await fetch(backendApi("link/kit"), {
            cache: "no-store",
            headers: { Accept: "application/json" },
        });
        if (!response.ok) return [];
        const data = (await response.json()) as { kits?: { id?: number; label?: string; kitName?: string; items?: { shortname: string; amount: number }[] }[] };
        return Array.isArray(data.kits) ? data.kits : [];
    } catch {
        return [];
    }
}

export default async function LinkPage() {
    const session = await getServerSession();
    const cookieStore = await cookies();
    const linkStatus = cookieStore.get("discord_link_status")?.value as ("success" | "error") | undefined;
    const initialKits = await loadLinkedKits();

    return (
        <SupportPageShell>
            <LinkTitles />
            <div className="pt-10">
                <AccountLinkStepper user={session?.user} linkStatus={linkStatus ?? null} initialKits={initialKits} />
            </div>
        </SupportPageShell>
    );
}
