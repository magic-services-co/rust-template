"use client";

import { cn } from "@/lib/utils";
import { ServerData, ServerTag } from "@/hooks/use-server-data";
import { getServerConnectAddress } from "@/lib/server-card-helpers";
import { copyText } from "@/lib/copy-text";
import { CheckIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import Link from "next/link";
import { ServerDetailsDialog } from "./server-details-dialog";
import { populationPercent, queuedPlayers, serverRegion } from "@/lib/server-display";
import { wipeScheduleShortLabel } from "@/lib/wipe-schedule-presets";
import { HomeCardCorners } from "@/components/home/home-card-corners";

export default function Server({
  data,
  copyServerAddress,
  categoryName,
  tags = [],
  featured = false,
}: {
  data: ServerData;
  copyServerAddress: boolean;
  categoryName?: string;
  tags?: ServerTag[];
  featured?: boolean;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const percentage = useMemo(
    () => populationPercent(data.attributes.players || 0, data.attributes.maxPlayers || 0),
    [data],
  );
  const queued = useMemo(
    () => queuedPlayers(data.attributes.players || 0, data.attributes.maxPlayers || 0),
    [data],
  );
  const isOnline = data.attributes.status.toLowerCase() === "online";
  const displayName = data.name || data.attributes.name;
  const region = serverRegion(categoryName);
  const lastWipe = data.attributes.details?.rust_last_wipe;
  const connectAddress = getServerConnectAddress(data);

  const openDetails = () => setDetailsOpen(true);
  const onKeyOpenDetails = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openDetails();
    }
  };

  const handleConnect = () => {
    if (copyServerAddress && connectAddress) {
      void copyText(connectAddress).catch(() => undefined);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      return;
    }
    if (connectAddress) {
      window.location.href = `steam://connect/${connectAddress}`;
    }
  };

  return (
    <TooltipProvider delayDuration={280}>
      <article
        className={cn("server-card relative flex min-h-[211px] flex-col overflow-visible border p-[17px]")}
        style={{
          borderColor: featured ? "rgba(214,168,80,0.47)" : "rgba(165,177,187,0.17)",
          backgroundImage: featured
            ? "linear-gradient(146.62deg, rgba(46, 39, 20, 0.65) 0%, rgba(24, 24, 18, 0.8) 32.5%, rgba(9, 13, 16, 0.94) 65%)"
            : "linear-gradient(146.62deg, rgba(17, 24, 29, 0.93) 0%, rgba(7, 11, 15, 0.94) 100%)",
        }}
      >
        <ServerDetailsDialog
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          data={data}
          categoryName={tags.length > 0 ? tags.map((tag) => tag.name).join(" · ") : categoryName}
          copyServerAddress={copyServerAddress}
        />

        <div
          role="button"
          tabIndex={0}
          className="flex min-h-0 flex-1 flex-col outline-none"
          onClick={openDetails}
          onKeyDown={onKeyOpenDetails}
          aria-label={`View details for ${displayName ?? "server"}`}
        >
          <div className="relative flex min-h-[13px] items-center justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 opacity-50">
              {tags.length > 0 ? (
                tags.map((tag) => (
                  <span key={tag.id} className="inline-flex items-center gap-[5px]">
                    {tag.image ? (
                      <img src={tag.image} alt="" className="h-4 w-6 rounded-[1px] object-cover" />
                    ) : (
                      <span className="size-2 rounded-[1px] bg-[#eef4fb]/40" />
                    )}
                    <span className="server-card-meta text-[8px] tracking-[1px] text-[#eef4fb]">{tag.name.toUpperCase()}</span>
                  </span>
                ))
              ) : (
                <>
                  {region.flag ? (
                    <img src={region.flag} alt="" className="size-2 rounded-[1px] object-cover" />
                  ) : (
                    <span className="size-2 rounded-[1px] bg-[#eef4fb]/40" />
                  )}
                  <span className="server-card-meta text-[8px] tracking-[1px] text-[#eef4fb]">{region.label}</span>
                </>
              )}
            </div>
            {featured ? (
              <div className="absolute left-1/2 top-[0.5px] flex -translate-x-1/2 items-center gap-2">
                <span className="h-px w-6 bg-[#8b6c32]" />
                <span className="text-[8px] tracking-[1px] text-[#d6a850]">YOUR FAVOURITE</span>
                <span className="h-px w-6 bg-[#8b6c32]" />
              </div>
            ) : null}
            <div className="flex items-center gap-1.5 opacity-50">
              <span
                className="size-1 rounded-[2.5px]"
                style={{
                  backgroundColor: isOnline ? "#60c781" : "#e8a0a3",
                  boxShadow: isOnline ? "0 0 8px #60c781" : "none",
                }}
              />
              <span className="server-card-muted text-[8px] text-[#a5b1bb]">{isOnline ? "Online" : "Offline"}</span>
            </div>
          </div>

          <div className="pt-[27px]">
            <h3 className="server-card-name text-[21px] font-medium leading-[31.5px] tracking-[-0.7px] text-[#eef4fb]">
              {displayName}
            </h3>
            <p className="server-card-muted pt-1.5 text-[9px] leading-[13.5px] text-[#a5b1bb]">
              {wipeScheduleShortLabel(data.wipe_schedule)}
            </p>
          </div>

          <div className="server-card-divider mt-3 border-t border-[rgba(160,183,202,0.1)] pt-3">
            <div className="flex items-end justify-between">
              <p className="server-card-count text-[#eef4fb]">
                <span className="text-[17px] font-medium leading-[25.5px]">{data.attributes.players} </span>
                <span className="server-card-muted text-[11px] leading-[16.5px] text-[#a5b1bb]">/ {data.attributes.maxPlayers}</span>
              </p>
              {queued > 0 ? (
                <p className="server-card-count text-[8px] leading-3 text-[#eef4fb]">{queued} queued</p>
              ) : null}
            </div>
            <div className="server-card-bar-track mt-[9px] h-[3px] w-full bg-[#26313a]">
              <div
                className="server-card-bar-fill h-[3px] bg-gradient-to-r from-[#aa8137] to-[#e2b84f]"
                style={{
                  width: `${percentage}%`,
                  boxShadow: percentage > 0 ? "0 0 9px rgba(214,168,80,0.54)" : undefined,
                }}
              />
            </div>
          </div>

          <div className="pt-3 text-[9px] leading-[13.5px]">
            <span className="server-card-muted text-[7px] tracking-[1px] text-[#a5b1bb]">LAST WIPE</span>
            {lastWipe ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="server-card-meta cursor-help pl-1.5 text-[#b6c1ca]">
                    {" "}Wiped {formatDistanceToNow(lastWipe, { addSuffix: true })}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {format(lastWipe, "MMM d, yyyy h:mm a")}
                </TooltipContent>
              </Tooltip>
            ) : (
              <span className="server-card-meta pl-1.5 text-[#b6c1ca]">Unknown</span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-[13px]">
          {data.mapVotes ? (
            <Link
              href={`/maps/${data.mapVotes.id}`}
              onClick={(e) => e.stopPropagation()}
              className="server-card-muted inline-flex items-center gap-2 text-[9px] leading-[13.5px] text-[#a5b1bb] hover:text-[#eef4fb]"
            >
              Map Vote
              <img src="/images/servers/map-vote.svg" alt="" className="size-[17px]" />
            </Link>
          ) : (
            <span />
          )}
          <button
            type="button"
            className="ghost server-card-connect inline-flex items-center gap-2 text-[9px] leading-[13.5px] text-[#d6a850]"
            onClick={(e) => {
              e.stopPropagation();
              handleConnect();
            }}
          >
            {copied ? "Copied" : "Client Connect"}
            {copied ? (
              <CheckIcon className="size-[17px] text-[#60c781]" />
            ) : (
              <img src="/images/servers/connect.svg" alt="" className="size-[17px]" />
            )}
          </button>
        </div>
        <HomeCardCorners color={featured ? "#d6a850" : "#ba9142"} show />
      </article>
    </TooltipProvider>
  );
}
