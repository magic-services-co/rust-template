"use client";

import { redirect } from "next/navigation";

import { usePublicFront } from "@/lib/public-front";

export default function SandboxPage() {
  const front = usePublicFront();
  const Board = front.slots.leaderboard;
  if (front.ready && !Board) redirect("/leaderboard");
  if (!Board) return null;
  return <Board section="sandbox" />;
}
