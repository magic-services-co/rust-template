"use client"

import { TicketView } from "@/components/tickets/view-ticket"
import { SupportPageShell } from "@/components/support/support-page-shell"
import { SupportThemeProvider } from "@/components/support-theme-provider"
import { usePublicFront } from "@/lib/public-front"
import type { User } from "next-auth"

export function TicketPageClient({
  ticketId,
  currentUser,
  theme,
}: {
  ticketId: number
  currentUser: User
  theme?: Record<string, unknown>
}) {
  const Ticket = usePublicFront().slots.ticketView
  if (Ticket) return <Ticket ticketId={ticketId} currentUser={currentUser} />

  return (
    <SupportThemeProvider serverTheme={theme}>
      <SupportPageShell theme={theme}>
        <TicketView ticketId={ticketId} currentUser={currentUser} serverTheme={theme} />
      </SupportPageShell>
    </SupportThemeProvider>
  )
}
