"use client";

import { redirect, useParams } from "next/navigation";

import { usePublicFront } from "@/lib/public-front";

export default function MatchRoute() {
  const front = usePublicFront();
  const params = useParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : "";
  const Board = front.slots.leaderboard;
  if (front.ready && !Board) redirect("/leaderboard");
  if (!Board || !id) return null;
  return <Board section="match" matchId={id} />;
}
