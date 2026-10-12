"use client";

import { ApiReferenceReact } from "@scalar/api-reference-react";
import "@scalar/api-reference-react/style.css";

const referenceCss = `
  .dark-mode {
    --scalar-background-1: #060608 !important;
    --scalar-background-2: #101014 !important;
    --scalar-background-3: #18181d !important;
  }
  .scalar-api-reference,
  .references-layout,
  .references-rendered {
    background: #060608 !important;
  }
  .references-layout {
    min-height: calc(100svh - 4rem) !important;
    height: auto !important;
    max-height: none !important;
    overflow: visible !important;
  }
  .references-rendered {
    height: auto !important;
    max-height: none !important;
    overflow: visible !important;
  }
  .t-doc__sidebar {
    top: 4rem !important;
    height: calc(100svh - 4rem) !important;
    max-height: calc(100svh - 4rem) !important;
    overflow-y: auto !important;
  }
  .sticky-cards,
  .operation-example-card {
    position: sticky;
    top: 5rem !important;
    max-height: calc(100svh - 6rem) !important;
    overflow-x: hidden !important;
    overflow-y: auto !important;
  }
  .sticky-cards .scalar-code-block,
  .operation-example-card .scalar-code-block {
    max-height: 24rem !important;
  }
`;

export function ApiReference() {
  return (
    <div className="-mx-4 -my-6 min-h-[calc(100svh-4rem)] bg-[#060608]">
      <ApiReferenceReact
        configuration={{
          url: "/api/admin/openapi.json",
          forceDarkModeState: "dark",
          hideDarkModeToggle: true,
          customCss: referenceCss,
          fetch: (input: RequestInfo | URL, init?: RequestInit) =>
            fetch(input, { ...init, credentials: "include" }),
        }}
      />
    </div>
  );
}
