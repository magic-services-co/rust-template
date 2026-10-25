"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { SupportPageShell } from "@/components/support/support-page-shell";
import { HomeCardCorners } from "@/components/home/home-card-corners";
import { installedFronts } from "@/addons/installed";
import { useAddonsManifest } from "@/hooks/use-addons-manifest";
import { usePublicFront } from "@/lib/public-front";
import type { ReactNode } from "react";

const ctaStyle = {
  backgroundColor: "#0a0e13",
  borderColor: "#ba9142",
  color: "#ecf3fc",
} as const;

const secondaryCtaStyle = {
  backgroundColor: "transparent",
  borderColor: "rgba(255,255,255,0.1)",
  color: "#c5d0de",
} as const;

export function ErrorCta({
  children,
  href,
  onClick,
  variant = "primary",
}: {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary";
}) {
  const className = cn(
    "ghost link-cta inline-flex h-12 min-w-[216px] items-center justify-center gap-2 rounded-lg border px-3.5",
  );
  const style = variant === "primary" ? ctaStyle : secondaryCtaStyle;

  if (href) {
    return (
      <Link href={href} className={className} style={style}>
        {children}
        {variant === "primary" ? <span className="link-cta-chevron">›</span> : null}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className} style={style}>
      {children}
      {variant === "primary" ? <span className="link-cta-chevron">›</span> : null}
    </button>
  );
}

export function ErrorPageContent({
  kicker,
  title,
  titleAccent,
  subtitle,
  children,
  actions,
}: {
  kicker: string;
  title: string;
  titleAccent?: string;
  subtitle?: string;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-[760px] flex-col items-center text-center">
      <div className="flex items-center justify-center gap-3">
        <span className="h-px w-7" style={{ backgroundColor: "rgba(186,145,66,0.78)" }} />
        <p className="support-hero-kicker font-mono text-[11px] font-medium leading-[11px] tracking-[2.6px]">
          {kicker}
        </p>
        <span className="h-px w-7" style={{ backgroundColor: "rgba(186,145,66,0.78)" }} />
      </div>
      <h1 className="support-hero-title pt-3.5 text-[40px] font-bold leading-[49px] tracking-[-2.25px] sm:text-[50px]">
        {title}
        {titleAccent ? (
          <>
            {" "}
            <span style={{ color: "#ba9142" }}>{titleAccent}</span>
          </>
        ) : null}
      </h1>
      {subtitle ? (
        <p className="support-hero-subtitle max-w-[555px] pt-2.5 text-[14px] leading-[22.4px]">
          {subtitle}
        </p>
      ) : null}
      {children ? <div className="w-full max-w-[555px] pt-8">{children}</div> : null}
      {actions ? (
        <div className="flex flex-wrap items-center justify-center gap-3 pt-10">{actions}</div>
      ) : null}
    </div>
  );
}

export function ErrorHint({ children }: { children: ReactNode }) {
  return (
    <div
      className="error-hint relative overflow-visible border px-5 py-4 text-left text-[13px] leading-6"
      style={{
        backgroundColor: "rgba(8, 12, 17, 0.94)",
        borderColor: "rgba(255,255,255,0.1)",
        color: "#9facc0",
      }}
    >
      {children}
      <HomeCardCorners color="#ba9142" show />
    </div>
  );
}

export function TemplateErrorPage({
  kicker,
  title,
  titleAccent,
  subtitle,
  children,
  actions,
  fillViewport = false,
}: {
  kicker: string;
  title: string;
  titleAccent?: string;
  subtitle?: string;
  children?: ReactNode;
  actions?: ReactNode;
  fillViewport?: boolean;
}) {
  return (
    <SupportPageShell>
      <div className={fillViewport ? "flex min-h-[calc(100vh-4rem)] flex-col" : undefined}>
        <ErrorPageContent
          kicker={kicker}
          title={title}
          titleAccent={titleAccent}
          subtitle={subtitle}
          actions={actions}
        >
          {children}
        </ErrorPageContent>
      </div>
    </SupportPageShell>
  );
}

export function ErrorPage({
  kicker,
  title,
  titleAccent,
  subtitle,
  children,
  actions,
  fillViewport = false,
}: {
  kicker: string;
  title: string;
  titleAccent?: string;
  subtitle?: string;
  children?: ReactNode;
  actions?: ReactNode;
  fillViewport?: boolean;
}) {
  const front = usePublicFront();
  const manifest = useAddonsManifest();
  const installed = installedFronts.find((item) => manifest.data?.addons.some((addon) => addon.id === item.id))?.slots.errorPage;
  const Slot = front.slots.errorPage ?? installed;
  const ready = front.ready || manifest.isFetched || manifest.isError;
  if (!ready) return null;
  if (Slot) {
    return (
      <Slot
        kicker={kicker}
        title={title}
        titleAccent={titleAccent}
        subtitle={subtitle}
        actions={actions}
        fillViewport={fillViewport}
      >
        {children}
      </Slot>
    );
  }
  return (
    <TemplateErrorPage
      kicker={kicker}
      title={title}
      titleAccent={titleAccent}
      subtitle={subtitle}
      actions={actions}
      fillViewport={fillViewport}
    >
      {children}
    </TemplateErrorPage>
  );
}
