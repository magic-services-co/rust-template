import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { backendApi } from '@/lib/api';

const DEFAULT_TITLE = 'Magic Rust Template';
const DEFAULT_DESCRIPTION = 'A powerful Rust server website template';

const PLACEHOLDER_TITLES = new Set([
  'welcome to our site',
  'home page - welcome to our site',
  'your site title',
  'your site name',
  "your site's description here.",
  'the home page of our site, featuring an overview of our offerings.',
  'explore our site and learn more about what we offer.',
]);

export function seoText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed || /yourwebsite\.com/i.test(trimmed)) return undefined;
  if (PLACEHOLDER_TITLES.has(trimmed.toLowerCase())) return undefined;
  return trimmed;
}

export function seoImage(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed || /yourwebsite\.com/i.test(trimmed)) return undefined;
  if (!trimmed.includes('/') && /\.(jpg|jpeg|png|webp)$/i.test(trimmed)) return undefined;
  return trimmed;
}

function slugToTitle(slug: string): string {
  const parts = slug.split('/').filter(Boolean);
  const last = parts[parts.length - 1] ?? slug;
  return last
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export async function requestOrigin(): Promise<string> {
  try {
    const headerList = await headers();
    const host = (headerList.get('x-forwarded-host') || headerList.get('host') || '').split(',')[0]?.trim();
    if (host) {
      const proto = (headerList.get('x-forwarded-proto') || 'http').split(',')[0]?.trim() || 'http';
      return `${proto}://${host}`;
    }
  } catch {
    // metadata can run without a request
  }
  const raw = process.env.NEXT_PUBLIC_DOMAIN || process.env.FRONTEND_URL || '';
  if (!raw) return '';
  const withProtocol = raw.includes('://') ? raw : `https://${raw}`;
  return withProtocol.replace(/\/$/, '');
}

export function absoluteUrl(url: string | null | undefined, origin: string): string | undefined {
  const trimmed = url?.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (!origin) return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${origin}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}

export function firstShareImage(
  candidates: Array<string | null | undefined>,
  logo: string | null | undefined,
  origin: string,
): string | undefined {
  for (const candidate of [...candidates, logo, '/images/logo.png']) {
    const absolute = absoluteUrl(candidate, origin);
    if (absolute) return absolute;
  }
  return undefined;
}

type PageMeta = {
  title?: string;
  description?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImageUrl?: string;
  ogImageAlt?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImageUrl?: string;
};

export async function getMetadata(pageSlug: string, defaults?: { title?: string }): Promise<Metadata> {
  const slugForTheme = pageSlug.split('/')[0] ?? pageSlug;
  let siteTitle = DEFAULT_TITLE;
  let siteDescription = DEFAULT_DESCRIPTION;
  let siteImageUrl: string | undefined;
  let siteOgImageUrl: string | undefined;
  let logoImage: string | undefined;
  let themeTitle: string | undefined;
  let pageDescription: string | undefined;
  let pageMeta: PageMeta | undefined;

  try {
    const include = `siteMetadata,pageTheme:${slugForTheme},pageMetadata:${pageSlug},themeSettings,layoutChrome`;
    const res = await fetch(backendApi(`data?include=${encodeURIComponent(include)}`), {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    const data = res.ok ? await res.json() : {};
    const site = data.siteMetadata as {
      siteTitle?: string;
      siteDescription?: string;
      siteImageUrl?: string;
      siteImageAlt?: string;
      ogTitle?: string;
      ogDescription?: string;
      ogImageUrl?: string;
      twitterTitle?: string;
      twitterDescription?: string;
      twitterImageUrl?: string;
    } | undefined;
    const page = data.pageTheme as { settings?: { title?: string } } | undefined;
    const pageMetadata = data.pageMetadata as PageMeta | undefined;
    const themeLogo = (data.themeSettings as { logoImage?: string } | undefined)?.logoImage;
    const layoutLogo = (data.layoutChrome as { logoImage?: string } | undefined)?.logoImage;

    const usableSiteTitle = seoText(site?.siteTitle);
    const usableSiteDescription = seoText(site?.siteDescription) || seoText(site?.ogDescription);
    if (usableSiteTitle) siteTitle = usableSiteTitle;
    if (usableSiteDescription) siteDescription = usableSiteDescription;
    siteImageUrl = seoImage(site?.siteImageUrl);
    siteOgImageUrl = seoImage(site?.ogImageUrl);
    logoImage = layoutLogo?.trim() || themeLogo?.trim() || undefined;
    if (page?.settings && typeof page.settings === 'object' && 'title' in page.settings) {
      themeTitle = (page.settings as { title?: string }).title;
    }
    pageDescription = seoText(pageMetadata?.description) || seoText(pageMetadata?.ogDescription);
    if (pageMetadata && Object.keys(pageMetadata).length > 0) pageMeta = pageMetadata;
  } catch {
    // use defaults
  }

  const title = seoText(pageMeta?.title) || defaults?.title || themeTitle || siteTitle || slugToTitle(pageSlug);
  const fullTitle = title === siteTitle ? siteTitle : `${title} | ${siteTitle}`;
  const description = pageDescription || siteDescription;
  const origin = await requestOrigin();

  const metadata: Metadata = {
    title: fullTitle,
    description,
  };

  const ogTitle = seoText(pageMeta?.ogTitle) || title;
  const ogDescription = seoText(pageMeta?.ogDescription) || description;
  const ogImage = firstShareImage([seoImage(pageMeta?.ogImageUrl), siteOgImageUrl, siteImageUrl], logoImage, origin);
  const twitterTitle = seoText(pageMeta?.twitterTitle) || ogTitle;
  const twitterDescription = seoText(pageMeta?.twitterDescription) || ogDescription;
  const twitterImage = firstShareImage([seoImage(pageMeta?.twitterImageUrl), ogImage], logoImage, origin);

  if (ogTitle || ogDescription || ogImage) {
    metadata.openGraph = {
      title: ogTitle ?? fullTitle,
      description: ogDescription,
      ...(ogImage && { images: [{ url: ogImage, alt: pageMeta?.ogImageAlt ?? '' }] }),
    };
  }
  if (twitterTitle || twitterDescription || twitterImage) {
    metadata.twitter = {
      title: twitterTitle ?? fullTitle,
      description: twitterDescription,
      ...(twitterImage && { images: [twitterImage] }),
    };
  }
  if (pageMeta?.keywords) {
    metadata.keywords = pageMeta.keywords;
  }

  const canonical = await canonicalUrlForSlug(pageSlug, origin);
  if (canonical) {
    metadata.alternates = { canonical };
    if (metadata.openGraph) {
      metadata.openGraph.url = canonical;
    }
  }

  return metadata;
}

const PRIVATE_PREFIXES = ['/admin', '/api', '/setup', '/auth', '/ticket'];
const PRIVATE_PATHS = new Set(['/profile', '/store/complete', '/403', '/404']);

export function publicPathname(pathname: string): string | null {
  const bare = pathname.split('?')[0]?.split('#')[0]?.trim() ?? '';
  if (!bare.startsWith('/')) return null;
  const path = bare !== '/' ? bare.replace(/\/+$/, '') : '/';
  if (!path || path.includes('..')) return null;
  if (PRIVATE_PATHS.has(path)) return null;
  if (PRIVATE_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) return null;
  return path;
}

export async function requestPublicPath(): Promise<string | null> {
  try {
    const headerList = await headers();
    return publicPathname(headerList.get('x-pathname') ?? '');
  } catch {
    return null;
  }
}

function pathFromMetadataSlug(pageSlug: string): string | null {
  if (pageSlug === 'home') return '/';
  if (['profile', 'ticket', '403', '404'].includes(pageSlug) || pageSlug.startsWith('ticket/')) return null;
  const path = publicPathname(`/${pageSlug.replace(/^\/+/, '')}`);
  return path;
}

async function canonicalUrlForSlug(pageSlug: string, origin: string): Promise<string | undefined> {
  const path = (await requestPublicPath()) ?? pathFromMetadataSlug(pageSlug);
  if (!path) return undefined;
  return origin ? `${origin}${path}` : path;
}

export function metadataSlugForPath(pathname: string): string {
  if (pathname === '/') return 'home';
  if (pathname === '/maps' || pathname.startsWith('/maps/')) return 'maps';
  if (pathname === '/store' || pathname.startsWith('/store/')) return 'store';
  return pathname.replace(/^\//, '');
}
