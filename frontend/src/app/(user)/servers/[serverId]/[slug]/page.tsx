import { Metadata } from "next";
import { backendApi } from "@/lib/api";
import { notFound } from "next/navigation";
import { CustomPageView } from "@/components/cms/custom-page-view";
import { getMetadata } from "@/lib/metadata";
import { PublicFrontSwitch } from "@/lib/public-front";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ serverId: string; slug: string }>;
}): Promise<Metadata> {
    const { serverId, slug } = await params;
    const include = `serverPage:${serverId}:${slug}`;
    const res = await fetch(backendApi(`data?include=${encodeURIComponent(include)}`), { headers: { Accept: "application/json" }, next: { revalidate: 60, tags: ["public-pages"] } });
    const data = res.ok ? await res.json() : {};
    const page = data.serverPage;
    if (!page || !page.enabled) return { title: "Page Not Found" };
    return getMetadata(`servers/${serverId}/${slug}`, { title: typeof page.title === "string" ? page.title : undefined });
}

export default async function ServerPage({
    params,
}: {
    params: Promise<{ serverId: string; slug: string }>;
}) {
    const { serverId, slug } = await params;
    const include = `serverPage:${serverId}:${slug}`;
    const res = await fetch(backendApi(`data?include=${encodeURIComponent(include)}`), { headers: { Accept: "application/json" }, next: { revalidate: 60, tags: ["public-pages"] } });
    const data = res.ok ? await res.json() : {};
    const page = data.serverPage;
    if (!page || !page.enabled) notFound();

    const serverName =
        page.server && typeof page.server === "object" && "server_name" in page.server
            ? String((page.server as { server_name?: string }).server_name || "")
            : "";

    const description = typeof page.description === "string" ? page.description.trim() : "";
    const subtitle = description || (serverName ? `Commands, rules, and notes for ${serverName}.` : undefined);
    return (
        <PublicFrontSwitch name="customPage" slotProps={{ title: page.title, subtitle, content: page.content }}>
            <CustomPageView
                title={page.title}
                kicker={serverName || "SERVER"}
                subtitle={subtitle}
                content={page.content}
            />
        </PublicFrontSwitch>
    );
}
