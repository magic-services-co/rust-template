"use client";

import { useState, type CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { CookiePreferencesDialog } from "@/components/cookie-preferences-dialog";
import { useCookieConsent } from "@/hooks/use-cookie-consent";

interface CookiePreferencesLinkProps {
  variant?: "link" | "button";
  className?: string;
  style?: CSSProperties;
}

export function CookiePreferencesLink({ variant = "link", className, style }: CookiePreferencesLinkProps) {
  const { getConsent, acceptCustom, copy } = useCookieConsent();
  const [showDialog, setShowDialog] = useState(false);
  const [currentConsent, setCurrentConsent] = useState(getConsent());

  const open = (next: boolean) => {
    if (next) setCurrentConsent(getConsent());
    setShowDialog(next);
  };

  return (
    <>
      {variant === "button" ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={className}
          style={style}
          onClick={() => open(true)}
        >
          {copy.dialogTitle} {copy.dialogTitleAccent}
        </Button>
      ) : (
        <button
          type="button"
          className={className || "text-sm text-muted-foreground hover:text-foreground transition-colors"}
          style={style}
          onClick={() => open(true)}
        >
          {copy.footerLabel}
        </button>
      )}
      <CookiePreferencesDialog
        open={showDialog}
        onOpenChange={open}
        initialConsent={currentConsent}
        onSave={acceptCustom}
      />
    </>
  );
}
