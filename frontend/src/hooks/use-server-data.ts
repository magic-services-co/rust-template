'use client';

import { useQuery } from '@tanstack/react-query';
import { backendApi } from '@/lib/api';

/** From BattleMetrics `details.rust_maps` (RustMaps preview for procedural maps). */
export type RustMapsDetails = {
  thumbnailUrl?: string;
  url?: string;
};

export type ServerTag = {
  id: number;
  name: string;
  image?: string | null;
};

export interface ServerData {
  id: string;
  server_id?: string;
  name?: string;
  order: number;
  image_path?: string | null;
  server_address?: string | null;
  wipe_schedule?: string | null;
  tags?: ServerTag[];
  mapVotes?: { id: string };
  attributes: {
    name?: string;
    players: number;
    maxPlayers: number;
    rank?: number;
    status: string;
    ip?: string;
    port?: number;
    address?: string | null;
    rust_description?: string;
    details?: {
      rust_headerimage?: string;
      rust_last_wipe?: string;
      rust_next_wipe?: string;
      rust_maps?: RustMapsDetails;
    };
  };
}

export interface EnhancedServerData extends ServerData {
  categoryId: number;
  categoryName: string;
  categoryOrder: number;
}

type ServersDataItem = {
  id: string;
  server_id?: string;
  type?: string;
  name?: string;
  image_path?: string | null;
  server_address?: string | null;
  categoryId: number;
  categoryName: string;
  categoryOrder: number;
  order: number;
  mapVotes?: { id: string };
  wipe_schedule?: string | null;
  tags?: unknown;
  attributes: Record<string, unknown> & {
    name?: string;
    players?: number;
    maxPlayers?: number;
    rank?: number;
    status?: string;
    ip?: string;
    port?: number;
    address?: string | null;
    details?: Record<string, unknown> & {
      rust_headerimage?: string;
      rust_last_wipe?: string;
      rust_next_wipe?: string;
      rust_maps?: unknown;
    };
  };
};

function normalizeTags(raw: unknown): ServerTag[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const tag = item as Record<string, unknown>;
    const id = toNumber(tag.id);
    const name = typeof tag.name === 'string' ? tag.name.trim() : '';
    if (id == null || name === '') return [];
    return [{
      id,
      name,
      image: typeof tag.image === 'string' && tag.image.trim() !== '' ? tag.image : null,
    }];
  });
}

function toNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string') {
    const n = parseInt(v, 10);
    return Number.isNaN(n) ? undefined : n;
  }
  return undefined;
}

function normalizeRustMaps(raw: unknown): RustMapsDetails | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const thumbnailUrl = typeof o.thumbnailUrl === 'string' ? o.thumbnailUrl : undefined;
  const url = typeof o.url === 'string' ? o.url : undefined;
  if (!thumbnailUrl && !url) return undefined;
  return { thumbnailUrl, url };
}

function normalizeDetails(
  details: ServersDataItem['attributes']['details']
): ServerData['attributes']['details'] {
  if (!details || typeof details !== 'object') return {};
  return {
    rust_headerimage:
      typeof details.rust_headerimage === 'string' ? details.rust_headerimage : undefined,
    rust_last_wipe: typeof details.rust_last_wipe === 'string' ? details.rust_last_wipe : undefined,
    rust_next_wipe: typeof details.rust_next_wipe === 'string' ? details.rust_next_wipe : undefined,
    rust_maps: normalizeRustMaps(details.rust_maps),
  };
}

async function fetchServers(): Promise<EnhancedServerData[]> {
  const res = await fetch(backendApi('servers-data'), {
    headers: { Accept: 'application/json' },
    credentials: 'include',
  });
  if (!res.ok) return [];
  const json = await res.json();
  const list: ServersDataItem[] = Array.isArray(json?.data) ? json.data : [];
  return list.map((item) => {
    const attrs = item.attributes ?? {};
    const players = toNumber(attrs.players);
    const maxPlayers = toNumber(attrs.maxPlayers);
    const rank = toNumber(attrs.rank);
    const port = toNumber(attrs.port);
    return {
      id: item.id,
      server_id:
        typeof item.server_id === 'string'
          ? item.server_id
          : typeof item.id === 'string'
            ? item.id
            : undefined,
      name: item.name,
      order: item.order,
      image_path: item.image_path ?? null,
      server_address: item.server_address ?? null,
      mapVotes: item.mapVotes,
      wipe_schedule: typeof item.wipe_schedule === "string" ? item.wipe_schedule : null,
      tags: normalizeTags(item.tags),
      categoryId: item.categoryId,
      categoryName: item.categoryName,
      categoryOrder: item.categoryOrder,
      attributes: {
        name: (typeof attrs.name === 'string' ? attrs.name : undefined) ?? item.name,
        players: players ?? 0,
        maxPlayers: maxPlayers ?? 0,
        rank: rank ?? undefined,
        status: typeof attrs.status === 'string' ? attrs.status : 'unknown',
        ip: typeof attrs.ip === 'string' ? attrs.ip : undefined,
        port: port ?? undefined,
        address: attrs.address != null ? String(attrs.address) : undefined,
        rust_description:
          typeof attrs.rust_description === 'string' ? attrs.rust_description : undefined,
        details: normalizeDetails(attrs.details),
      },
    } satisfies EnhancedServerData;
  });
}

const serversQueryKey = ['servers'] as const;

export type ServerDataItem = {
  data: EnhancedServerData | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
};

export default function useServerData(): {
  serverList: ServerDataItem[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
} {
  const query = useQuery({
    queryKey: serversQueryKey,
    queryFn: fetchServers,
    staleTime: 60 * 1000,
  });

  const servers = query.data ?? [];
  const isLoading = query.isLoading;
  const isError = query.isError;
  const error = query.error as Error | null;

  const serverList = servers.map((server) => ({
    data: server,
    isLoading,
    isError,
    error,
  }));

  return { serverList, isLoading, isError, error };
}
