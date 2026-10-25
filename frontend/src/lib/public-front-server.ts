import { installedFrontIds } from "@/addons/installed-ids"
import { backendApi } from "@/lib/api"

export async function activeFrontId(): Promise<string | null> {
  try {
    const res = await fetch(backendApi("addons"), {
      headers: { Accept: "application/json" },
      cache: "no-store",
    })
    if (!res.ok) return null
    const data = (await res.json()) as { addons?: { id?: string }[] }
    const enabled = new Set(
      (data.addons ?? []).map((addon) => addon.id).filter((id): id is string => typeof id === "string" && id !== ""),
    )
    return installedFrontIds.find((id) => enabled.has(id)) ?? null
  } catch {
    return null
  }
}
