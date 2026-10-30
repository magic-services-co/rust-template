"use client"

import { useEffect, useState, type FormEvent } from "react"
import { toast } from "sonner"
import { createApiKey, deleteApiKey, listApiKeys, updateApiKey } from "@/app/actions/api-keys"

const GAME_KEY_PERMISSIONS = { public: { siteData: { stats: true } } }
const box = "rounded-2xl border border-[#1e2939] bg-[#0b1120]/70"
const btn = "inline-flex items-center justify-center rounded-[10px] border border-[#364153] bg-[#1e2939] px-3 py-1.5 text-sm font-semibold disabled:opacity-60"
const btnPrimary = "inline-flex items-center justify-center rounded-[10px] bg-[#F042FA] px-4 py-2 text-sm font-bold disabled:opacity-60"
const btnDanger = "inline-flex items-center justify-center rounded-[10px] border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-sm font-semibold disabled:opacity-60"
const field = "h-10 rounded-[10px] border border-[#283548] bg-[#0b1120] px-3 text-sm outline-none"

type ApiKeyRow = {
  id: string
  key: string
  name: string
  description: string | null
  enabled: boolean
  permissions: unknown
  createdAt: string
}

function ago(value?: string | null) {
  if (!value) return "never"
  const then = new Date(value).getTime()
  if (Number.isNaN(then)) return "never"
  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000))
  if (seconds < 90) return `${seconds}s ago`
  if (seconds < 5400) return `${Math.round(seconds / 60)} min ago`
  if (seconds < 129600) return `${Math.round(seconds / 3600)} h ago`
  return `${Math.round(seconds / 86400)} days ago`
}

function hasStats(permissions: unknown) {
  return !!(permissions as { public?: { siteData?: { stats?: boolean } } } | null)?.public?.siteData?.stats
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState("")
  const [importName, setImportName] = useState("")
  const [importKey, setImportKey] = useState("")
  const [busy, setBusy] = useState<"create" | "import" | string | null>(null)
  const [revealed, setRevealed] = useState<string | null>(null)
  const [imported, setImported] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    const result = await listApiKeys()
    if (result.error) {
      setError(result.error)
      setKeys([])
    } else {
      setError(null)
      setKeys((result.data ?? []) as ApiKeyRow[])
    }
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  async function create(event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim().slice(0, 60)
    if (!trimmed) {
      setError("Give the key a name.")
      return
    }
    setBusy("create")
    setError(null)
    setImported(false)
    const result = await createApiKey({ name: trimmed, description: "Game plugins (stats)", permissions: GAME_KEY_PERMISSIONS })
    setBusy(null)
    if (result.error || !result.data) {
      setError(result.error ?? "Failed to create the key")
      return
    }
    const created = result.data as ApiKeyRow
    setRevealed(created.key)
    setName("")
    await load()
  }

  async function importExisting(event: FormEvent) {
    event.preventDefault()
    const key = importKey.trim()
    if (key.length < 16) {
      setError("That key is too short.")
      return
    }
    setBusy("import")
    setError(null)
    setRevealed(null)
    const result = await createApiKey({
      name: importName.trim().slice(0, 60) || "Game plugins",
      description: "Game plugins (stats)",
      permissions: GAME_KEY_PERMISSIONS,
      key,
    })
    setBusy(null)
    if (result.error) {
      setError(result.error)
      return
    }
    setImported(true)
    setImportName("")
    setImportKey("")
    await load()
  }

  async function toggle(row: ApiKeyRow) {
    setBusy(row.id)
    const result = await updateApiKey(row.id, { enabled: !row.enabled })
    setBusy(null)
    if (result.error) toast.error(result.error)
    await load()
  }

  async function remove(id: string) {
    setBusy(`delete:${id}`)
    const result = await deleteApiKey(id)
    setBusy(null)
    if (result.error) toast.error(result.error)
    await load()
  }

  return (
    <div className="api-keys flex flex-col gap-6">
      <style>{`
        .api-keys, .api-keys p, .api-keys span, .api-keys h2, .api-keys code { color: inherit; }
        .api-keys .k-title, .api-keys .k-strong { color: #fff !important; -webkit-text-fill-color: #fff !important; }
        .api-keys .k-body { color: #a0abbe !important; -webkit-text-fill-color: #a0abbe !important; }
        .api-keys .k-on { color: #6ee7b7 !important; -webkit-text-fill-color: #6ee7b7 !important; background: rgba(16, 185, 129, 0.15) !important; }
        .api-keys .k-off { color: #a0abbe !important; -webkit-text-fill-color: #a0abbe !important; background: #1e2939 !important; }
        .api-keys .k-stats { color: #f9a8fd !important; -webkit-text-fill-color: #f9a8fd !important; background: rgba(240, 66, 250, 0.15) !important; }
        .api-keys button.k-btn { color: #e2e8f0 !important; -webkit-text-fill-color: #e2e8f0 !important; background: #1e2939 !important; border-color: #364153 !important; }
        .api-keys button.k-primary { color: #fff !important; -webkit-text-fill-color: #fff !important; background: #F042FA !important; border-color: transparent !important; }
        .api-keys button.k-danger { color: #fca5a5 !important; -webkit-text-fill-color: #fca5a5 !important; background: rgba(239, 68, 68, 0.1) !important; border-color: rgba(239, 68, 68, 0.4) !important; }
        .api-keys input.k-field { color: #fff !important; -webkit-text-fill-color: #fff !important; background: #0b1120 !important; border-color: #283548 !important; }
        .api-keys input.k-field::placeholder { color: #64748b !important; -webkit-text-fill-color: #64748b !important; }
        .api-keys .k-ok { color: #6ee7b7 !important; -webkit-text-fill-color: #6ee7b7 !important; }
        .api-keys .k-bad { color: #fca5a5 !important; -webkit-text-fill-color: #fca5a5 !important; }
      `}</style>

      <section className={box}>
        <div className="border-b border-[#1e2939] px-5 py-4">
          <h2 className="k-title text-base font-bold">API keys</h2>
          <p className="k-body text-xs">The game plugins send stats with one of these keys (x-api-key). Keys are never shown again after creating.</p>
        </div>
        <div className="p-5">
          {loading ? <p className="k-body text-sm">Loading keys…</p> : keys.length ? (
            <ul className="divide-y divide-[#1e2939]">
              {keys.map((row) => (
                <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="k-strong font-semibold">
                      {row.name}
                      <span className={`ml-2 rounded-md px-2 py-0.5 text-[11px] font-bold uppercase ${row.enabled ? "k-on" : "k-off"}`}>{row.enabled ? "On" : "Off"}</span>
                      {hasStats(row.permissions) ? <span className="k-stats ml-1 rounded-md px-2 py-0.5 text-[11px] font-bold uppercase">Stats</span> : null}
                    </p>
                    <p className="k-body text-xs"><span className="font-mono">{row.key.slice(0, 8)}…</span> · created {ago(row.createdAt)}{row.description ? ` · ${row.description}` : ""}</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className={`${btn} k-btn`} disabled={busy === row.id} onClick={() => void toggle(row)}>{row.enabled ? "Turn off" : "Turn on"}</button>
                    <button type="button" className={`${btnDanger} k-danger`} disabled={busy === `delete:${row.id}`} onClick={() => void remove(row.id)}>Delete</button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="k-body text-sm">No keys yet. Create one or add the key the plugins already use.</p>
          )}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={box}>
          <div className="border-b border-[#1e2939] px-5 py-4">
            <h2 className="k-title text-base font-bold">New key</h2>
            <p className="k-body text-xs">Makes a fresh key with stats permission.</p>
          </div>
          <form className="flex flex-col gap-3 p-5" onSubmit={(event) => void create(event)}>
            <div className="flex flex-wrap gap-2">
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name, e.g. Game server" className={`${field} k-field min-w-[220px] flex-1`} />
              <button type="submit" className={`${btnPrimary} k-primary`} disabled={busy === "create"}>{busy === "create" ? "Please wait" : "Create key"}</button>
            </div>
            {revealed ? (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm">
                <p className="k-ok font-semibold">Copy it now. It is shown once.</p>
                <code className="k-strong mt-2 block select-all break-all rounded-lg bg-black/40 p-2 font-mono text-xs">{revealed}</code>
                <p className="k-body mt-2 text-xs">Put it in each plugin config under Website Stats → API key.</p>
              </div>
            ) : null}
          </form>
        </section>
        <section className={box}>
          <div className="border-b border-[#1e2939] px-5 py-4">
            <h2 className="k-title text-base font-bold">Add an existing key</h2>
            <p className="k-body text-xs">Paste the key that is already in the plugin configs, so nothing has to change in game.</p>
          </div>
          <form className="flex flex-col gap-3 p-5" onSubmit={(event) => void importExisting(event)}>
            <div className="flex flex-wrap gap-2">
              <input value={importName} onChange={(event) => setImportName(event.target.value)} placeholder="Name" className={`${field} k-field w-44`} />
              <input value={importKey} onChange={(event) => setImportKey(event.target.value)} type="password" autoComplete="off" placeholder="Existing key from the plugin configs" className={`${field} k-field min-w-[220px] flex-1`} />
              <button type="submit" className={`${btn} k-btn`} disabled={busy === "import"}>{busy === "import" ? "Please wait" : "Add existing key"}</button>
            </div>
            {imported ? <p className="k-ok text-sm">Key added. The plugins can send stats with it now.</p> : null}
          </form>
        </section>
      </div>
      {error ? <p className="k-bad text-sm">{error}</p> : null}
    </div>
  )
}
