import { NextResponse } from "next/server"

import { rustItemInfo, type RustItemInfo } from "@/lib/rust-items"

export const revalidate = 3600

const SOURCE = "https://looty.cc/api/rust-items"

export async function GET() {
    try {
        const response = await fetch(SOURCE, {
            headers: {
                Accept: "application/json",
                "User-Agent": "Mozilla/5.0 (compatible; RustTemplate/1.0)",
            },
            next: { revalidate: 3600 },
        })
        if (!response.ok) {
            return NextResponse.json({ message: "Could not load Rust items" }, { status: 502 })
        }
        const data = (await response.json()) as Parameters<typeof rustItemInfo>[0][]
        const items: RustItemInfo[] = Array.isArray(data)
            ? data.map(rustItemInfo).filter((item): item is RustItemInfo => item !== null)
            : []
        return NextResponse.json(items, {
            headers: { "Cache-Control": "no-store" },
        })
    } catch {
        return NextResponse.json({ message: "Could not load Rust items" }, { status: 502 })
    }
}
