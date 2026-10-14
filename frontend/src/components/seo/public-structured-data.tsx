import { headers } from "next/headers";
import { backendApi } from "@/lib/api";
import { absoluteUrl, getMetadata, metadataSlugForPath, publicPathname, requestOrigin } from "@/lib/metadata";
import { jsonLdHtml, serversItemList, type JsonLd } from "@/lib/structured-data";

export async function PublicStructuredData() {
  const headerList = await headers();
  const path = publicPathname(headerList.get("x-pathname") ?? "");
  if (!path) return null;

  const origin = await requestOrigin();
  const pageUrl = origin ? `${origin}${path}` : path;
  const metadata = await getMetadata(metadataSlugForPath(path));
  const title = typeof metadata.title === "string" ? metadata.title : undefined;
  const description = typeof metadata.description === "string" ? metadata.description : undefined;

  let siteName = title;
  let logo: string | undefined;
  try {
    const res = await fetch(backendApi("data?include=siteMetadata,themeSettings,layoutChrome"), {
      headers: { Accept: "application/json" },
      next: { revalidate: 60, tags: ["public-pages"] },
    });
    const data = res.ok ? await res.json() : {};
    const siteTitle = data?.siteMetadata?.siteTitle;
    if (typeof siteTitle === "string" && siteTitle.trim()) siteName = siteTitle.trim();
    const layoutLogo = data?.layoutChrome?.logoImage as string | undefined;
    const themeLogo = data?.themeSettings?.logoImage as string | undefined;
    logo = absoluteUrl(layoutLogo?.trim() || themeLogo?.trim() || "/images/logo.png", origin);
  } catch {
    logo = absoluteUrl("/images/logo.png", origin);
  }

  const websiteId = origin ? `${origin}/#website` : undefined;
  const graph: JsonLd[] = [];

  if (path === "/" && siteName) {
    graph.push({
      "@type": "Organization",
      "@id": origin ? `${origin}/#organization` : undefined,
      name: siteName,
      url: pageUrl,
      ...(logo ? { logo } : {}),
    });
    graph.push({
      "@type": "WebSite",
      "@id": websiteId,
      name: siteName,
      url: pageUrl,
      ...(description ? { description } : {}),
      ...(origin ? { publisher: { "@id": `${origin}/#organization` } } : {}),
    });
  }

  graph.push({
    "@type": "WebPage",
    "@id": `${pageUrl}#webpage`,
    url: pageUrl,
    ...(title ? { name: title } : {}),
    ...(description ? { description } : {}),
    ...(websiteId ? { isPartOf: { "@id": websiteId } } : {}),
  });

  if (path === "/servers") {
    const servers = await serversItemList(pageUrl);
    if (servers) graph.push(servers);
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: jsonLdHtml({ "@context": "https://schema.org", "@graph": graph }),
      }}
    />
  );
}
