'use server';

import { cookies } from 'next/headers';

const AUTH_COOKIE_NAME = 'auth_token';
const BACKEND_URL = (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

async function getAuthToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(AUTH_COOKIE_NAME)?.value ?? null;
}

async function fetchBackend(
  path: string,
  options: {
    method?: string;
    body?: string;
    headers?: Record<string, string>;
    token?: string | null;
  } = {}
): Promise<{ data?: unknown; error?: string; status?: number }> {
  const passedToken = options.token !== undefined ? options.token : undefined;
  const token = (passedToken && String(passedToken).trim()) ? String(passedToken).trim() : await getAuthToken();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...options.headers,
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(`${BACKEND_URL}/api/${path}`, {
      method: options.method || 'GET',
      headers: options.body ? { ...headers, 'Content-Type': 'application/json' } : headers,
      body: options.body,
      cache: 'no-store',
    });

    const text = await res.text();
    const data = text ? (JSON.parse(text) as unknown) : undefined;

    if (!res.ok) {
      const message = (data && typeof data === 'object' && 'message' in data)
        ? String((data as { message: unknown }).message)
        : res.statusText;
      return { error: message, status: res.status, data };
    }

    return { data, status: res.status };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Request failed';
    return { error: message, status: 500 };
  }
}

export async function listApiKeys(clientToken?: string | null): Promise<{ data?: unknown[]; error?: string; status?: number }> {
  const result = await fetchBackend('admin/settings/api-keys', { token: clientToken });
  if (result.error) return { error: result.error, status: result.status };
  return { data: Array.isArray(result.data) ? result.data : [], status: result.status };
}

export async function createApiKey(
  payload: { name: string; description?: string; permissions: unknown },
  clientToken?: string | null
): Promise<{ data?: unknown; error?: string; status?: number }> {
  return fetchBackend('admin/settings/api-keys', {
    method: 'POST',
    body: JSON.stringify(payload),
    token: clientToken,
  });
}

export async function updateApiKey(
  id: string,
  payload: { name?: string; description?: string; permissions?: unknown; enabled?: boolean },
  clientToken?: string | null
): Promise<{ data?: unknown; error?: string; status?: number }> {
  return fetchBackend(`admin/settings/api-keys/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
    token: clientToken,
  });
}

export async function deleteApiKey(id: string, clientToken?: string | null): Promise<{ error?: string; status?: number }> {
  const result = await fetchBackend(`admin/settings/api-keys/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    token: clientToken,
  });
  if (result.error) return { error: result.error, status: result.status };
  return { status: result.status };
}
