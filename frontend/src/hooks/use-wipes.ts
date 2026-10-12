'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { backendApi } from '@/lib/api';

export type Wipe = {
  id: number;
  name?: string;
  is_active?: boolean;
  started_at?: string;
  [key: string]: unknown;
};

const EMPTY_WIPES: Wipe[] = [];

async function fetchWipes(serverId: string | undefined, _lifetime: boolean): Promise<Wipe[]> {
  if (!serverId) return [];
  const res = await fetch(backendApi(`wipes?server=${encodeURIComponent(serverId)}`), {
    headers: { Accept: 'application/json' },
    credentials: 'include',
  });
  if (!res.ok) return [];
  const json = await res.json();
  const data = json?.data ?? json;
  return Array.isArray(data) ? data : [];
}

export function useWipes(serverId: string | undefined, lifetime: boolean) {
  const query = useQuery({
    queryKey: ['wipes', serverId, lifetime],
    queryFn: () => fetchWipes(serverId, lifetime),
    enabled: !!serverId,
    staleTime: 60 * 1000,
  });
  const wipes = query.data ?? EMPTY_WIPES;
  const data = useMemo(() => ({ data: wipes }), [wipes]);
  return {
    data,
    isLoading: query.isLoading,
    error: query.error,
  };
}
