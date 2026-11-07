'use client';

import { useEffect, useState } from 'react';
import { backendApi } from '@/lib/api';

export function DiscordUserCount({ suffix = "DISCORD MEMBERS" }: { suffix?: string }) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    fetch(backendApi('discord-members'), { credentials: 'omit' })
      .then(res => res.json())
      .then(data => setCount(typeof data?.count === 'number' ? data.count : null))
      .catch(() => setCount(null));
  }, []);

  return (
    <span className="flex items-center gap-1.5">
      <span className="font-bold">{count !== null ? count.toLocaleString() : '...'}</span>
      <span>{suffix}</span>
    </span>
  );
}