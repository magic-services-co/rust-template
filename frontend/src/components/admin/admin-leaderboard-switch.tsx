"use client"

import type { ReactNode } from "react"

import { usePublicFrontSlot } from "@/lib/public-front"

export function AdminLeaderboardSwitch({ children }: { children: ReactNode }) {
  const { slot: Slot, ready } = usePublicFrontSlot("adminLeaderboard")
  if (!ready) return null
  if (Slot) return <Slot />
  return children
}
