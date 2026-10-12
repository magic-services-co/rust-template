'use client';

import { SiteEditorWorkspace } from './site-editor-workspace';
import type { SiteEditorPanel } from './site-editor-rail';

export function UnifiedThemeEditor({ initialPanel = 'theme' }: { initialPanel?: SiteEditorPanel }) {
  return <SiteEditorWorkspace initialPanel={initialPanel} />;
}
