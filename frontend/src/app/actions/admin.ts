'use client';

import { backendApi } from '@/lib/api';
import { getAuthToken } from '@/lib/laravel-auth';

export type CategoryWithServers = {
  id: number;
  name: string;
  order: number;
  servers: Array<{
    server_id: string;
    server_name: string;
    order?: number;
    image_path?: string | null;
    server_address?: string | null;
    enabled?: boolean;
    wipe_schedule?: string;
    current_map_thumbnail_url?: string | null;
    pterodactyl_panel_id?: number | null;
    pterodactyl_server_identifier?: string | null;
    mod_runtime?: "oxide" | "carbon" | "vanilla" | null;
    harmony_version?: string | null;
    harmony_seen_at?: string | null;
    harmony_status?: "connected" | "stale" | "offline";
    harmony_update_available?: boolean;
    harmony_latest?: string | null;
    magiccore_product?: "harmony" | "oxide" | null;
    tags?: Array<{ id: number; name: string; image?: string | null }>;
  }>;
};

export async function getCategories(): Promise<{
  error?: string;
  data?: CategoryWithServers[];
}> {
  try {
    const token = getAuthToken();
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(backendApi('admin/servers/catalog'), {
      credentials: 'include',
      headers,
    });
    if (!res.ok) {
      return { error: res.status === 401 ? 'Unauthorized' : 'Failed to fetch categories' };
    }
    const json = await res.json();
    const data = Array.isArray(json?.data) ? json.data : [];
    return { data };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : 'Failed to fetch categories',
    };
  }
}
