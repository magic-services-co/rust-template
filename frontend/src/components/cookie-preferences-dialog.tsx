"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { HomeCardCorners } from "@/components/home/home-card-corners";
import { cn } from "@/lib/utils";
import { useCookieConsent, type CookieBannerCopy, type CookieConsent } from "@/hooks/use-cookie-consent";

const CATEGORY_KEYS = ["necessary", "analytics", "marketing", "preferences"] as const;

const GOLD = "#ba9142";
const CARD_BORDER = "rgba(255, 255, 255, 0.1)";

export function CookieCta({
  children,
  onClick,
  variant = "primary",
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary";
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "ghost cookie-cta inline-flex h-11 min-w-[132px] items-center justify-center gap-2 border px-4 text-[10px] font-bold tracking-[1.4px]",
        className,
      )}
      style={
        variant === "primary"
          ? { backgroundColor: "#0a0e13", borderColor: GOLD, color: "#ecf3fc" }
          : { backgroundColor: "transparent", borderColor: "rgba(255,255,255,0.12)", color: "#c5d0de" }
      }
    >
      {children}
      {variant === "primary" ? <span className="link-cta-chevron">›</span> : null}
    </button>
  );
}

export function CookieCategoryList({
  consent,
  onChange,
  copy,
}: {
  consent: CookieConsent;
  onChange: (next: CookieConsent) => void;
  copy: CookieBannerCopy;
}) {
  return (
    <div className="flex flex-col gap-2">
      {CATEGORY_KEYS.map((key) => {
        const category = copy.categories[key];
        const required = key === "necessary";
        const on = Boolean(consent[key]);
        return (
          <button
            key={key}
            type="button"
            disabled={required}
            aria-pressed={on}
            onClick={() => {
              if (required) return;
              onChange({ ...consent, [key]: !on });
            }}
            className={cn(
              "ghost cookie-category flex w-full items-start justify-between gap-4 border px-4 py-3 text-left",
              required && "cursor-default opacity-100",
            )}
            style={{
              borderColor: on ? "rgba(186,145,66,0.7)" : CARD_BORDER,
              backgroundColor: on ? "rgba(186,145,66,0.08)" : "rgba(10,14,20,0.55)",
            }}
          >
            <div className="min-w-0">
              <p className="font-mono text-[9px] font-medium tracking-[1.4px]" style={{ color: GOLD }}>
                {category.kicker}
              </p>
              <p className="pt-1.5 text-[14px] font-semibold leading-[18px] text-[#edf5ff]">{category.title}</p>
              <p className="pt-1.5 text-[12px] leading-[18px] text-[#9facc0]">{category.description}</p>
            </div>
            <span
              className="mt-0.5 shrink-0 border px-2 py-1 font-mono text-[9px] font-medium tracking-[1.2px]"
              style={{
                borderColor: on ? "rgba(186,145,66,0.55)" : "rgba(255,255,255,0.12)",
                color: on ? "#f0c970" : "#8292a6",
                backgroundColor: on ? "rgba(186,145,66,0.12)" : "transparent",
              }}
            >
              {required ? "REQUIRED" : on ? "ON" : "OFF"}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function CookiePreferencesDialog({
  open,
  onOpenChange,
  initialConsent,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialConsent: CookieConsent;
  onSave: (consent: CookieConsent) => void;
}) {
  const { copy } = useCookieConsent();
  const [consent, setConsent] = useState<CookieConsent>(initialConsent);

  useEffect(() => {
    if (open) setConsent({ ...initialConsent, necessary: true });
  }, [open, initialConsent]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="cookie-dialog z-[300] flex max-h-[85vh] w-[calc(100%-2rem)] max-w-[560px] flex-col gap-0 overflow-visible border p-0 shadow-none sm:rounded-none"
        style={{
          backgroundColor: "#080c11",
          borderColor: CARD_BORDER,
        }}
      >
        <div className="relative flex min-h-0 flex-1 flex-col overflow-visible">
          <div className="shrink-0 border-b border-[rgba(255,255,255,0.1)] px-5 py-4 pr-12">
            <p className="support-hero-kicker font-mono text-[10px] font-medium tracking-[2.2px]">{copy.dialogKicker}</p>
            <DialogTitle className="pt-2 text-left text-[26px] font-extrabold leading-8 tracking-[-1.4px] text-[#f2f7ff]">
              {copy.dialogTitle} <span style={{ color: GOLD }}>{copy.dialogTitleAccent}</span>
            </DialogTitle>
            <DialogDescription className="max-w-[440px] pt-2 text-left text-[13px] leading-[20px] text-[#9facc0]">
              {copy.dialogMessage}
            </DialogDescription>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
            <CookieCategoryList consent={consent} onChange={setConsent} copy={copy} />
            <p className="pt-3 text-[11px] leading-[18px] text-[#8292a6]">
              Read more in our{" "}
              <Link href="/privacy-policy" className="text-[#d7b15a] hover:text-[#f0c970]" onClick={() => onOpenChange(false)}>
                Privacy Policy
              </Link>
              .
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 border-t border-[rgba(255,255,255,0.1)] px-5 py-4 sm:flex-row sm:justify-end">
            <CookieCta variant="secondary" onClick={() => onOpenChange(false)}>
              {copy.cancelLabel}
            </CookieCta>
            <CookieCta
              onClick={() => {
                onSave({ ...consent, necessary: true });
                onOpenChange(false);
              }}
            >
              {copy.saveLabel}
            </CookieCta>
          </div>
          <HomeCardCorners color={GOLD} show />
        </div>
      </DialogContent>
    </Dialog>
  );
}
