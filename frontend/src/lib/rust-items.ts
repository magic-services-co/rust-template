export type RustItemInfo = {
    shortname: string
    name: string
    imageUrl: string
    durability: boolean
    conditionMax: number
    stackable: number
}

type LootyRustItem = {
    shortname?: string
    Name?: string
    imageUrl?: string
    Durability?: boolean
    stackable?: number
    condition?: { max?: number; hideConditionBar?: boolean }
}

export function rustItemInfo(item: LootyRustItem): RustItemInfo | null {
    const shortname = String(item.shortname ?? "").trim().toLowerCase()
    if (!shortname) return null
    const durability = Boolean(item.Durability) && item.condition?.hideConditionBar !== true
    const max = Number(item.condition?.max)
    return {
        shortname,
        name: String(item.Name || shortname),
        imageUrl: String(item.imageUrl || `https://cdn.looty.cc/Items/${encodeURIComponent(shortname)}.png`),
        durability,
        conditionMax: durability ? (max > 0 ? max : 100) : 0,
        stackable: Number(item.stackable) > 0 ? Number(item.stackable) : 1,
    }
}

export function rustItemMap(items: RustItemInfo[]): Map<string, RustItemInfo> {
    return new Map(items.map((item) => [item.shortname, item]))
}
