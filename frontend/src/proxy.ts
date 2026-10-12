import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_COOKIE_NAME = 'auth_token';

/**
 * Do not run proxy on `/api/*`: App Router handlers (e.g. `app/api/[...path]/route.ts`)
 * must handle those. Running `NextResponse.next({ request: new Request(...) })` for API
 * routes can yield 501 on Next.js 16+.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/proxy#matcher
 */
export const config = {
  matcher: [
    '/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

function getAuthTokenFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const name = AUTH_COOKIE_NAME + '=';
  const i = cookieHeader.toLowerCase().indexOf(name.toLowerCase());
  if (i === -1) return null;
  const start = i + name.length;
  let end: number;
  if (cookieHeader[start] === '"') {
    end = cookieHeader.indexOf('"', start + 1);
    if (end === -1) return null;
    try {
      return decodeURIComponent(cookieHeader.slice(start + 1, end).replace(/\\"/g, '"'));
    } catch {
      return cookieHeader.slice(start + 1, end);
    }
  }
  end = cookieHeader.indexOf(';', start);
  const raw = (end === -1 ? cookieHeader.slice(start) : cookieHeader.slice(start, end)).trim();
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

const SKIP_REDIRECT_PREFIXES = ["/admin", "/storage", "/images", "/setup"];

function backendOrigin(): string {
  const raw = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";
  return raw.replace(/\/$/, "");
}

async function redirectResponse(request: NextRequest, pathname: string): Promise<NextResponse | null> {
  if (SKIP_REDIRECT_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return null;
  }
  if (pathname.includes(".")) return null;

  try {
    const lookup = await fetch(
      `${backendOrigin()}/api/redirect?source=${encodeURIComponent(pathname)}`,
      {
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(1500),
      },
    );
    if (!lookup.ok) return null;
    const data = (await lookup.json()) as { destination?: string; permanent?: boolean };
    const destination = typeof data.destination === "string" ? data.destination.trim() : "";
    if (!destination || destination === pathname) return null;
    const target = destination.startsWith("http://") || destination.startsWith("https://")
      ? destination
      : new URL(destination.startsWith("/") ? destination : `/${destination}`, request.url);
    return NextResponse.redirect(target, data.permanent ? 308 : 307);
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const pathname = request.nextUrl.pathname;
  requestHeaders.set("x-pathname", pathname);

  const redirected = await redirectResponse(request, pathname);
  if (redirected) return redirected;

  if (pathname.startsWith('/api/')) {
    const token =
      requestHeaders.get('authorization')?.replace(/^Bearer\s+/i, '').trim() ||
      requestHeaders.get('x-auth-token') ||
      getAuthTokenFromCookie(requestHeaders.get('cookie'));
    if (token) {
      requestHeaders.set('Authorization', `Bearer ${token}`);
      requestHeaders.set('X-Auth-Token', token);
    }
  }

  return NextResponse.next({ request: new Request(request, { headers: requestHeaders }) });
}
