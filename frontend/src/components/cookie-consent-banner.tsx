"use client";

import { useState } from "react";
import Link from "next/link";
import { CookieCta, CookiePreferencesDialog } from "@/components/cookie-preferences-dialog";
import { HomeCardCorners } from "@/components/home/home-card-corners";
import { useCookieConsent, type CookieConsent } from "@/hooks/use-cookie-consent";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { usePublicFrontSlot } from "@/lib/public-front";

const GOLD = "#ba9142";

export function CookieConsentBanner() {
  const { slot: Slot, ready } = usePublicFrontSlot("cookieBanner");
  if (!ready) return null;
  if (Slot) return <Slot />;
  return <TemplateCookieConsentBanner />;
}

function TemplateCookieConsentBanner() {
  const { isLoaded, needsConsent, acceptAll, denyAll, acceptCustom, copy } = useCookieConsent();
  const { data: settings } = useSiteSettings();
  const [showDetails, setShowDetails] = useState(false);
  const [customConsent, setCustomConsent] = useState<CookieConsent>({
    necessary: true,
    analytics: false,
    marketing: false,
    preferences: false,
  });
  const siteName = (settings?.name || "this site").replace(/\s+/g, " ").trim();

  if (!isLoaded || !needsConsent) {
    return null;
  }

  return (
    <>
      <div className="cookie-banner-wrap pointer-events-none fixed bottom-0 left-0 right-0 z-[80] p-3 sm:p-5">
        <div className="pointer-events-auto mx-auto w-full max-w-[1196px]">
          <article
            className="cookie-banner support-ticket-card relative overflow-visible border"
            style={{
              borderColor: "rgba(72,97,125,0.55)",
              backgroundColor: "#080c11",
            }}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  "linear-gradient(139.28deg, rgba(17, 23, 30, 0.96) 8.5%, rgba(8, 12, 17, 0.94) 91.5%)",
              }}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, rgba(186, 145, 66, 0.08) 0%, rgba(186, 145, 66, 0) 28%)",
              }}
            />

            <div className="relative flex flex-col gap-5 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-7 sm:py-6">
              <div className="max-w-[640px]">
                <p className="support-hero-kicker font-mono text-[10px] font-medium tracking-[2.2px]">
                  {copy.kicker}
                </p>
                <h3 className="pt-2 text-[22px] font-extrabold leading-7 tracking-[-0.8px] text-[#f2f7ff] sm:text-[26px] sm:leading-8">
                  {copy.title} <span style={{ color: GOLD }}>{copy.titleAccent}</span>
                </h3>
                <p className="pt-2 max-w-[520px] text-[13px] leading-[20px] text-[#9facc0]">
                  {copy.message.replaceAll("{site}", siteName)}{" "}
                  <Link href="/privacy-policy" className="text-[#d7b15a] hover:text-[#f0c970]">
                    {copy.privacyLabel}
                  </Link>
                </p>
              </div>

              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                <CookieCta variant="secondary" onClick={() => setShowDetails(true)}>
                  {copy.customizeLabel}
                </CookieCta>
                <CookieCta variant="secondary" onClick={denyAll}>
                  {copy.rejectLabel}
                </CookieCta>
                <CookieCta onClick={acceptAll}>{copy.acceptLabel}</CookieCta>
              </div>
            </div>
            <HomeCardCorners color={GOLD} show />
          </article>
        </div>
      </div>

      <CookiePreferencesDialog
        open={showDetails}
        onOpenChange={setShowDetails}
        initialConsent={customConsent}
        onSave={(next) => {
          setCustomConsent(next);
          acceptCustom(next);
        }}
      />
    </>
  );
}
