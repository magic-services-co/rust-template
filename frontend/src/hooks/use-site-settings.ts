'use client';

import { useQuery } from '@tanstack/react-query';
import { backendApi } from '@/lib/api';

export type SiteSettings = {
  name?: string;
  storeId?: string;
  ownerId?: string | null;
  discordInvite?: string | null;
  steamGroupId?: string | null;
  steamGroupUrl?: string | null;
  copyServerAddress?: boolean;
  serversUseTags?: boolean;
  serversAlign?: "ltr" | "center" | "rtl";
  showAdaptiveCurrencyOnStorefront?: boolean;
  mapGridRetentionDays?: number | null;
  [key: string]: unknown;
};

async function fetchSiteSettings(): Promise<SiteSettings | null> {
  const res = await fetch(backendApi('site-settings'), {
    headers: { Accept: 'application/json' },
    credentials: 'include',
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data as SiteSettings;
}

export const siteSettingsQueryKey = ['siteSettings'] as const;

export function useSiteSettings() {
  const query = useQuery({
    queryKey: siteSettingsQueryKey,
    queryFn: fetchSiteSettings,
    staleTime: 60 * 1000,
  });

  return {
    data: query.data ?? undefined,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
