'use client';

import { TabContainer } from '@/components/admin/theme/tab-container';
import { Suspense } from 'react';

export default function ThemePage() {
  return (
    <div className="-mx-4 -mb-6 flex h-[calc(100svh-7.5rem)] min-h-0 flex-col">
      <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading Site Editor…</div>}>
        <TabContainer />
      </Suspense>
    </div>
  );
} 