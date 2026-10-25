"use client";

import { Suspense } from "react";
import { redirect, useSearchParams } from "next/navigation";

import { usePublicFront } from "@/lib/public-front";

function ComparePage() {
  const front = usePublicFront();
  const steamId = useSearchParams().get("a") ?? "";
  const Board = front.slots.leaderboard;
  if (front.ready && !Board) redirect("/leaderboard");
  if (!Board) return null;
  return <Board section="compare" steamId={steamId} />;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ComparePage />
    </Suspense>
  );
}
