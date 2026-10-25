"use client";

import { useSearchParams } from "next/navigation";
import { UnifiedThemeEditor } from "./unified-theme-editor";
import type { SiteEditorPanel } from "./site-editor-rail";

export function TabContainer() {
    const params = useSearchParams();
    const tab = params.get("tab");
    const initialPanel: SiteEditorPanel = tab === "site" ? "setup" : tab === "page_theme" ? "page" : "theme";

    return (
        <div className="flex h-full min-h-0 flex-col">
            <UnifiedThemeEditor initialPanel={initialPanel} />
        </div>
    );
}
