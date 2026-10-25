"use client"

import { createContext, useContext, type ComponentType, type ReactNode } from "react"

import { installedFronts } from "@/addons/installed"
import { useAddonsManifest } from "@/hooks/use-addons-manifest"
import type { PublicFrontSlots } from "@/lib/public-front-types"

type PublicFrontState = {
  id: string | null
  ready: boolean
  slots: PublicFrontSlots
}

const emptySlots: PublicFrontSlots = {}

const PublicFrontContext = createContext<PublicFrontState>({
  id: null,
  ready: false,
  slots: emptySlots,
})

function frontFor(ids: string[] | null, initialId: string | null) {
  if (ids) return installedFronts.find((front) => ids.includes(front.id)) ?? null
  if (!initialId) return null
  return installedFronts.find((front) => front.id === initialId) ?? null
}

export function PublicFrontProvider({
  children,
  initialId = null,
}: {
  children: ReactNode
  initialId?: string | null
}) {
  const manifest = useAddonsManifest()
  const ids = manifest.data ? manifest.data.addons.map((addon) => addon.id) : null
  const front = frontFor(ids, initialId)

  return (
    <PublicFrontContext.Provider
      value={{
        id: front?.id ?? null,
        ready: manifest.isFetched || initialId !== undefined,
        slots: front?.slots ?? emptySlots,
      }}
    >
      {children}
    </PublicFrontContext.Provider>
  )
}

export function usePublicFront() {
  return useContext(PublicFrontContext)
}

/** Slot from the active front, including pages rendered outside the provider. */
export function usePublicFrontSlot<K extends keyof PublicFrontSlots>(name: K) {
  const front = usePublicFront()
  const manifest = useAddonsManifest()
  const installed = installedFronts.find((item) =>
    manifest.data?.addons.some((addon) => addon.id === item.id),
  )?.slots[name]
  return {
    slot: (front.slots[name] ?? installed) as PublicFrontSlots[K] | undefined,
    ready: front.ready || manifest.isFetched || manifest.isError,
  }
}

export function PublicFrontSlot({
  name,
  children,
  ...props
}: {
  name: keyof PublicFrontSlots
  children?: ReactNode
} & Record<string, unknown>) {
  const front = usePublicFront()
  const Slot = front.slots[name] as ComponentType<Record<string, unknown>> | undefined
  if (!front.ready || !Slot) return null
  return <Slot {...props}>{children}</Slot>
}

/** Renders an installed addon's page, or the template page passed as children. */
export function PublicFrontSwitch({
  name,
  slotProps,
  children,
}: {
  name: keyof PublicFrontSlots
  slotProps?: object
  children: ReactNode
}) {
  const front = usePublicFront()
  const Slot = front.slots[name] as ComponentType<Record<string, unknown>> | undefined
  if (front.ready && Slot) return <Slot {...((slotProps ?? {}) as Record<string, unknown>)} />
  return children
}
