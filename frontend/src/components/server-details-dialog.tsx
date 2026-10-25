"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format, formatDistanceToNow, isValid, parseISO } from "date-fns";
import { Box, CheckIcon, CirclePlayIcon, CopyIcon } from "lucide-react";
import type { ServerData } from "@/hooks/use-server-data";
import { copyText } from "@/lib/copy-text";

const HARDCODED_RUSTMAPS_MAP_PAGE =
  "https://rustmaps.com/map/4ac7a25f40904c83a6bd162a9ef1f46b";
import { ServerRgtMapDialog } from "@/components/server-rgt-map-dialog";
import {
  getBattleMetricsRustMapThumbnail,
  getPhysgunRgtIframeUrlForServer,
  getPhysgunRgtIframeUrlFromMapFileUrl,
  getServerConnectAddress,
  rustMapsMapPageNeedsHtmlResolution,
} from "@/lib/server-card-helpers";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useWipes } from "@/hooks/use-wipes";
import { buildUpcomingWipesFromPattern, describeWipePattern } from "@/lib/wipe-pattern";

type ServerTheme = Record<string, unknown> | undefined;

function themeStr(t: ServerTheme, keys: string[], fallback: string): string {
  if (!t) return fallback;
  for (const k of keys) {
    const v = t[k];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return fallback;
}

export type ServerDetailsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ServerData;
  categoryName?: string;
  copyServerAddress: boolean;
  serverTheme?: ServerTheme;
};

export function ServerDetailsDialog({
  open,
  onOpenChange,
  data,
  categoryName,
  copyServerAddress,
  serverTheme,
}: ServerDetailsDialogProps) {
  const address = getServerConnectAddress(data);
  const isOnline = data.attributes.status.toLowerCase() === "online";
  const displayName = data.name || data.attributes.name || "Server";
  const subtitle = categoryName?.trim() || data.attributes.rust_description?.slice(0, 80) || "Server";

  const lastWipe = data.attributes.details?.rust_last_wipe;
  const nextWipe = data.attributes.details?.rust_next_wipe;

  const serverKey = data.server_id ?? data.id;
  const { data: wipesPayload } = useWipes(open ? serverKey : undefined, false);
  const wipeRows = wipesPayload?.data ?? [];

  const percentage = useMemo(() => {
    const max = data.attributes.maxPlayers || 1;
    return Math.min(100, (100 * (data.attributes.players || 0)) / max);
  }, [data]);

  const { dates: upcoming, pattern } = useMemo(
    () =>
      buildUpcomingWipesFromPattern({
        wipeRows,
        battlemetricsLast: lastWipe,
        battlemetricsNext: nextWipe,
        count: 4,
      }),
    [wipeRows, lastWipe, nextWipe],
  );

  const panelBg = themeStr(serverTheme, ["contentCardBackground", "cardBackground"], "rgba(14, 16, 20, 0.98)");
  const borderCol = themeStr(serverTheme, ["borderColor", "contentCardBorder"], "rgba(255, 255, 255, 0.1)");
  const muted = themeStr(serverTheme, ["wipeTextColor", "secondaryTextColor"], "#94a3b8");
  const titleC = themeStr(serverTheme, ["titleTextColor", "titleColor"], "#f8fafc");
  const accentNeutral = "hsl(240, 4%, 58%)";
  const accentOrange = "#f59e0b";
  const btnRadius = themeStr(serverTheme, ["buttonBorderRadius"], "0.5rem");
  const connectBg = themeStr(serverTheme, ["buttonPrimaryBackground", "buttonPrimaryBg"], "hsl(240, 4%, 46%)");
  const connectText = themeStr(serverTheme, ["buttonPrimaryText"], "#ffffff");
  const connectHover = themeStr(serverTheme, ["buttonPrimaryHover", "buttonPrimaryHoverBg"], "hsl(240, 4%, 56%)");
  const progressFill = themeStr(serverTheme, ["progressBarForeground"], "#a1a1aa");

  const dataForRustMap = useMemo((): ServerData => {
    if (data.mapVotes) return data;
    const details = data.attributes.details ?? {};
    return {
      ...data,
      attributes: {
        ...data.attributes,
        details: {
          ...details,
          rust_maps: { url: HARDCODED_RUSTMAPS_MAP_PAGE },
        },
      },
    };
  }, [data]);

  const map3dHref = data.mapVotes
    ? `/maps/${data.mapVotes.id}`
    : HARDCODED_RUSTMAPS_MAP_PAGE;

  const syncPhysgunRgtSrc = useMemo(
    () => getPhysgunRgtIframeUrlForServer(dataForRustMap),
    [dataForRustMap],
  );
  const [rgtOpen, setRgtOpen] = useState(false);

  const rustMapsPageUrl = dataForRustMap.attributes.details?.rust_maps?.url;
  const syncMapThumb = getBattleMetricsRustMapThumbnail(dataForRustMap);
  const [resolvedRustMaps, setResolvedRustMaps] = useState<{
    thumbnailUrl: string;
    iframeSrc: string;
  } | null>(null);

  useEffect(() => {
    if (!open) {
      setResolvedRustMaps(null);
      return;
    }
    const pageUrl = typeof rustMapsPageUrl === "string" ? rustMapsPageUrl.trim() : "";
    if (!pageUrl || !rustMapsMapPageNeedsHtmlResolution(pageUrl)) {
      setResolvedRustMaps(null);
      return;
    }
    if (syncPhysgunRgtSrc && syncMapThumb) {
      setResolvedRustMaps(null);
      return;
    }

    let cancelled = false;
    const ac = new AbortController();

    void (async () => {
      try {
        const res = await fetch(`/api/rustmaps/map-assets?url=${encodeURIComponent(pageUrl)}`, {
          signal: ac.signal,
        });
        if (!res.ok || cancelled) return;
        const j = (await res.json()) as {
          thumbnailUrl?: string;
          rgtMapUrl?: string;
        };
        if (cancelled || !j.rgtMapUrl) return;
        setResolvedRustMaps({
          thumbnailUrl: j.thumbnailUrl ?? "",
          iframeSrc: getPhysgunRgtIframeUrlFromMapFileUrl(j.rgtMapUrl),
        });
      } catch {
        /* abort or network */
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [open, rustMapsPageUrl, syncPhysgunRgtSrc, syncMapThumb, data.id, dataForRustMap]);

  const physgunRgtSrc = syncPhysgunRgtSrc ?? resolvedRustMaps?.iframeSrc ?? null;
  const usePhysgunPopup = Boolean(physgunRgtSrc);

  const mapPreviewSrc = syncMapThumb || resolvedRustMaps?.thumbnailUrl || "";
  const [mapImgFailed, setMapImgFailed] = useState(false);
  useEffect(() => {
    setMapImgFailed(false);
  }, [data.id, mapPreviewSrc]);
  const hasMapPreview = Boolean(mapPreviewSrc && !mapImgFailed);

  const map3dButtonClass =
    "inline-flex h-10 w-full max-w-[320px] items-center justify-center gap-2 rounded-md border text-sm font-semibold transition-colors sm:max-w-none";
  const map3dButtonStyle = {
    borderColor: accentNeutral,
    color: accentNeutral,
    backgroundColor: "rgba(113, 113, 122, 0.12)",
    borderRadius: btnRadius,
  } as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {physgunRgtSrc ? (
        <ServerRgtMapDialog
          open={rgtOpen}
          onOpenChange={setRgtOpen}
          iframeSrc={physgunRgtSrc}
          title={displayName}
        />
      ) : null}
      <DialogContent
        className="max-h-[min(92vh,880px)] max-w-[min(96vw,920px)] gap-0 overflow-y-auto border border-white/10 bg-[#12161c] p-0 shadow-2xl sm:rounded-xl"
        style={{ backgroundColor: panelBg, borderColor: borderCol }}
      >
        <DialogHeader className="border-b border-white/10 px-5 pb-4 pt-5 pr-12 text-left sm:px-6">
          <DialogTitle
            className="text-balance text-lg font-bold leading-snug tracking-tight sm:text-xl"
            style={{ color: titleC }}
          >
            {displayName}
          </DialogTitle>
          <DialogDescription className="text-sm" style={{ color: muted }}>
            {subtitle}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 p-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] sm:gap-8 sm:p-6">
          <div className="flex min-w-0 flex-col gap-3">
            <div
              className={cn(
                "relative aspect-square w-full max-w-[320px] overflow-hidden rounded-lg border border-[#232527] sm:max-w-none",
                hasMapPreview ? "bg-[#e8e6e1]" : "bg-zinc-900/90",
              )}
            >
              {hasMapPreview ? (
                <img
                  src={mapPreviewSrc}
                  alt="Rust map overview"
                  className="absolute inset-0 h-full w-full object-cover saturate-[1.15] contrast-[1.05] brightness-[1.02]"
                  draggable={false}
                  decoding="async"
                  onError={() => {
                    if (mapPreviewSrc) setMapImgFailed(true);
                  }}
                />
              ) : (
                <div
                  className="absolute inset-0 flex items-center justify-center px-4 text-center text-xs text-zinc-500"
                  aria-hidden
                >
                  No map preview
                </div>
              )}
              {hasMapPreview ? (
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/15" />
              ) : null}
              <div className="absolute bottom-2 right-2">
                <span
                  className={cn(
                    "rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                    isOnline
                      ? "border-emerald-500/60 bg-emerald-950/80 text-emerald-300"
                      : "border-red-500/50 bg-red-950/80 text-red-300",
                  )}
                >
                  {isOnline ? "Online" : "Offline"}
                </span>
              </div>
            </div>
            {usePhysgunPopup ? (
              <button
                type="button"
                className={map3dButtonClass}
                style={map3dButtonStyle}
                onClick={() => setRgtOpen(true)}
              >
                <Box className="h-4 w-4" aria-hidden />
                View 3D map
              </button>
            ) : (
              <Link
                href={map3dHref}
                target={data.mapVotes ? undefined : "_blank"}
                rel={data.mapVotes ? undefined : "noopener noreferrer"}
                className={map3dButtonClass}
                style={map3dButtonStyle}
              >
                <Box className="h-4 w-4" aria-hidden />
                View 3D map
              </Link>
            )}
          </div>

          <div className="flex min-w-0 flex-col gap-5">
            <div className="grid grid-cols-1 divide-y divide-white/10 rounded-lg border border-white/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <div className="flex flex-col gap-2 p-4">
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: muted }}>
                  Players
                </span>
                <span className="text-lg font-bold tabular-nums" style={{ color: progressFill }}>
                  {data.attributes.players} / {data.attributes.maxPlayers}
                </span>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${percentage}%`, backgroundColor: progressFill }}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1 p-4">
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: muted }}>
                  Last wipe
                </span>
                <span className="text-sm font-semibold" style={{ color: titleC }}>
                  {lastWipe && isValid(parseISO(lastWipe))
                    ? formatDistanceToNow(parseISO(lastWipe), { addSuffix: true })
                    : "—"}
                </span>
              </div>
              <div className="flex flex-col gap-1 p-4">
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: muted }}>
                  Next wipe
                </span>
                <span className="text-sm font-semibold" style={{ color: accentOrange }}>
                  {nextWipe && isValid(parseISO(nextWipe))
                    ? formatDistanceToNow(parseISO(nextWipe), { addSuffix: true })
                    : "—"}
                </span>
              </div>
            </div>

            <div>
              <h4 className="mb-3 text-[10px] font-semibold uppercase tracking-widest" style={{ color: muted }}>
                Upcoming wipes
              </h4>
              <ul className="divide-y divide-white/[0.08] rounded-md border border-white/10">
                {upcoming.map((d, i) => (
                  <li key={i} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                    <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-zinc-400">
                      Map
                    </span>
                    <span className="min-w-0 flex-1 font-medium" style={{ color: titleC }}>
                      {format(d, "EEE, MMM d")}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums" style={{ color: muted }}>
                      {formatDistanceToNow(d, { addSuffix: true })}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[10px] leading-snug opacity-80" style={{ color: muted }}>
                Schedule estimate: {describeWipePattern(pattern)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-white/10 p-5 sm:flex-row sm:items-stretch sm:justify-between sm:gap-3 sm:p-6">
          {copyServerAddress ? (
            <ModalCopyIp address={address} serverTheme={serverTheme} />
          ) : null}
          <a
            className={cn(
              "inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md text-sm font-semibold transition-colors",
              !copyServerAddress && "w-full sm:flex-none sm:px-10",
            )}
            style={{
              backgroundColor: connectBg,
              color: connectText,
              borderRadius: btnRadius,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = connectHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = connectBg;
            }}
            href={address ? `steam://connect/${address}` : "#"}
          >
            <CirclePlayIcon className="h-4 w-4 shrink-0" aria-hidden />
            Connect to server
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ModalCopyIp({ address, serverTheme }: { address: string; serverTheme?: ServerTheme }) {
  const [copied, setCopied] = useState(false);
  const borderCol = themeStr(serverTheme, ["buttonSecondaryBorder"], "rgba(255,255,255,0.14)");
  const bg = themeStr(serverTheme, ["buttonSecondaryBackground", "buttonSecondaryBg"], "transparent");
  const fg = themeStr(serverTheme, ["buttonSecondaryText"], "#cbd5e1");
  const hoverBg = themeStr(
    serverTheme,
    ["buttonSecondaryHoverBackground", "buttonSecondaryHoverBg"],
    "rgba(255,255,255,0.06)",
  );
  const radius = themeStr(serverTheme, ["buttonBorderRadius"], "0.5rem");
  const ok = themeStr(serverTheme, ["statusOnlineColor"], "#34d399");

  return (
    <button
      type="button"
      className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold transition-colors sm:w-auto"
      style={{
        backgroundColor: bg,
        color: fg,
        borderColor: borderCol,
        borderRadius: radius,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = hoverBg;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = bg;
      }}
      onClick={() => {
        void copyText(address).catch(() => undefined);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? (
        <CheckIcon className="h-4 w-4" style={{ color: ok }} aria-hidden />
      ) : (
        <CopyIcon className="h-4 w-4" aria-hidden />
      )}
      Copy IP
    </button>
  );
}
