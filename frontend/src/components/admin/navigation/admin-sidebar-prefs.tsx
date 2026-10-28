"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"

import type { AdminNavMainItem } from "@/components/admin/navigation/nav-main"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { useSession } from "@/lib/laravel-auth-react"

const STORAGE_PREFIX = "admin-sidebar-hidden:"

const DEFAULT_HIDDEN = [
  "Global Settings|#",
  "Settings|#",
  "System Control|#",
]

export function adminNavKey(title: string, url: string) {
  return `${title}|${url || "#"}`
}

type Section = { label: string; items: AdminNavMainItem[] }

type Prefs = {
  hidden: Set<string>
  sections: Section[]
  setVisible: (key: string, visible: boolean) => void
  showAll: () => void
  resetDefaults: () => void
}

const PrefsContext = createContext<Prefs | null>(null)

function readHidden(prefix: string, userId: string): string[] | null {
  try {
    const raw = localStorage.getItem(prefix + userId)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { hidden?: unknown }
    if (!parsed || !Array.isArray(parsed.hidden)) return null
    return parsed.hidden.filter((item): item is string => typeof item === "string")
  } catch {
    return null
  }
}

function writeHidden(prefix: string, userId: string, hidden: string[]) {
  localStorage.setItem(prefix + userId, JSON.stringify({ hidden }))
}

export function AdminSidebarPrefsProvider({
  sections,
  children,
  defaultHidden = DEFAULT_HIDDEN,
  storagePrefix = STORAGE_PREFIX,
}: {
  sections: Section[]
  children: ReactNode
  defaultHidden?: string[]
  storagePrefix?: string
}) {
  const { data: session, status } = useSession()
  const rawUserId = session?.user?.id
  const userId = typeof rawUserId === "string" || typeof rawUserId === "number" ? String(rawUserId) : ""
  const [hidden, setHidden] = useState<Set<string>>(() => new Set(defaultHidden))
  const [hydratedFor, setHydratedFor] = useState<string | null>(null)

  useEffect(() => {
    if (status === "loading") return
    const next = new Set(userId ? (readHidden(storagePrefix, userId) ?? defaultHidden) : defaultHidden)
    setHidden(next)
    setHydratedFor(userId || "anonymous")
  }, [status, userId, storagePrefix, defaultHidden])

  useEffect(() => {
    if (!userId || hydratedFor !== userId) return
    writeHidden(storagePrefix, userId, [...hidden])
  }, [hidden, hydratedFor, userId, storagePrefix])

  const value = useMemo<Prefs>(() => {
    const change = (key: string, visible: boolean) => {
      setHidden((current) => {
        const next = new Set(current)
        if (visible) next.delete(key)
        else next.add(key)
        return next
      })
    }
    return {
      hidden,
      sections,
      setVisible: change,
      showAll: () => setHidden(new Set()),
      resetDefaults: () => setHidden(new Set(defaultHidden)),
    }
  }, [hidden, sections, defaultHidden])

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>
}

export function useAdminSidebarPrefs() {
  const ctx = useContext(PrefsContext)
  if (!ctx) throw new Error("useAdminSidebarPrefs must be used in the admin sidebar")
  return ctx
}

export function SidebarCustomizeDialog({
  open,
  onOpenChange,
  title = "Sidebar",
  description = "Choose what stays in your admin menu. This is saved for your account on this browser.",
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
}) {
  const { hidden, sections, setVisible, showAll, resetDefaults } = useAdminSidebarPrefs()
  const listed = sections.filter((section) => section.items.length > 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          {listed.map((section) => (
            <div key={section.label} className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{section.label}</p>
              {section.items.map((item) => {
                const key = adminNavKey(item.title, item.url)
                return (
                  <div key={key}>
                    <label className="flex items-center justify-between gap-3 py-1.5">
                      <span className="text-sm">{item.title}</span>
                      <Switch
                        checked={!hidden.has(key)}
                        onCheckedChange={(on) => setVisible(key, on)}
                        aria-label={`Show ${item.title}`}
                      />
                    </label>
                    {item.items?.map((sub) => {
                      const subKey = adminNavKey(`${item.title}/${sub.title}`, sub.url)
                      const parentHidden = hidden.has(key)
                      return (
                        <label key={subKey} className="flex items-center justify-between gap-3 py-1 pl-4">
                          <span className="text-sm text-muted-foreground">{sub.title}</span>
                          <Switch
                            checked={!parentHidden && !hidden.has(subKey)}
                            disabled={parentHidden}
                            onCheckedChange={(on) => setVisible(subKey, on)}
                            aria-label={`Show ${sub.title}`}
                          />
                        </label>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={resetDefaults}>
            Use defaults
          </Button>
          <Button type="button" variant="outline" onClick={showAll}>
            Show everything
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
