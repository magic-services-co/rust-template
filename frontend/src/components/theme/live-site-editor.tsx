'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { backendApi } from '@/lib/api';
import { getAuthToken } from '@/lib/laravel-auth';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { HomeThemeInspector } from '@/components/theme/home-theme-inspector';
import { PageThemeInspector } from '@/components/theme/page-theme-inspector';
import { LayoutChromeInspector } from '@/components/theme/layout-chrome-inspector';
import { SiteSettingsForm } from '@/components/admin/site-settings-form';
import { homeFieldByKey } from '@/lib/home-theme-defaults';
import { layoutChromeFieldByKey, type LayoutChromeGroupId } from '@/lib/layout-chrome-defaults';
import { ThemeEditorPagePicker } from '@/components/admin/theme/theme-editor-page-picker';
import {
  THEME_EDITOR_CHROME_PAGES,
  THEME_EDITOR_CORE_PAGES,
  isChromeEditorPage,
  mapCustomServerPages,
  matchThemeEditorPage,
  mergeThemeEditorPages,
  withThemeEditorQuery,
  type ThemeEditorPageOption,
} from '@/lib/theme-editor-pages';
import { resolveLivePageSlug } from '@/lib/live-page-theme';
import {
  findBestSelectableElement,
  generateSelector,
  isSelectableElement,
  pathnameToPageSlug,
} from '@/components/theme/theme-editor-dom';

function chromeTargetFromField(field: string | null): LayoutChromeGroupId | null {
  const group = field ? layoutChromeFieldByKey(field)?.group : undefined;
  if (group === 'footer' || group === 'nav' || group === 'account') return group;
  return null;
}

function isUserMenuTarget(target: HTMLElement): boolean {
  if (target.closest('.site-user-menu') || target.closest('.site-user-trigger')) return true;
  const wrapper = target.closest('[data-radix-popper-content-wrapper]');
  return Boolean(wrapper?.querySelector('.site-user-menu'));
}

function isMobileNavTarget(target: HTMLElement): boolean {
  return Boolean(target.closest('.site-mobile-nav') || target.closest('.site-mobile-trigger'));
}

function openUserMenu() {
  requestAnimationFrame(() => {
    const trigger = document.querySelector('.site-user-trigger') as HTMLElement | null;
    if (trigger && !document.querySelector('.site-user-menu')) trigger.click();
  });
}

function isEditorChrome(target: HTMLElement | null): boolean {
  if (!target) return true;
  if (isUserMenuTarget(target) || isMobileNavTarget(target)) return false;
  return Boolean(
    target.closest('[data-live-site-editor-ui="true"]') ||
      target.closest('[data-radix-popper-content-wrapper]') ||
      target.closest('[data-radix-portal]'),
  );
}

const CHROME_STYLE_ID = 'live-site-editor-chrome';

function LiveSiteEditorInner() {
  const searchParams = useSearchParams();
  const pathname = usePathname() ?? '/';
  const router = useRouter();
  const active = searchParams.get('theme-editor') === 'true';
  const [allowed, setAllowed] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);

  const pageSlug = pathnameToPageSlug(pathname);
  const liveSlug = resolveLivePageSlug(pathname, pageSlug);
  const isHome = liveSlug === 'home';
  const clickListenerRef = useRef<((e: MouseEvent) => void) | null>(null);
  const [hoverLabel, setHoverLabel] = useState<{ text: string; x: number; y: number } | null>(null);
  const [activeField, setActiveField] = useState<string | null>(null);
  const [chromeTarget, setChromeTarget] = useState<LayoutChromeGroupId | null>(null);
  const [editorPages, setEditorPages] = useState<ThemeEditorPageOption[]>([
    ...THEME_EDITOR_CHROME_PAGES,
    ...THEME_EDITOR_CORE_PAGES,
  ]);
  const currentEditorPage = chromeTarget
    ? THEME_EDITOR_CHROME_PAGES.find((page) => page.slug === chromeTarget)
    : matchThemeEditorPage(pathname, editorPages);

  useEffect(() => {
    if (allowed && active && panelOpen) {
      document.documentElement.classList.add('site-editor-open');
    } else {
      document.documentElement.classList.remove('site-editor-open');
    }
    return () => document.documentElement.classList.remove('site-editor-open');
  }, [allowed, active, panelOpen]);

  useEffect(() => {
    setActiveField(null);
    setChromeTarget(null);
  }, [liveSlug]);

  useEffect(() => {
    if (!active || pathname.startsWith('/admin')) return;
    if (typeof window !== 'undefined' && window.self !== window.top) return;

    let cancelled = false;
    (async () => {
      const token = getAuthToken();
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const r = await fetch(backendApi('admin/theme?mode=visual'), { credentials: 'include', headers });
      if (!cancelled && r.ok) setAllowed(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [active, pathname]);

  useEffect(() => {
    if (!allowed || !active || pathname.startsWith('/admin')) return;
    let cancelled = false;
    (async () => {
      const token = getAuthToken();
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const r = await fetch(backendApi('admin/server-pages'), { credentials: 'include', headers });
      if (!r.ok || cancelled) return;
      const pages = await r.json();
      if (cancelled) return;
      setEditorPages([...THEME_EDITOR_CHROME_PAGES, ...mergeThemeEditorPages(mapCustomServerPages(pages))]);
    })();
    return () => {
      cancelled = true;
    };
  }, [allowed, active, pathname]);

  const goToEditorPage = useCallback(
    (page: ThemeEditorPageOption) => {
      if (isChromeEditorPage(page)) {
        const next = (page.slug === 'footer' || page.slug === 'account' ? page.slug : 'nav') as LayoutChromeGroupId;
        setChromeTarget(next);
        setActiveField(
          next === 'footer' ? 'footerBackground' : next === 'account' ? 'userMenuBackground' : 'navLinkColor',
        );
        setPanelOpen(true);
        requestAnimationFrame(() => {
          if (next === 'footer') {
            document.querySelector('.site-footer')?.scrollIntoView({ behavior: 'smooth', block: 'end' });
          } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            if (next === 'account') openUserMenu();
          }
        });
        return;
      }
      setChromeTarget(null);
      if (page.path === pathname) return;
      setActiveField(null);
      router.push(withThemeEditorQuery(page.path));
    },
    [pathname, router],
  );

  const exitEditor = useCallback(() => {
    document.getElementById(CHROME_STYLE_ID)?.remove();
    document.querySelectorAll('.editor-selected, .editor-group-selected').forEach((el) => {
      el.classList.remove('editor-selected', 'editor-group-selected');
    });
    if (clickListenerRef.current) {
      document.removeEventListener('click', clickListenerRef.current, true);
      clickListenerRef.current = null;
    }
    const next = new URLSearchParams(searchParams.toString());
    next.delete('theme-editor');
    const q = next.toString();
    router.replace(q ? `${pathname}?${q}` : pathname);
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (!allowed || !active || pathname.startsWith('/admin')) return;
    if (typeof window !== 'undefined' && window.self !== window.top) return;

    let chrome = document.getElementById(CHROME_STYLE_ID) as HTMLStyleElement | null;
    if (!chrome) {
      chrome = document.createElement('style');
      chrome.id = CHROME_STYLE_ID;
      chrome.textContent = `
        .editor-selected { outline: 2px solid #ba9142 !important; outline-offset: 3px !important; }
        .theme-editor-hover { outline: 2px dashed rgba(186,145,66,0.9) !important; outline-offset: 3px !important; cursor: pointer !important; }
        html.theme-editor-active, html.theme-editor-active * { cursor: default; }
      `;
      document.head.appendChild(chrome);
    }

    document.documentElement.classList.add('theme-editor-active');

    const onDocClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t) return;
      if (isEditorChrome(t)) return;
      if (t.closest('[data-copy-chip="true"]')) return;

      const inUserTrigger = Boolean(t.closest('.site-user-trigger'));
      if (inUserTrigger) {
        setChromeTarget('account');
        setActiveField('userMenuBackground');
        setPanelOpen(true);
        return;
      }
      const inMobileTrigger = Boolean(t.closest('.site-mobile-trigger'));
      if (inMobileTrigger) {
        setChromeTarget('nav');
        setActiveField('navLinkColor');
        setPanelOpen(true);
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      const target = findBestSelectableElement(t);
      if (!isSelectableElement(target)) {
        toast.info('This element cannot be selected');
        return;
      }

      document.querySelectorAll('.editor-selected').forEach((el) => {
        el.classList.remove('editor-selected');
      });

      const themeField = target.getAttribute('data-theme-field');
      const inFooter = Boolean(target.closest('.site-footer'));
      const inUserMenu = Boolean(target.closest('.site-user-menu') || target.closest('.site-user-trigger'));
      const inMobileNav = Boolean(target.closest('.site-mobile-nav') || target.closest('.site-mobile-trigger'));
      const inHeader = Boolean(target.closest('.site-header'));
      if (inFooter) {
        setChromeTarget('footer');
      } else if (inUserMenu) {
        setChromeTarget('account');
      } else if (inMobileNav || inHeader) {
        setChromeTarget(chromeTargetFromField(themeField) || 'nav');
      } else {
        setChromeTarget(chromeTargetFromField(themeField));
      }

      if (themeField) {
        setActiveField(themeField);
        target.classList.add('editor-selected');
        setPanelOpen(true);
        return;
      }

      const themed = target.closest('[data-theme-field]') as HTMLElement | null;
      if (themed) {
        const field = themed.getAttribute('data-theme-field');
        if (field) setActiveField(field);
        const inFooter = Boolean(themed.closest('.site-footer'));
        const inUserMenu = Boolean(themed.closest('.site-user-menu') || themed.closest('.site-user-trigger'));
        const inMobileNav = Boolean(themed.closest('.site-mobile-nav') || themed.closest('.site-mobile-trigger'));
        const inHeader = Boolean(themed.closest('.site-header'));
        if (inFooter) {
          setChromeTarget('footer');
        } else if (inUserMenu) {
          setChromeTarget('account');
        } else if (inMobileNav || inHeader) {
          setChromeTarget(chromeTargetFromField(field) || 'nav');
        } else {
          setChromeTarget(chromeTargetFromField(field));
        }
        themed.classList.add('editor-selected');
        setPanelOpen(true);
        return;
      }

      generateSelector(target);
      setPanelOpen(true);
    };

    const onMouseOver = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t || isEditorChrome(t)) {
        setHoverLabel(null);
        return;
      }
      const themed = t.closest('[data-theme-field]') as HTMLElement | null;
      document.querySelectorAll('.theme-editor-hover').forEach((el) => el.classList.remove('theme-editor-hover'));
      if (!themed) {
        setHoverLabel(null);
        return;
      }
      themed.classList.add('theme-editor-hover');
      setHoverLabel({
        text: themed.getAttribute('data-theme-label') || themed.getAttribute('data-theme-field') || 'Edit',
        x: e.clientX,
        y: e.clientY,
      });
    };

    clickListenerRef.current = onDocClick;
    document.addEventListener('click', onDocClick, true);
    document.addEventListener('mouseover', onMouseOver, true);

    return () => {
      document.removeEventListener('click', onDocClick, true);
      document.removeEventListener('mouseover', onMouseOver, true);
      clickListenerRef.current = null;
      document.documentElement.classList.remove('theme-editor-active');
      document.getElementById(CHROME_STYLE_ID)?.remove();
      document.querySelectorAll('.editor-selected, .theme-editor-hover').forEach((el) => {
        el.classList.remove('editor-selected', 'theme-editor-hover');
      });
    };
  }, [allowed, active, pathname]);

  if (!active || pathname.startsWith('/admin')) return null;
  if (typeof window !== 'undefined' && window.self !== window.top) return null;

  if (!allowed) {
    return (
      <div
        className="fixed bottom-0 left-0 right-0 z-[9998] bg-amber-950 text-amber-100 text-center text-sm py-2 px-4"
        data-live-site-editor-ui="true"
      >
        Sign in as an admin to use the Site Editor, or{' '}
        <button type="button" className="underline font-medium" onClick={exitEditor}>
          exit editor mode
        </button>
        .
      </div>
    );
  }

  const fieldLabel = activeField
    ? layoutChromeFieldByKey(activeField)?.label ||
      (isHome ? homeFieldByKey(activeField)?.label : null) ||
      activeField
    : null;

  return (
    <>
      {hoverLabel ? (
        <div
          data-live-site-editor-ui="true"
          className="pointer-events-none fixed z-[9999] rounded-md bg-[#0a0e13] px-2 py-1 text-[11px] font-medium tracking-wide text-[#f0c970] shadow-lg"
          style={{ left: hoverLabel.x + 12, top: hoverLabel.y + 12 }}
        >
          {hoverLabel.text}
        </div>
      ) : null}

      <div
        className="fixed bottom-0 left-0 right-0 z-[9998] border-t bg-background/95 backdrop-filter supports-[backdrop-filter]:bg-background/80 shadow-lg"
        data-live-site-editor-ui="true"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-semibold shrink-0">Site Editor</span>
            <ThemeEditorPagePicker
              pages={editorPages}
              selectedSlug={currentEditorPage?.slug ?? pageSlug}
              onSelect={goToEditorPage}
            />
            {fieldLabel ? (
              <span className="text-xs text-muted-foreground truncate max-w-[28vw]">{fieldLabel}</span>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setPanelOpen((o) => !o)}>
              {panelOpen ? 'Hide panel' : 'Show panel'}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={exitEditor}>
              Exit editor
            </Button>
          </div>
        </div>
      </div>

      {panelOpen ? (
        <aside
          data-live-site-editor-ui="true"
          className="fixed bottom-14 right-0 top-0 z-[190] flex w-full max-w-[420px] flex-col border-l border-border bg-background p-5 shadow-2xl"
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-semibold">Site Editor</p>
              <p className="text-xs text-muted-foreground">
                This page, the header and footer, and site setup are all in this panel.
              </p>
            </div>
            <Button type="button" size="sm" variant="ghost" onClick={() => setPanelOpen(false)}>
              Hide
            </Button>
          </div>
          <div className="min-h-0 flex-1 space-y-8 overflow-y-auto pr-1">
            <section className="space-y-3">
              <h2 className="text-sm font-semibold">This page</h2>
              {isHome ? (
                <HomeThemeInspector embedded activeField={activeField} onActiveFieldChange={setActiveField} />
              ) : (
                <PageThemeInspector
                  embedded
                  key={liveSlug}
                  slug={liveSlug}
                  activeField={activeField}
                  onActiveFieldChange={setActiveField}
                />
              )}
            </section>
            <section className="space-y-3">
              <h2 className="text-sm font-semibold">Every page</h2>
              <LayoutChromeInspector
                embedded
                focusGroup={chromeTarget ?? 'nav'}
                activeField={activeField}
                onActiveFieldChange={setActiveField}
              />
            </section>
            <section className="space-y-3">
              <h2 className="text-sm font-semibold">Setup</h2>
              <p className="text-sm text-muted-foreground">Site name, Discord, Steam, and the store.</p>
              <SiteSettingsForm />
            </section>
          </div>
        </aside>
      ) : null}
    </>
  );
}

export function LiveSiteEditor() {
  return (
    <Suspense fallback={null}>
      <LiveSiteEditorInner />
    </Suspense>
  );
}
