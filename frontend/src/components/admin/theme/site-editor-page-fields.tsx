"use client";

import { HomeThemeInspector } from "@/components/theme/home-theme-inspector";
import { LayoutChromeInspector } from "@/components/theme/layout-chrome-inspector";
import { PageThemeInspector } from "@/components/theme/page-theme-inspector";
import { layoutChromeFieldByKey } from "@/lib/layout-chrome-defaults";
import { getLivePageCatalog, resolveLivePageSlug } from "@/lib/live-page-theme";

export function SiteEditorPageFields({
  slug,
  label,
  linkedOnly = false,
  activeField = null,
  onActiveFieldChange,
}: {
  slug: string;
  label: string;
  linkedOnly?: boolean;
  activeField?: string | null;
  onActiveFieldChange?: (key: string | null) => void;
}) {
  const liveSlug = resolveLivePageSlug(slug === "home" ? "/" : `/${slug}`, slug);
  const setActive = onActiveFieldChange ?? (() => {});
  const chrome = activeField ? layoutChromeFieldByKey(activeField) : undefined;
  if (chrome && (chrome.group === "nav" || chrome.group === "footer" || chrome.group === "account")) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">Navigation, footer, and the profile menu.</p>
        <LayoutChromeInspector
          embedded
          focusGroup={chrome.group}
          activeField={activeField}
          onActiveFieldChange={setActive}
        />
      </div>
    );
  }

  if (slug === "home") {
    return (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          {linkedOnly
            ? "Sections, the welcome text, and the shared button colors. Detailed opens each card color."
            : "Every homepage field, including each card color. Site-wide colors stay under Theme."}
        </p>
        <HomeThemeInspector
          embedded
          linkedOnly={linkedOnly}
          activeField={activeField}
          onActiveFieldChange={setActive}
        />
      </div>
    );
  }

  if (!getLivePageCatalog(liveSlug)) {
    return (
      <p className="text-sm text-muted-foreground">
        {label} follows the site theme. Use Theme for colors that show on every page.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {linkedOnly
          ? `Title and buttons for ${label}. Detailed opens cards, inputs, and the rest.`
          : `Every field for ${label}. Theme colors still apply on the other pages.`}
      </p>
      <PageThemeInspector
        embedded
        key={liveSlug}
        slug={liveSlug}
        linkedOnly={linkedOnly}
        activeField={activeField}
        onActiveFieldChange={setActive}
      />
    </div>
  );
}
