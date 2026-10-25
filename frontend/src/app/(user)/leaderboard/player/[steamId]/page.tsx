"use client";

import { redirect, useParams } from "next/navigation";

import { usePublicFront } from "@/lib/public-front";

export default function PlayerPage() {
  const front = usePublicFront();
  const params = useParams<{ steamId: string }>();
  const steamId = typeof params.steamId === "string" ? params.steamId : "";
  const Board = front.slots.leaderboard;
  if (front.ready && !Board) redirect("/leaderboard");
  if (!Board || !steamId) return null;
  return <Board section="player" steamId={steamId} />;
}
