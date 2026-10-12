"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ColorPicker } from "@/components/admin/theme/color-picker";
import { backendApi } from "@/lib/api";
import { getAuthToken } from "@/lib/laravel-auth";
import { prepareSanctumMutationHeaders } from "@/lib/sanctum-csrf";
import { parsePageTheme } from "@/lib/parse-page-theme";
import { setPageThemeDraft } from "@/lib/page-theme-draft-store";
import {
  LIVE_THEME_GROUPS,
  fieldByKey,
  fieldsFromDefaults,
  getLivePageCatalog,
  mergeThemeDefaults,
  type LiveThemeField,
} from "@/lib/live-page-theme";

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

async function loadPageSettings(fetchSlug: string): Promise<Record<string, unknown>> {
  const res = await fetch(backendApi(`data?include=pageTheme:${fetchSlug}`), {
    headers: { Accept: "application/json" },
    credentials: "include",
  });
  if (!res.ok) return {};
  const data = await res.json();
  const pageTheme = data?.pageTheme;
  const raw =
    pageTheme && typeof pageTheme === "object" && "settings" in pageTheme
      ? (pageTheme as { settings: unknown }).settings
      : {};
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return isPlainObject(raw) ? raw : {};
}

const LINKED_PAGE_GROUPS = new Set(["hero", "buttons"]);

export function PageThemeInspector({
  slug,
  activeField,
  onActiveFieldChange,
  embedded = false,
  linkedOnly = false,
}: {
  slug: string;
  activeField: string | null;
  onActiveFieldChange: (key: string | null) => void;
  embedded?: boolean;
  linkedOnly?: boolean;
}) {
  const catalog = getLivePageCatalog(slug);
  const defaults = catalog?.defaults ?? {};
  const fields = useMemo(() => fieldsFromDefaults(defaults), [defaults]);
  const [theme, setTheme] = useState<Record<string, unknown>>(() => mergeThemeDefaults(defaults));
  const [baseline, setBaseline] = useState<Record<string, unknown>>(() => mergeThemeDefaults(defaults));
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>(embedded ? [] : ["hero", "cards"]);
  const fieldRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!catalog) return;
    let cancelled = false;
    (async () => {
      const loaded = await loadPageSettings(catalog.fetchSlug);
      if (cancelled) return;
      setSettings(loaded);
      const next = mergeThemeDefaults(catalog.defaults, parsePageTheme(loaded, catalog.fetchSlug));
      setTheme(next);
      setBaseline(next);
      setPageThemeDraft(catalog.slug === "ticket" ? "support" : catalog.settingsKey, next);
    })();
    return () => {
      cancelled = true;
    };
  }, [catalog]);

  const draftSlug = catalog?.slug === "ticket" ? "support" : catalog?.settingsKey ?? slug;

  useEffect(() => {
    if (!catalog) return;
    setPageThemeDraft(draftSlug, theme);
  }, [catalog, draftSlug, theme]);

  useEffect(() => {
    return () => {
      if (draftSlug) setPageThemeDraft(draftSlug, null);
    };
  }, [draftSlug]);

  useEffect(() => {
    if (!activeField) return;
    const field = fieldByKey(fields, activeField);
    if (!field) return;
    setOpenGroups((prev) => (prev.includes(field.group) ? prev : [...prev, field.group]));
    requestAnimationFrame(() => {
      fieldRefs.current[activeField]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  }, [activeField, fields]);

  const dirty = useMemo(() => JSON.stringify(theme) !== JSON.stringify(baseline), [theme, baseline]);

  const patch = (key: string, value: unknown) => {
    setTheme((prev) => mergeThemeDefaults(defaults, { ...prev, [key]: value }));
    onActiveFieldChange(key);
  };

  const handleSave = async () => {
    if (!catalog) return;
    setSaving(true);
    try {
      const headers = await prepareSanctumMutationHeaders({
        json: true,
        bearerToken: getAuthToken(),
      });
      const nextSettings = {
        ...settings,
        [catalog.settingsKey]: theme,
      };
      let res = await fetch(backendApi("admin/theme/page"), {
        method: "PUT",
        credentials: "include",
        headers,
        body: JSON.stringify({ slug: catalog.fetchSlug, settings: nextSettings }),
      });
      if (res.status === 404) {
        res = await fetch(backendApi("admin/theme/page"), {
          method: "POST",
          credentials: "include",
          headers,
          body: JSON.stringify({ slug: catalog.fetchSlug, settings: nextSettings }),
        });
      }
      if (!res.ok) throw new Error("save failed");
      setSettings(nextSettings);
      setBaseline(theme);
      toast.success(`${catalog.label} theme saved`);
    } catch {
      toast.error("Could not save the page theme");
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return fields;
    return fields.filter(
      (field) =>
        field.label.toLowerCase().includes(q) ||
        field.key.toLowerCase().includes(q) ||
        field.hint?.toLowerCase().includes(q),
    );
  }, [fields, query]);

  useEffect(() => {
    if (!query.trim()) return;
    setOpenGroups([...new Set(filtered.map((field) => field.group))]);
  }, [query, filtered]);

  const grouped = useMemo(() => {
    const map = new Map<string, LiveThemeField[]>();
    LIVE_THEME_GROUPS.forEach((group) => map.set(group.id, []));
    filtered.forEach((field) => {
      const list = map.get(field.group) ?? [];
      list.push(field);
      map.set(field.group, list);
    });
    return map;
  }, [filtered]);

  if (!catalog) {
    return (
      <p className="text-sm text-muted-foreground">
        This page does not have structured fields yet. Site-wide colors are in the Look section of Site Editor.
      </p>
    );
  }

  return (
    <div className={embedded ? "flex flex-col" : "flex h-full flex-col"}>
      <div className="space-y-3 border-b border-border pb-4">
        <p className="text-sm text-muted-foreground">
          Click the page or edit the fields. Changes preview instantly.
        </p>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search fields…"
          className="h-9"
        />
        <div className="flex gap-2">
          <Button type="button" size="sm" className="flex-1" disabled={!dirty || saving} onClick={handleSave}>
            {saving ? "Saving…" : dirty ? `Save ${catalog.label.toLowerCase()} theme` : "Saved"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!dirty || saving}
            onClick={() => setTheme(baseline)}
          >
            Undo
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={saving}
            onClick={() => setTheme(mergeThemeDefaults(defaults))}
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
        {LIVE_THEME_GROUPS.filter((group) => !linkedOnly || LINKED_PAGE_GROUPS.has(group.id)).map((group) => {
          const groupFields = grouped.get(group.id) ?? [];
          if (groupFields.length === 0) return null;
          return (
            <AccordionItem key={group.id} value={group.id} className="border-b">
              <AccordionTrigger className="ghost px-0 text-sm hover:no-underline">
                <span className="flex flex-col items-start text-left">
                  <span>{group.label}</span>
                  <span className="text-xs font-normal text-muted-foreground">{group.description}</span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pb-4">
                {groupFields.map((field) => (
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
                    <LiveFieldControl field={field} value={theme[field.key]} onChange={(value) => patch(field.key, value)} />
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

function LiveFieldControl({
  field,
  value,
  onChange,
}: {
  field: LiveThemeField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  if (field.type === "toggle") {
    return (
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label className="text-sm">{field.label}</Label>
          {field.hint ? <p className="pt-1 text-xs text-muted-foreground">{field.hint}</p> : null}
        </div>
        <Switch className="ghost" checked={Boolean(value)} onCheckedChange={(checked) => onChange(checked)} />
      </div>
    );
  }

  if (field.type === "color") {
    return (
      <ColorPicker
        label={field.label}
        value={String(value ?? "")}
        onChange={(next) => onChange(next)}
      />
    );
  }

  if (field.type === "textarea") {
    return (
      <div className="space-y-2">
        <Label>{field.label}</Label>
        {field.hint ? <p className="text-xs text-muted-foreground">{field.hint}</p> : null}
        <Textarea rows={3} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>{field.label}</Label>
      {field.hint ? <p className="text-xs text-muted-foreground">{field.hint}</p> : null}
      <Input
        type={field.type === "number" ? "number" : "text"}
        value={String(value ?? "")}
        onChange={(e) => onChange(field.type === "number" ? Number(e.target.value) : e.target.value)}
      />
    </div>
  );
}
