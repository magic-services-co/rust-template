'use client';

import { useQuery } from '@tanstack/react-query';
import { backendApi } from '@/lib/api';
import { getAuthToken } from '@/lib/laravel-auth';
import {
  getFakeLeaderboardKillHeatmapPoints,
  getFakeLeaderboardStats,
  isLeaderboardFakeDataEnabled,
} from '@/lib/leaderboard-fake-data';
import type { KillHeatmapPoint } from '@/lib/leaderboard-kill-heatmap';

export type StatsQueryParams = {
  tab: string;
  filter?: string;
  page: number;
  sortField?: string;
  pageSize: number;
  server: string;
  wipeId?: number;
  lifetime?: boolean;
  sortOrder?: 'ASC' | 'DESC';
};

export type StatsQueryResult = {
  data: Record<string, unknown>[];
  totalPages: number;
};

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function fetchStats(params: StatsQueryParams): Promise<StatsQueryResult> {
  if (isLeaderboardFakeDataEnabled()) {
    return getFakeLeaderboardStats(params);
  }

  const search = new URLSearchParams();
  search.set('tab', params.tab);
  search.set('page', String(params.page));
  search.set('pageSize', String(params.pageSize));
  search.set('server', params.server);
  if (params.filter) search.set('filter', params.filter);
  if (params.sortField) search.set('sortField', params.sortField);
  if (params.sortOrder) search.set('sortOrder', params.sortOrder);
  if (params.wipeId != null) search.set('wipeId', String(params.wipeId));
  if (params.lifetime != null) search.set('lifetime', params.lifetime ? '1' : '0');

  const res = await fetch(backendApi(`leaderboard/stats?${search.toString()}`), {
    headers: authHeaders(),
    credentials: 'include',
  });
  if (!res.ok) return { data: [], totalPages: 1 };
  const json = await res.json();
  return {
    data: Array.isArray(json?.data) ? json.data : [],
    totalPages: typeof json?.totalPages === 'number' ? json.totalPages : 1,
  };
}

export function useStatsQuery(params: StatsQueryParams) {
  const query = useQuery({
    queryKey: ['leaderboard', 'stats', params],
    queryFn: () => fetchStats(params),
    enabled: params.tab !== '',
    staleTime: 30 * 1000,
  });
  return {
    data: query.data,
    error: query.error,
    isLoading: query.isLoading,
  };
}

export type KillHeatmapQueryParams = {
  server: string | null | undefined;
  wipeId?: number;
  lifetime?: boolean;
  enabled?: boolean;
};

async function fetchKillHeatmap(params: KillHeatmapQueryParams): Promise<KillHeatmapPoint[]> {
  if (!params.server || params.server.toLowerCase() === 'global') {
    return [];
  }
  if (isLeaderboardFakeDataEnabled()) {
    return getFakeLeaderboardKillHeatmapPoints({
      server: params.server,
      wipeId: params.wipeId,
      lifetime: params.lifetime,
    });
  }

  const search = new URLSearchParams();
  search.set('server', params.server);
  if (params.wipeId != null) search.set('wipeId', String(params.wipeId));
  if (params.lifetime != null) search.set('lifetime', params.lifetime ? '1' : '0');

  const res = await fetch(backendApi(`leaderboard/kill-heatmap?${search.toString()}`), {
    headers: authHeaders(),
    credentials: 'include',
  });
  if (!res.ok) return [];
  const json = await res.json();
  const raw = json?.points;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (p: unknown) =>
        p &&
        typeof p === 'object' &&
        typeof (p as { x?: unknown }).x === 'number' &&
        typeof (p as { y?: unknown }).y === 'number',
    )
    .map((p: { x: number; y: number; type?: string; weaponUsed?: string | null }) => ({
      x: p.x,
      y: p.y,
      type: typeof p.type === 'string' ? p.type : 'Player',
      weaponUsed: p.weaponUsed == null || typeof p.weaponUsed === 'string' ? p.weaponUsed ?? null : null,
    }));
}

export function useLeaderboardKillHeatmapQuery(params: KillHeatmapQueryParams) {
  const enabled = (params.enabled !== false && !!params.server && params.server.toLowerCase() !== 'global') as boolean;
  const query = useQuery({
    queryKey: ['leaderboard', 'kill-heatmap', params.server, params.wipeId, params.lifetime],
    queryFn: () => fetchKillHeatmap(params),
    staleTime: 60 * 1000,
    enabled,
  });
  return {
    points: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
  };
}
