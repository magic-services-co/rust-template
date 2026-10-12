'use client';

import { useQuery } from '@tanstack/react-query';
import { backendApi } from '@/lib/api';

export type Server = {
  server_id: string;
  server_name: string;
  order?: number;
  image_path?: string | null;
  server_address?: string | null;
  pterodactyl_panel_id?: number | null;
  pterodactyl_server_identifier?: string | null;
  mod_runtime?: "oxide" | "carbon" | null;
};

export type ServerCategory = {
  id: number;
  name: string;
  order: number;
  servers: Server[];
};

const EMPTY_SERVERS: ServerCategory[] = [];

async function fetchServers(): Promise<ServerCategory[]> {
  const res = await fetch(backendApi('servers'), {
    headers: { Accept: 'application/json' },
    credentials: 'include',
  });
  if (!res.ok) return [];
  const json = await res.json();
  const data = json?.data;
  return Array.isArray(data) ? data : [];
}

export default function useServers() {
  const query = useQuery({
    queryKey: ['servers', 'categories'],
    queryFn: fetchServers,
    staleTime: 60 * 1000,
  });
  return {
    data: query.data ?? EMPTY_SERVERS,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
