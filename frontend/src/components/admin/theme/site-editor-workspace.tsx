"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SiteEditorRail, type SiteEditorPanel } from "@/components/admin/theme/site-editor-rail";
import { SiteEditorTokens } from "@/components/admin/theme/site-editor-tokens";
import { ThemeEditorPagePicker } from "@/components/admin/theme/theme-editor-page-picker";
import { backendApi } from "@/lib/api";
import { getAuthToken } from "@/lib/laravel-auth";
import { homeFieldByKey } from "@/lib/home-theme-defaults";
import { layoutChromeFieldByKey } from "@/lib/layout-chrome-defaults";
import { LAYOUT_THEME_DEFAULTS } from "@/lib/layout-theme-defaults";
import { prepareSanctumMutationHeaders } from "@/lib/sanctum-csrf";
import { persistTheme } from "@/lib/theme-storage";
import {
  THEME_EDITOR_CORE_PAGES,
  mapCustomServerPages,
  mergeThemeEditorPages,
  withThemeEditorQuery,
} from "@/lib/theme-editor-pages";
import { TOKEN_KEY_SET, linkedControlForToken, tokenFieldByKey, type ThemeTokenValues } from "@/lib/theme-token-catalog";
import { applyLayoutThemeMedia, buildSiteThemeCss } from "@/components/theme/theme-override-css";

const DEFAULTS = { ...LAYOUT_THEME_DEFAULTS } as ThemeTokenValues;

function appendStyle(doc: Document, style: HTMLStyleElement) {
  const parent = doc.head ?? doc.documentElement;
  if (!parent) return false;
  parent.appendChild(style);
  return true;
}

export function SiteEditorWorkspace({ initialPanel = "theme" }: { initialPanel?: SiteEditorPanel }) {
  const [pages, setPages] = useState(THEME_EDITOR_CORE_PAGES);
  const [selectedPage, setSelectedPage] = useState(THEME_EDITOR_CORE_PAGES[0]);
  const [settings, setSettings] = useState<ThemeTokenValues>(DEFAULTS);
  const [saved, setSaved] = useState<ThemeTokenValues>(DEFAULTS);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [panel, setPanel] = useState<SiteEditorPanel>(initialPanel);
  const [linkedOnly, setLinkedOnly] = useState(true);
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [pageField, setPageField] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeKey, setIframeKey] = useState(0);

  useEffect(() => {
    setPageField(null);
    setFocusKey(null);
  }, [selectedPage.slug]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = getAuthToken();
      const headers: Record<string, string> = { Accept: "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      try {
        const [visualRes, globalRes, pagesRes, publicRes] = await Promise.all([
          fetch(backendApi("admin/theme?mode=visual"), { credentials: "include", headers }),
          fetch(backendApi("admin/theme?mode=global"), { credentials: "include", headers }),
          fetch(backendApi("admin/server-pages"), { credentials: "include", headers }),
          fetch(backendApi("data?include=themeSettings"), { headers: { Accept: "application/json" } }),
        ]);
        if (cancelled) return;
        const visual = visualRes.ok ? await visualRes.json() : {};
        const global = globalRes.ok ? await globalRes.json() : {};
        const published = publicRes.ok ? ((await publicRes.json()) as { themeSettings?: ThemeTokenValues }).themeSettings ?? {} : {};
        const merged = { ...DEFAULTS, ...published, ...global, ...visual } as ThemeTokenValues;
        setSettings(merged);
        setSaved(merged);
        setReady(true);
        if (pagesRes.ok) {
          const list = await pagesRes.json();
          setPages(mergeThemeEditorPages(mapCustomServerPages(list)));
        }
      } catch (error) {
        console.error(error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const paint = useCallback(
    (doc: Document | null | undefined) => {
      if (!doc || !ready) return;
      let style = doc.getElementById("theme-override") as HTMLStyleElement | null;
      const dirty = JSON.stringify(settings) !== JSON.stringify(saved);
      if (!dirty) {
        if (style) style.textContent = "";
        return;
      }
      if (!style) {
        style = doc.createElement("style");
        style.id = "theme-override";
        if (!appendStyle(doc, style)) return;
      }
      style.textContent = buildSiteThemeCss(settings);
      applyLayoutThemeMedia(doc, settings);
    },
    [ready, settings, saved],
  );

  useEffect(() => {
    paint(iframeRef.current?.contentDocument);
  }, [paint]);

  const focusField = useCallback((field: string) => {
    if (TOKEN_KEY_SET.has(field)) {
      setPanel("theme");
      setFocusKey(field);
      setLinkedOnly((current) => (current && !linkedControlForToken(field) ? false : current));
      return;
    }
    setPanel("page");
    if (!homeFieldByKey(field) && !layoutChromeFieldByKey(field)) setLinkedOnly(false);
    setPageField(field);
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; field?: string };
      if (data?.type === "site-editor-field" && data.field) focusField(data.field);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [focusField]);

  const bindPreview = (doc: Document) => {
    let chrome = doc.getElementById("editor-styles") as HTMLStyleElement | null;
    if (!chrome) {
      chrome = doc.createElement("style");
      chrome.id = "editor-styles";
      if (!appendStyle(doc, chrome)) return;
    }
    chrome.textContent = `
      a { pointer-events: auto; }
      [data-theme-active="true"] { outline: 2px solid #ba9142; outline-offset: 2px; }
    `;
    doc.addEventListener(
      "click",
      (event) => {
        const target = event.target as HTMLElement | null;
        if (!target) return;
        const link = target.closest("a");
        if (link) event.preventDefault();
        const themed = target.closest("[data-theme-field]") as HTMLElement | null;
        const field = themed?.getAttribute("data-theme-field");
        doc.querySelectorAll("[data-theme-active]").forEach((el) => el.removeAttribute("data-theme-active"));
        if (!field || !themed) return;
        themed.setAttribute("data-theme-active", "true");
        window.parent.postMessage({ type: "site-editor-field", field }, window.location.origin);
      },
      true,
    );
    paint(doc);
  };

  const save = async () => {
    setSaving(true);
    try {
      const headers = await prepareSanctumMutationHeaders({ json: true, bearerToken: getAuthToken() });
      const response = await fetch(backendApi("admin/theme?mode=visual"), {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify(settings),
      });
      if (!response.ok) throw new Error("save failed");
      const stored = (await response.json()) as ThemeTokenValues;
      const next = { ...DEFAULTS, ...stored };
      setSettings(next);
      setSaved(next);
      persistTheme(next);
      setIframeKey((key) => key + 1);
      toast.success("Theme saved");
    } catch {
      toast.error("Could not save the theme");
    } finally {
      setSaving(false);
    }
  };

  const dirty = JSON.stringify(settings) !== JSON.stringify(saved);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 px-4 pb-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 text-sm font-semibold">Site Editor</span>
          <ThemeEditorPagePicker pages={pages} selectedSlug={selectedPage.slug} onSelect={setSelectedPage} />
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => window.open(`${window.location.origin}${withThemeEditorQuery(selectedPage.path)}`, "_blank", "noopener,noreferrer")}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Edit on the site
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setIframeKey((key) => key + 1)}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reload
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!dirty || saving}
            onClick={() => {
              setSettings(saved);
              toast.info("Reverted unsaved theme colors");
            }}
          >
            Undo
          </Button>
          <Button type="button" size="sm" disabled={!dirty || saving} onClick={save}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving…" : "Save theme"}
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_420px] gap-4">
        <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border bg-background">
          <div className="flex items-center justify-between border-b bg-muted p-2">
            <div className="text-sm text-muted-foreground">Preview: {selectedPage.label}</div>
          </div>
          <div className="border-b border-zinc-500/20 bg-zinc-500/10 px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300">
            Click a labeled part of the preview. Simple colors stay together. Detailed opens that one control.
            {focusKey ? ` Selected: ${tokenFieldByKey(focusKey)?.label ?? focusKey}.` : ""}
          </div>
          <iframe
            key={iframeKey}
            ref={iframeRef}
            src={`${selectedPage.path}?theme-preview=true`}
            className="min-h-0 w-full flex-1 border-0"
            sandbox="allow-same-origin allow-scripts"
            onLoad={(event) => {
              const doc = event.currentTarget.contentDocument;
              if (doc) bindPreview(doc);
            }}
          />
        </div>

        <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border bg-background">
          {panel !== "setup" ? (
            <div className="flex gap-1 border-b bg-muted/40 p-2">
              <DepthButton active={linkedOnly} onClick={() => setLinkedOnly(true)}>
                Simple
              </DepthButton>
              <DepthButton active={!linkedOnly} onClick={() => setLinkedOnly(false)}>
                Detailed
              </DepthButton>
            </div>
          ) : null}
          <ScrollArea className="min-h-0 flex-1" type="always">
            <div className="p-4">
              <SiteEditorRail
                panel={panel}
                onPanel={setPanel}
                slug={selectedPage.slug}
                label={selectedPage.label}
                linkedOnly={linkedOnly}
                activeField={pageField}
                onActiveFieldChange={setPageField}
                theme={
                  <SiteEditorTokens
                    settings={settings}
                    linkedOnly={linkedOnly}
                    focusKey={focusKey}
                    onChange={setSettings}
                    onInspectToken={(key) => {
                      setPanel("theme");
                      setLinkedOnly(false);
                      setFocusKey(key);
                    }}
                  />
                }
              />
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}

function DepthButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "flex-1 rounded-sm bg-background px-2 py-1.5 text-xs font-medium shadow-sm"
          : "flex-1 rounded-sm px-2 py-1.5 text-xs font-medium text-muted-foreground"
      }
    >
      {children}
    </button>
  );
}
