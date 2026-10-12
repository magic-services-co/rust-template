"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { usePageThemeDraft } from "@/hooks/use-page-theme-draft";
import {
  LAYOUT_THEME_DEFAULTS,
  PRIVACY_THEME_DEFAULTS,
  legalUpdatedDate,
  splitBrandName,
  stripSectionHeading,
  withPrivacyDefaults,
} from "@/lib/layout-theme-defaults";
import { HomeCardCorners } from "@/components/home/home-card-corners";

const NAVBAR_HEIGHT = 94;

interface Section {
  id: string;
  title: string;
  content: string;
  order: number;
}

function isIntroSection(section: Section): boolean {
  const id = section.id.toLowerCase();
  return id === "intro" || id === "summary" || id === "introduction";
}

function htmlToText(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export default function Content({
  legalTheme,
}: {
  legalTheme?: Record<string, unknown>;
} = {}) {
  const searchParams = useSearchParams();
  const { data: settings } = useSiteSettings();
  const draft = usePageThemeDraft("privacy");
  const [sections, setSections] = useState<Section[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const theme = withPrivacyDefaults(draft ?? legalTheme);
  const kickerBrand = splitBrandName(settings?.name).filter(Boolean).join(" ");
  const siteName = settings?.name || "Magic Rust";

  useEffect(() => {
    const fetchSections = async () => {
      try {
        const { backendApi } = await import("@/lib/api");
        const response = await fetch(backendApi("legal/privacy-policy"));
        if (response.ok) {
          const data = await response.json();
          setSections(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Failed to fetch privacy sections", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSections();
  }, []);

  const introSection = useMemo(
    () => sections.find(isIntroSection),
    [sections],
  );
  const numberedSections = useMemo(
    () => sections.filter((section) => !isIntroSection(section)),
    [sections],
  );
  const introText = introSection
    ? htmlToText(introSection.content) || theme.introText
    : theme.introText;
  const introTitle = (() => {
    const fromSection = introSection ? stripSectionHeading(introSection.title) : "";
    if (fromSection && !/^introduction$/i.test(fromSection)) {
      return fromSection;
    }
    return theme.introTitle;
  })();

  useEffect(() => {
    if (!isLoading && numberedSections[0] && !activeId) {
      setActiveId(numberedSections[0].id);
    }
  }, [isLoading, numberedSections, activeId]);

  useEffect(() => {
    if (isLoading) return;
    const hash = searchParams.get("section");
    if (!hash) return;
    const element = document.getElementById(hash);
    if (!element) return;
    setActiveId(hash);
    const timer = window.setTimeout(() => {
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - NAVBAR_HEIGHT;
      window.scrollTo({ top: offsetPosition, behavior: "smooth" });
    }, 100);
    return () => window.clearTimeout(timer);
  }, [searchParams, isLoading]);

  useEffect(() => {
    if (isLoading || numberedSections.length === 0) return;
    const observers: IntersectionObserver[] = [];
    numberedSections.forEach((section) => {
      const el = document.getElementById(section.id);
      if (!el) return;
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) setActiveId(section.id);
          });
        },
        { rootMargin: "-30% 0px -55% 0px", threshold: 0.1 },
      );
      observer.observe(el);
      observers.push(observer);
    });
    return () => observers.forEach((observer) => observer.disconnect());
  }, [isLoading, numberedSections]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (!element) return;
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - NAVBAR_HEIGHT;
    window.scrollTo({ top: offsetPosition, behavior: "smooth" });
    setActiveId(id);
  };

  return (
    <div className="relative isolate bg-[#05070a]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[570px] overflow-hidden opacity-[0.54]"
      >
        <img
          src="/images/legal-hero.png"
          alt=""
          className="h-[216%] w-full max-w-none object-cover object-top"
        />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[rgba(5,7,10,0.32)] to-[#05070a] to-[30%]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[570px]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 84% 7%, rgba(186,145,66,0.09) 0%, rgba(186,145,66,0) 26%)",
        }}
      />

      <div
        className="legal-page relative mx-auto w-full max-w-[1120px] px-4 pb-16 pt-[157px] sm:px-6"
        style={{
          ["--legal-title" as string]: theme.titleColor,
          ["--legal-accent" as string]: theme.accentColor,
          ["--legal-heading" as string]: theme.headingColor,
          ["--legal-body" as string]: theme.bodyColor,
          ["--legal-link" as string]: theme.accentLink,
        }}
      >
        <div className="border-b border-white/10 pb-9">
          <p
            data-theme-field="kickerColor"
            data-theme-label="Kicker"
            className="text-[10px] font-medium leading-[15px] tracking-[2.4px]"
            style={{ color: theme.kickerColor }}
          >
            {kickerBrand} / LEGAL
          </p>
          <div className="flex flex-col items-start justify-between gap-8 pt-5 lg:flex-row lg:items-end">
            <h1
              data-theme-field="titleColor"
              data-theme-label="Title"
              className="legal-hero-title whitespace-nowrap text-[48px] font-extrabold leading-[48px] tracking-[-3.6px] sm:text-[60px] sm:leading-[60px] sm:tracking-[-4.5px]"
              style={{ color: theme.titleColor }}
            >
              PRIVACY
              <br />
              <span
                data-theme-field="accentColor"
                data-theme-label="Gold words"
                className="legal-hero-accent"
                style={{ color: theme.accentColor }}
              >
                POLICY.
              </span>
            </h1>
            <div
              className="w-full max-w-[384px] border-l pl-4"
              style={{ borderColor: "rgba(186,145,66,0.6)" }}
            >
              {legalUpdatedDate(sections, theme.lastUpdated) ? (
                <>
                  <p
                    className="text-[10px] font-bold leading-[15px] tracking-[1.6px]"
                    style={{ color: theme.accentSoft }}
                  >
                    {theme.lastUpdatedLabel}
                  </p>
                  <p className="pt-1 text-[14px] leading-5" style={{ color: "#c0ccda" }}>
                    {legalUpdatedDate(sections, theme.lastUpdated)}
                  </p>
                </>
              ) : null}
              <p className="pt-3 text-[11px] leading-5" style={{ color: theme.mutedColor }}>
                This policy explains how {siteName} handles personal information across our website, servers, and community services.
              </p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="grid gap-10 pt-10 lg:grid-cols-[230px_minmax(0,700px)]">
            <aside className="lg:sticky lg:top-[120px] lg:self-start">
              <p
                className="text-[9px] font-bold leading-[13.5px] tracking-[1.8px]"
                style={{ color: theme.tocLabelColor }}
              >
                ON THIS PAGE
              </p>
              <nav className="mt-3 border-y border-white/10 py-2">
                {numberedSections.map((section, index) => {
                  const isActive = (activeId || numberedSections[0]?.id) === section.id;
                  const num = String(index + 1).padStart(2, "0");
                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => scrollToSection(section.id)}
                      className="layout-toc-item ghost flex w-full items-center gap-3 py-3 text-left"
                    >
                      <span
                        className="text-[9px] font-bold leading-[13.5px]"
                        style={{ color: isActive ? theme.accentColor : theme.tocNumberInactiveColor }}
                      >
                        {num}
                      </span>
                      <span
                        className="text-[11px] font-normal leading-[16.5px]"
                        style={{ color: isActive ? "#ffffff" : theme.tocInactiveColor }}
                      >
                        {stripSectionHeading(section.title)}
                      </span>
                    </button>
                  );
                })}
              </nav>
              <p className="pt-5 text-[10px] leading-5" style={{ color: "#6e7f92" }}>
                {theme.sidebarSupportText}{" "}
                <Link href="/support" className="underline" style={{ color: theme.accentLink }}>
                  contact support.
                </Link>
              </p>
              <Link
                href="/terms-of-service"
                className="mt-4 inline-flex h-[35.5px] min-w-[174px] items-center justify-center border px-4 text-center text-[9px] font-bold leading-[13.5px] tracking-[1.26px]"
                style={{
                  borderColor: "rgba(186,145,66,0.55)",
                  color: theme.accentSoft,
                }}
              >
                VIEW TERMS OF SERVICE
              </Link>
            </aside>

            <article className="max-w-[700px]">
              <div
                className="relative overflow-visible border p-5"
                style={{
                  backgroundColor: theme.introBackground,
                  borderColor: theme.introBorder,
                }}
              >
                <p
                  className="text-[14px] font-bold leading-5"
                  style={{ color: theme.introTitleColor }}
                >
                  {introTitle}
                </p>
                <p className="pt-2.5 text-[13px] leading-6" style={{ color: "#aebccc" }}>
                  {introText}
                </p>
                <HomeCardCorners color="#ba9142" show />
              </div>

              {numberedSections.map((section, index) => {
                const num = String(index + 1).padStart(2, "0");
                return (
                  <section key={section.id} className="relative pt-10">
                    <div
                      aria-hidden
                      className="absolute left-[-18px] top-[45px] h-[121px] w-px bg-gradient-to-b from-[rgba(186,145,66,0.65)] to-[rgba(186,145,66,0)] opacity-55"
                    />
                    <div className="flex items-end gap-2">
                      <span
                        className="pb-[6px] text-[10px] font-bold leading-[15px] tracking-[1.6px]"
                        style={{ color: theme.accentColor }}
                      >
                        {num}
                      </span>
                      <h2
                        id={section.id}
                        className="legal-section-title text-[20px] font-extrabold leading-7 tracking-[-0.7px]"
                        style={{ color: theme.headingColor }}
                      >
                        <Link href={`?section=${section.id}`} className="legal-section-link" style={{ color: theme.headingColor }}>
                          {stripSectionHeading(section.title)}
                        </Link>
                      </h2>
                    </div>
                    <div
                      className="legal-body pt-4 text-[13px] leading-7"
                      style={{ color: theme.bodyColor }}
                      dangerouslySetInnerHTML={{ __html: section.content }}
                    />
                  </section>
                );
              })}

              <div className="mt-12 border-t border-white/10 pt-5">
                <p className="text-[10px] tracking-[1px] leading-5" style={{ color: "#687a8e" }}>
                  <span style={{ color: "#6e7f92" }}>Have any questions? </span>
                  <Link href="/support" className="underline" style={{ color: theme.accentLink }}>
                    contact support.
                  </Link>
                </p>
              </div>
            </article>
          </div>
        )}
      </div>
    </div>
  );
}

export { PRIVACY_THEME_DEFAULTS, LAYOUT_THEME_DEFAULTS };
