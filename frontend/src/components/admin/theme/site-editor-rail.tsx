"use client";

import type { ReactNode } from "react";
import { SiteSettingsForm } from "@/components/admin/site-settings-form";
import { SiteEditorPageFields } from "@/components/admin/theme/site-editor-page-fields";

export type SiteEditorPanel = "theme" | "page" | "setup";

export function SiteEditorRail({
  panel,
  onPanel,
  slug,
  label,
  theme,
  linkedOnly = false,
  activeField = null,
  onActiveFieldChange,
}: {
  panel: SiteEditorPanel;
  onPanel: (panel: SiteEditorPanel) => void;
  slug: string;
  label: string;
  theme: ReactNode;
  linkedOnly?: boolean;
  activeField?: string | null;
  onActiveFieldChange?: (key: string | null) => void;
}) {
  const items: { id: SiteEditorPanel; label: string }[] = [
    { id: "theme", label: "Theme" },
    { id: "page", label: "This page" },
    { id: "setup", label: "Setup" },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-1 rounded-md bg-muted p-1">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onPanel(item.id)}
            className={
              panel === item.id
                ? "rounded-sm bg-background px-2 py-1.5 text-xs font-medium shadow-sm"
                : "rounded-sm px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            }
          >
            {item.label}
          </button>
        ))}
      </div>
      {panel === "theme" ? theme : null}
      {panel === "page" ? (
        <SiteEditorPageFields
          key={slug}
          slug={slug}
          label={label}
          linkedOnly={linkedOnly}
          activeField={activeField}
          onActiveFieldChange={onActiveFieldChange}
        />
      ) : null}
      {panel === "setup" ? (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Site name, Discord, Steam, and store. These are not theme colors.
          </p>
          <SiteSettingsForm />
        </div>
      ) : null}
    </div>
  );
}
