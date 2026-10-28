"use client";

import { Suspense } from "react";
import { redirect } from "next/navigation";

import { usePublicFront } from "@/lib/public-front";

function RankedPage() {
  const front = usePublicFront();
  const Board = front.slots.leaderboard;
  if (front.ready && !Board) redirect("/leaderboard");
  if (!Board) return null;
  return <Board section="ranked" />;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <RankedPage />
    </Suspense>
  );
}
