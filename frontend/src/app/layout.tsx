import type { Viewport } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import Script from "next/script";
import "./globals.css";
import { Providers } from "@/components/providers/providers";
import { firstShareImage, requestOrigin } from "@/lib/metadata";
import { getPublicChrome } from "@/lib/public-chrome";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import { ConditionalAnalytics } from "@/components/conditional-analytics";
import { UserActivityTracker } from "@/components/user-activity-tracker";
import { ClientThemeInjector } from "@/components/theme/client-theme-injector";
import { PageElementApplier } from "@/components/theme/page-element-applier";
import { NuqsAdapter } from "nuqs/adapters/next/app";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

function faviconFromPayload(data: {
  themeSettings?: { faviconImage?: string };
  layoutChrome?: { faviconImage?: string };
}): string {
  const fromTheme = data.themeSettings?.faviconImage?.trim();
  const fromChrome = data.layoutChrome?.faviconImage?.trim();
  return fromTheme || fromChrome || "/favicon.ico";
}

export async function generateMetadata() {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  if (pathname.startsWith("/auth")) {
    return {
      title: "Magic Rust Template",
      description: "A powerful Rust server website template",
    };
  }

  let siteMetadata: Record<string, unknown> | null = null;
  const data = await getPublicChrome();
  siteMetadata = data.siteMetadata ?? null;
  const themeLogo = data.themeSettings?.logoImage;
  const layoutLogo = data.layoutChrome?.logoImage;
  siteMetadata = {
    ...(siteMetadata ?? {}),
    logoImage: layoutLogo?.trim() || themeLogo?.trim() || "",
    faviconImage: faviconFromPayload(data),
  };

  const origin = await requestOrigin();
  const logoImage = (siteMetadata?.logoImage as string | undefined) || null;
  const shareImage = firstShareImage(
    [siteMetadata?.ogImageUrl as string | undefined, siteMetadata?.siteImageUrl as string | undefined],
    logoImage,
    origin,
  );
  const twitterImage = firstShareImage(
    [siteMetadata?.twitterImageUrl as string | undefined, shareImage],
    logoImage,
    origin,
  );

  const faviconImage = (siteMetadata?.faviconImage as string | undefined) || "/favicon.ico";

  return {
    title: siteMetadata?.siteTitle || 'Magic Rust Template',
    icons: { icon: faviconImage },

    description: siteMetadata?.siteDescription || 'A powerful Rust server website template',

    keywords: (typeof siteMetadata?.keywords === 'string' ? siteMetadata.keywords.split(',') : null) || ['rust', 'gaming', 'server'],

    openGraph: {
      title: siteMetadata?.ogTitle || siteMetadata?.siteTitle || 'Magic Rust Template',

      description: siteMetadata?.ogDescription || siteMetadata?.siteDescription || 'A powerful Rust server website template',

      url: siteMetadata?.siteUrl,

      siteName: siteMetadata?.siteName,

      images: shareImage ? [
        {
          url: shareImage,

          width: 1200,

          height: 630,

          alt: siteMetadata?.ogImageAlt || 'Site logo',
        },
      ] : [],

      type: 'website',
    },

    twitter: {
      card: 'summary_large_image',

      title: siteMetadata?.twitterTitle || siteMetadata?.siteTitle || 'Magic Rust Template',

      description: siteMetadata?.twitterDescription || siteMetadata?.siteDescription || 'A powerful Rust server website template',

      images: twitterImage ? [twitterImage] : [],
    },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const chrome = await getPublicChrome();
  const themeVersion = encodeURIComponent(chrome.styleRevision?.theme || "0");
  const elementVersion = encodeURIComponent(chrome.styleRevision?.elements || "0");

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href={`/api/admin/theme/styles?v=${themeVersion}`} />
        <link rel="stylesheet" href={`/api/admin/page-elements/styles?v=${elementVersion}`} />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <ClientThemeInjector />
        <NuqsAdapter>
          <Providers>
            <PageElementApplier />
            {children ?? null}
            <CookieConsentBanner />
            <UserActivityTracker />
            {/* https://images.squarespace-cdn.com/content/v1/627cb6fa4355783e5e375440/f1083091-79f6-4750-b867-e1bc587dfca0/rust_12_minicopter.jpg */}
          </Providers>
        </NuqsAdapter>
        <ConditionalAnalytics />
        {process.env.NEXT_PUBLIC_FIGMA_CAPTURE === "1" ? (
          <Script
            src="https://mcp.figma.com/mcp/html-to-design/capture.js"
            strategy="beforeInteractive"
          />
        ) : null}
      </body>
    </html>
  );
}
