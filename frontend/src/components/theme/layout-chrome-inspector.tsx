"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ColorPicker } from "@/components/admin/theme/color-picker";
import { backendApi } from "@/lib/api";
import { getAuthToken } from "@/lib/laravel-auth";
import { prepareSanctumMutationHeaders } from "@/lib/sanctum-csrf";
import { parsePageTheme } from "@/lib/parse-page-theme";
import { setPageThemeDraft } from "@/lib/page-theme-draft-store";
import { persistTheme } from "@/lib/theme-storage";
import {
  LAYOUT_CHROME_DEFAULTS,
  LAYOUT_CHROME_FIELDS,
  LAYOUT_CHROME_GROUPS,
  LAYOUT_CHROME_THEME_SETTINGS_MAP,
  layoutChromeFieldByKey,
  withLayoutChromeDefaults,
  type LayoutChromeField,
  type LayoutChromeGroupId,
  type LayoutChromeTheme,
} from "@/lib/layout-chrome-defaults";

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

async function loadLayoutSettings(): Promise<{
  merged: Record<string, unknown>;
  pageSettings: Record<string, unknown>;
}> {
  const res = await fetch(backendApi("data?include=themeSettings,pageTheme:layout"), {
    headers: { Accept: "application/json" },
    credentials: "include",
  });
  if (!res.ok) return { merged: {}, pageSettings: {} };
  const data = await res.json();
  const pageTheme = data?.pageTheme;
  const raw =
    pageTheme && typeof pageTheme === "object" && "settings" in pageTheme
      ? (pageTheme as { settings: unknown }).settings
      : {};
  const pageSettings = isPlainObject(raw) ? raw : {};
  const parsed = parsePageTheme(pageSettings, "layout");
  const global = isPlainObject(data?.themeSettings) ? data.themeSettings : {};
  return { merged: { ...global, ...parsed }, pageSettings };
}

export function LayoutChromeInspector({
  focusGroup,
  activeField,
  onActiveFieldChange,
  embedded = false,
}: {
  focusGroup: LayoutChromeGroupId;
  activeField: string | null;
  onActiveFieldChange: (key: string | null) => void;
  embedded?: boolean;
}) {
  const [theme, setTheme] = useState<LayoutChromeTheme>(() => withLayoutChromeDefaults());
  const [baseline, setBaseline] = useState<LayoutChromeTheme>(() => withLayoutChromeDefaults());
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>([focusGroup]);
  const fieldRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await loadLayoutSettings();
      if (cancelled) return;
      setSettings(loaded.pageSettings);
      const next = withLayoutChromeDefaults(loaded.merged);
      setTheme(next);
      setBaseline(next);
      setPageThemeDraft("layout", next);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setPageThemeDraft("layout", theme);
  }, [theme]);

  useEffect(() => {
    return () => setPageThemeDraft("layout", null);
  }, []);

  useEffect(() => {
    setOpenGroups((prev) => (prev.includes(focusGroup) ? prev : [focusGroup, ...prev]));
  }, [focusGroup]);

  useEffect(() => {
    if (!activeField) return;
    const field = layoutChromeFieldByKey(activeField);
    if (!field) return;
    setOpenGroups((prev) => (prev.includes(field.group) ? prev : [...prev, field.group]));
    requestAnimationFrame(() => {
      fieldRefs.current[activeField]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  }, [activeField]);

  const dirty = useMemo(() => JSON.stringify(theme) !== JSON.stringify(baseline), [theme, baseline]);

  const patch = (key: keyof LayoutChromeTheme, value: string) => {
    setTheme((prev) => withLayoutChromeDefaults({ ...prev, [key]: value }));
    onActiveFieldChange(String(key));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const headers = await prepareSanctumMutationHeaders({
        json: true,
        bearerToken: getAuthToken(),
      });
      const nextSettings = {
        ...settings,
        layout: theme,
      };
      let res = await fetch(backendApi("admin/theme/page"), {
        method: "PUT",
        credentials: "include",
        headers,
        body: JSON.stringify({ slug: "layout", settings: nextSettings }),
      });
      if (res.status === 404) {
        res = await fetch(backendApi("admin/theme/page"), {
          method: "POST",
          credentials: "include",
          headers,
          body: JSON.stringify({ slug: "layout", settings: nextSettings }),
        });
      }
      if (!res.ok) throw new Error("save failed");

      const readHeaders = { Accept: "application/json", ...(headers.Authorization ? { Authorization: headers.Authorization } : {}) };
      const mapped: Record<string, string> = {};
      for (const [chromeKey, themeKey] of Object.entries(LAYOUT_CHROME_THEME_SETTINGS_MAP)) {
        mapped[themeKey] = theme[chromeKey as keyof LayoutChromeTheme];
      }
      const visualRes = await fetch(backendApi("admin/theme?mode=visual"), { credentials: "include", headers: readHeaders });
      const visual = visualRes.ok ? await visualRes.json() : {};
      const savedTheme = await fetch(backendApi("admin/theme?mode=visual"), {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({ ...visual, ...mapped, enabled: true, mode: "visual" }),
      });
      if (!savedTheme.ok) throw new Error("save failed");
      persistTheme({ ...visual, ...mapped, enabled: true });

      setSettings(nextSettings);
      setBaseline(theme);
      toast.success("Navigation and footer saved");
    } catch {
      toast.error("Could not save navigation and footer");
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const scoped = LAYOUT_CHROME_FIELDS.filter((field) => field.group === focusGroup || !q);
    if (!q) return LAYOUT_CHROME_FIELDS;
    return scoped.filter(
      (field) =>
        field.label.toLowerCase().includes(q) ||
        field.key.toLowerCase().includes(q) ||
        field.hint?.toLowerCase().includes(q),
    );
  }, [query, focusGroup]);

  const grouped = useMemo(() => {
    const map = new Map<LayoutChromeGroupId, LayoutChromeField[]>();
    LAYOUT_CHROME_GROUPS.forEach((group) => map.set(group.id, []));
    filtered.forEach((field) => {
      map.get(field.group)?.push(field);
    });
    return map;
  }, [filtered]);

  const orderedGroups = useMemo(
    () =>
      [...LAYOUT_CHROME_GROUPS].sort((a, b) => {
        if (a.id === focusGroup) return -1;
        if (b.id === focusGroup) return 1;
        return 0;
      }),
    [focusGroup],
  );

  return (
    <div className={embedded ? "flex flex-col" : "flex h-full flex-col"}>
      <div className="space-y-3 border-b border-border pb-4">
        <p className="text-sm text-muted-foreground">
          Navigation, footer, and the profile menu. These show on every page.
        </p>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search fields…"
          className="h-9"
        />
        <div className="flex gap-2">
          <Button type="button" size="sm" className="flex-1" disabled={!dirty || saving} onClick={handleSave}>
            {saving ? "Saving…" : dirty ? "Save" : "Saved"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!dirty || saving}
            onClick={() => {
              setTheme(baseline);
              setPageThemeDraft("layout", baseline);
            }}
          >
            Undo
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={saving}
            onClick={() => {
              const reset = withLayoutChromeDefaults({ ...LAYOUT_CHROME_DEFAULTS });
              setTheme(reset);
              setPageThemeDraft("layout", reset);
            }}
          >
            Reset
          </Button>
        </div>
      </div>

      <Accordion
        type="multiple"
        value={openGroups}
        onValueChange={setOpenGroups}
        className={embedded ? undefined : "flex-1 overflow-y-auto"}
      >
        {orderedGroups.map((group) => {
          const fields = grouped.get(group.id) ?? [];
          if (fields.length === 0) return null;
          return (
            <AccordionItem key={group.id} value={group.id} className="border-b">
              <AccordionTrigger className="ghost px-0 text-sm hover:no-underline">
                <span className="flex flex-col items-start text-left">
                  <span>{group.label}</span>
                  <span className="text-xs font-normal text-muted-foreground">{group.description}</span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pb-4">
                {fields.map((field) => (
                  <div
                    key={field.key}
                    ref={(el) => {
                      fieldRefs.current[field.key] = el;
                    }}
                    className={
                      activeField === field.key
                        ? "rounded-md border border-[#ba9142] bg-[#ba9142]/10 p-3"
                        : "rounded-md border border-transparent p-3"
                    }
                  >
                    <ChromeFieldControl
                      field={field}
                      value={theme[field.key]}
                      onChange={(value) => patch(field.key, value)}
                    />
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}

function ChromeFieldControl({
  field,
  value,
  onChange,
}: {
  field: LayoutChromeField;
  value: string;
  onChange: (value: string) => void;
}) {
  if (field.type === "color") {
    return <ColorPicker label={field.label} value={value} onChange={onChange} />;
  }

  if (field.type === "textarea") {
    return (
      <div className="space-y-2">
        <Label>{field.label}</Label>
        {field.hint ? <p className="text-xs text-muted-foreground">{field.hint}</p> : null}
        <Textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>{field.label}</Label>
      {field.hint ? <p className="text-xs text-muted-foreground">{field.hint}</p> : null}
      <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
