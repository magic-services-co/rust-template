import type { ComponentType } from "react"

import type { AdminAddonPageProps, PublicFrontDefinition } from "@/lib/public-front-types"

export type ResolvedAdminAddonPage = {
  id: string
  path: string
  params: Record<string, string>
  Component: ComponentType<AdminAddonPageProps>
}

export type ResolvedAdminAddonPanel = ResolvedAdminAddonPage & {
  key: string
}

export type ResolvedAdminAddonPages = {
  page: ResolvedAdminAddonPage | null
  panels: ResolvedAdminAddonPanel[]
}

type CompiledPattern = {
  raw: string
  re: RegExp
  names: string[]
  score: number
}

function normalizeAdminPath(value: string): string {
  const path = value.split("?")[0]?.split("#")[0] ?? ""
  const withoutAdmin = path.startsWith("/admin") ? path.slice("/admin".length) : path.replace(/^\//, "")
  return withoutAdmin.replace(/^\/+|\/+$/g, "")
}

function compilePattern(pattern: string): CompiledPattern {
  const normalized = normalizeAdminPath(pattern)
  const parts = normalized === "" ? [] : normalized.split("/")
  const names: string[] = []
  let score = parts.length
  const body = parts
    .map((part) => {
      if (part === "**") return ".*"
      if (part === "*") {
        score += 1
        return "[^/]+"
      }
      const named = part.match(/^\[([A-Za-z0-9_]+)\]$/) ?? part.match(/^:([A-Za-z0-9_]+)$/)
      if (named?.[1]) {
        names.push(named[1])
        score += 2
        return "([^/]+)"
      }
      score += 5
      return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    })
    .join("/")
  return {
    raw: normalized,
    re: new RegExp(`^${body}$`),
    names,
    score,
  }
}

export function matchAdminAddonPath(pathname: string, pattern: string): { params: Record<string, string>; score: number } | null {
  const compiled = compilePattern(pattern)
  const target = normalizeAdminPath(pathname)
  const match = compiled.re.exec(target)
  if (!match) return null
  const params: Record<string, string> = {}
  compiled.names.forEach((name, index) => {
    params[name] = decodeURIComponent(match[index + 1] ?? "")
  })
  return { params, score: compiled.score }
}

export function resolveAdminAddonPages(pathname: string, fronts: PublicFrontDefinition[]): ResolvedAdminAddonPages {
  let page: (ResolvedAdminAddonPage & { score: number }) | null = null
  const panels: ResolvedAdminAddonPanel[] = []

  for (const front of fronts) {
    for (const entry of front.adminPages ?? []) {
      const matched = matchAdminAddonPath(pathname, entry.path)
      if (!matched) continue
      if (entry.page && (!page || matched.score >= page.score)) {
        page = {
          id: front.id,
          path: entry.path,
          params: matched.params,
          Component: entry.page,
          score: matched.score,
        }
      }
      entry.panels?.forEach((Component, index) => {
        panels.push({
          id: front.id,
          path: entry.path,
          params: matched.params,
          Component,
          key: `${front.id}:${entry.path}:${index}`,
        })
      })
    }
  }

  if (!page) return { page: null, panels }
  return {
    page: {
      id: page.id,
      path: page.path,
      params: page.params,
      Component: page.Component,
    },
    panels,
  }
}
