"use client";

import "./globals.css";
import { ErrorCta, ErrorHint, TemplateErrorPage } from "@/components/error-page";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-[#05070a] text-[#f2f7ff]">
        <TemplateErrorPage
          kicker="SERVER ERROR"
          title="500"
          titleAccent="FAILED"
          subtitle="Something went wrong while loading this site. Try again, or return home."
          fillViewport
          actions={
            <>
              <ErrorCta onClick={() => reset()}>TRY AGAIN</ErrorCta>
              <ErrorCta href="/" variant="secondary">
                RETURN HOME
              </ErrorCta>
            </>
          }
        >
          {process.env.NODE_ENV === "development" ? (
            <ErrorHint>
              <p className="font-mono text-[11px] tracking-[0.4px] text-[#e8a0a3]">
                {error.message || "Unknown error"}
              </p>
              {error.digest ? (
                <p className="pt-2 font-mono text-[11px] text-[#8292a6]">digest {error.digest}</p>
              ) : null}
            </ErrorHint>
          ) : null}
        </TemplateErrorPage>
      </body>
    </html>
  );
}
