import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CustomPageView } from "@/components/cms/custom-page-view";
import { backendApi } from "@/lib/api";
import { getMetadata } from "@/lib/metadata";
import { PublicFrontSwitch } from "@/lib/public-front";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const include = `redirect:/${slug},serverPage::${slug}`;
    const res = await fetch(backendApi(`data?include=${encodeURIComponent(include)}`), { headers: { Accept: "application/json" }, next: { revalidate: 60, tags: ["public-pages"] } });
    const data = res.ok ? await res.json() : {};
    const redirectRecord = data.redirect?.destination ? { destination: data.redirect.destination, permanent: data.redirect.permanent } : null;
    if (redirectRecord) return { title: "Redirecting..." };
    const page = data.serverPage;
    if (!page || !page.enabled) return { title: "Page Not Found" };
    return getMetadata(slug, { title: typeof page.title === "string" ? page.title : undefined });
}

export default async function GeneralPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const include = `redirect:/${slug},serverPage::${slug}`;
    const res = await fetch(backendApi(`data?include=${encodeURIComponent(include)}`), { headers: { Accept: "application/json" }, next: { revalidate: 60, tags: ["public-pages"] } });
    const data = res.ok ? await res.json() : {};
    const redirectRecord = data.redirect?.destination ? { destination: data.redirect.destination, permanent: data.redirect.permanent } : null;
    if (redirectRecord) redirect(redirectRecord.destination);
    const page = data.serverPage;
    if (!page || !page.enabled) notFound();

    return (
        <PublicFrontSwitch name="customPage" slotProps={{ title: page.title, subtitle: page.description || undefined, content: page.content }}>
            <CustomPageView title={page.title} kicker="PAGE" subtitle={page.description || undefined} content={page.content} />
        </PublicFrontSwitch>
    );
}
