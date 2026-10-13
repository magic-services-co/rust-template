import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL =
  process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000';

const AUTH_COOKIE_NAME = 'auth_token';

const FORWARD_HEADERS = [
    'authorization',
    'cookie',
    'content-type',
    'accept',
    'accept-language',
    'referer',
    'origin',
    'x-requested-with',
    'x-xsrf-token',
    'x-csrf-token',
    'x-auth-token',
    'x-api-key',
    'x-paynow-customer-token',
];

function getAuthTokenFromRequest(request: NextRequest): string | null {
  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7).trim();
  const xAuth = request.headers.get('x-auth-token');
  if (xAuth) return xAuth.trim();
  const cookie = request.headers.get('cookie');
  if (!cookie) return null;
  const name = AUTH_COOKIE_NAME + '=';
  const i = cookie.toLowerCase().indexOf(name.toLowerCase());
  if (i === -1) return null;
  const start = i + name.length;
  let end: number;
  if (cookie[start] === '"') {
    end = cookie.indexOf('"', start + 1);
    if (end === -1) return null;
    const raw = cookie.slice(start + 1, end);
    try {
      return decodeURIComponent(raw.replace(/\\"/g, '"'));
    } catch {
      return raw;
    }
  }
  end = cookie.indexOf(';', start);
  const raw = (end === -1 ? cookie.slice(start) : cookie.slice(start, end)).trim();
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function buildBackendUrl(path: string[], search: string): string {
  const base = BACKEND_URL.replace(/\/$/, '');
  const pathStr = path.length ? path.join('/') : '';
  const query = search.startsWith('?') ? search : search ? `?${search}` : '';
  return `${base}/api/${pathStr}${query}`;
}

/** Laravel Sanctum expects the XSRF-TOKEN cookie value on X-XSRF-TOKEN for stateful POSTs. */
function attachXsrfHeader(request: NextRequest, headers: Headers): void {
  if (headers.has('x-xsrf-token') || headers.has('x-csrf-token')) return;
  const cookie = request.headers.get('cookie');
  if (!cookie) return;
  const match = cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/i);
  if (!match?.[1]) return;
  try {
    headers.set('X-XSRF-TOKEN', decodeURIComponent(match[1]));
  } catch {
    headers.set('X-XSRF-TOKEN', match[1]);
  }
}

function copyBackendResponseHeaders(res: Response): Headers {
  const resHeaders = new Headers();
  res.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (
      lower === 'content-encoding' ||
      lower === 'transfer-encoding' ||
      lower === 'connection' ||
      lower === 'content-length' ||
      lower === 'set-cookie'
    ) {
      return;
    }
    resHeaders.set(key, value);
  });
  const setCookies =
    typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  if (setCookies.length > 0) {
    for (const cookie of setCookies) {
      resHeaders.append('set-cookie', cookie);
    }
  } else {
    res.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') {
        resHeaders.append('set-cookie', value);
      }
    });
  }
  return resHeaders;
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, context);
}

export async function HEAD(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, context);
}

export async function OPTIONS(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, context);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, context);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, context);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, context);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, context);
}

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const { path } = await context.params;
  const pathSegments = Array.isArray(path) ? path : path ? [path] : [];
  const url = buildBackendUrl(pathSegments, request.nextUrl.search);

  const headers = new Headers();
  FORWARD_HEADERS.forEach((name) => {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  });
  const host = request.headers.get('host') || request.nextUrl.host;
  if (host) headers.set('X-Forwarded-Host', host);
  const proto = request.nextUrl.protocol.replace(':', '');
  if (proto) headers.set('X-Forwarded-Proto', proto);
  let token = getAuthTokenFromRequest(request);
  if (!token) {
    const cookieStore = await cookies();
    token = cookieStore.get(AUTH_COOKIE_NAME)?.value ?? null;
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
    headers.set('X-Auth-Token', token);
  }
  attachXsrfHeader(request, headers);

  let body: ArrayBuffer | undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    try {
      const buffer = await request.arrayBuffer();
      if (buffer.byteLength > 0) {
        body = buffer;
      }
    } catch {
      body = undefined;
    }
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: request.method,
      headers,
      body,
      redirect: 'manual',
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Could not reach Laravel API';
    return NextResponse.json(
      {
        message: `${message}. Check BACKEND_URL / NEXT_PUBLIC_BACKEND_URL and that PHP is running (${BACKEND_URL}).`,
      },
      { status: 502 }
    );
  }

  const resHeaders = copyBackendResponseHeaders(res);

  // Bytes, not text. Decoding as UTF-8 rewrites MagicCore.dll (and any other binary download).
  const resBody = await res.arrayBuffer();
  return new NextResponse(resBody, {
    status: res.status,
    statusText: res.statusText,
    headers: resHeaders,
  });
}
