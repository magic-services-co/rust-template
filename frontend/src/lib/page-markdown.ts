import MarkdownItCtor from "markdown-it"
import footnote from "markdown-it-footnote"
import multimdTable from "markdown-it-multimd-table"

type MarkdownIt = InstanceType<typeof MarkdownItCtor>

const LANGUAGE_LABELS: Record<string, string> = {
  cs: "C#",
  csharp: "C#",
  "c#": "C#",
  c: "C",
  cpp: "C / C++",
  "c++": "C / C++",
  json: "JSON",
  javascript: "JavaScript",
  js: "JavaScript",
  typescript: "TypeScript",
  ts: "TypeScript",
  python: "Python",
  py: "Python",
  ruby: "Ruby",
  rb: "Ruby",
  php: "PHP",
  css: "CSS",
  html: "HTML",
  xml: "XML",
  sql: "SQL",
  lua: "Lua",
  swift: "Swift",
  perl: "Perl",
  latex: "LaTeX",
  text: "Plain text",
  txt: "Plain text",
  plain: "Plain text",
  plaintext: "Plain text",
  auto: "Automatic highlighting",
}

const CALLOUT_LABELS: Record<string, string> = {
  note: "Note",
  tip: "Tip",
  warning: "Warning",
  spoiler: "Spoiler",
}

type SlugEnv = { slugs: Map<string, number> }

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function plainText(token: { children?: { content?: string }[] | null; content?: string }) {
  if (token.children?.length) return token.children.map((child) => child.content || "").join("")
  return token.content || ""
}

function slugify(value: string, env: SlugEnv) {
  const base = value
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "section"
  const seen = env.slugs.get(base) ?? 0
  env.slugs.set(base, seen + 1)
  return seen === 0 ? base : `${base}-${seen}`
}

function calloutRule(state: any, startLine: number, endLine: number, silent: boolean) {
  const start = state.bMarks[startLine] + state.tShift[startLine]
  const max = state.eMarks[startLine]
  const line = state.src.slice(start, max)
  const match = /^(:{3,})[ \t]+(note|tip|warning|spoiler)(?:[ \t]+(.*))?$/i.exec(line)
  if (!match) return false
  const marker = match[1]
  let close = startLine + 1
  while (close < endLine) {
    const from = state.bMarks[close] + state.tShift[close]
    const to = state.eMarks[close]
    if (state.src.slice(from, to).trim() === marker) break
    close += 1
  }
  if (close >= endLine) return false
  if (silent) return true

  const kind = match[2].toLowerCase()
  const title = (match[3] || "").trim().replace(/^[—–-]\s*/, "")
  const open = state.push("callout_open", kind === "spoiler" ? "details" : "div", 1)
  open.block = true
  open.info = kind
  open.markup = marker
  open.map = [startLine, close]
  if (title) open.attrSet("data-title", title)

  const parent = state.parentType
  state.parentType = "callout"
  state.md.block.tokenize(state, startLine + 1, close)
  state.parentType = parent

  const end = state.push("callout_close", open.tag, -1)
  end.block = true
  end.info = kind
  state.line = close + 1
  return true
}

function copyChipRule(state: any, silent: boolean) {
  if (silent) return false
  const match = /^\[copy:([^\]]+)\]/.exec(state.src.slice(state.pos))
  if (!match) return false
  const token = state.push("copy_chip", "", 0)
  token.content = match[1]
  state.pos += match[0].length
  return true
}

function taskLists(state: { tokens: any[] }) {
  const tokens = state.tokens
  for (let index = 0; index < tokens.length; index += 1) {
    if (tokens[index].type !== "inline") continue
    const paragraph = tokens[index - 1]
    const item = tokens[index - 2]
    if (!paragraph || paragraph.type !== "paragraph_open" || !item || item.type !== "list_item_open") continue
    const children = tokens[index].children || []
    const first = children[0]
    if (!first || first.type !== "text") continue
    const match = /^\[([ xX])\][ \t]+/.exec(first.content || "")
    if (!match) continue
    first.content = first.content.slice(match[0].length)
    item.attrSet("class", "cms-task")
    item.attrSet("data-checked", match[1].toLowerCase() === "x" ? "true" : "false")
  }
}

function withClass(md: MarkdownIt, rule: string, className: string) {
  const previous = md.renderer.rules[rule]
  md.renderer.rules[rule] = (tokens: any, idx: number, options: any, env: any, self: any) => {
    tokens[idx].attrJoin("class", className)
    if (previous) return previous(tokens, idx, options, env, self)
    return self.renderToken(tokens, idx, options)
  }
}

function createMarkdown() {
  const md = new MarkdownItCtor({
    html: false,
    linkify: true,
    breaks: true,
    typographer: false,
  })
  const utils = md.utils as unknown as { assign?: typeof Object.assign }
  if (typeof utils.assign !== "function") utils.assign = Object.assign
  md.use(footnote as (parser: MarkdownIt) => void)
  md.use(multimdTable as unknown as (parser: MarkdownIt, options?: object) => void, { multiline: true, rowspan: false, headerless: true })
  md.block.ruler.before("fence", "callout", calloutRule)
  md.inline.ruler.before("link", "copy_chip", copyChipRule)
  md.core.ruler.after("inline", "task_lists", taskLists)

  md.renderer.rules.heading_open = (tokens, idx, _options, env) => {
    const token = tokens[idx]
    const level = Number(token.tag.slice(1))
    const inline = tokens[idx + 1]
    const id = slugify(plainText(inline || token), (env as SlugEnv | undefined) ?? { slugs: new Map() })
    if (level <= 2) {
      return `<${token.tag} id="${escapeHtml(id)}" class="cms-h${level}"><a class="cms-heading-link" href="#${escapeHtml(id)}">`
    }
    return `<${token.tag} id="${escapeHtml(id)}" class="cms-h${level}">`
  }
  md.renderer.rules.heading_close = (tokens, idx) => {
    const level = Number(tokens[idx].tag.slice(1))
    return level <= 2 ? `</a></${tokens[idx].tag}>` : `</${tokens[idx].tag}>`
  }
  md.renderer.rules.fence = (tokens, idx) => {
    const token = tokens[idx]
    const lang = (token.info || "").trim().split(/\s+/)[0]?.toLowerCase() || ""
    const label = LANGUAGE_LABELS[lang]
    const className = lang ? ` class="language-${escapeHtml(lang)}"` : ""
    const pre = `<pre class="cms-pre"><code${className}>${escapeHtml(token.content)}</code></pre>`
    if (!label) return pre
    return `<div class="cms-codeblock"><div class="cms-codeblock-label">${escapeHtml(label)}</div>${pre}</div>`
  }
  md.renderer.rules.code_inline = (tokens, idx) => `<code class="cms-code">${escapeHtml(tokens[idx].content)}</code>`
  md.renderer.rules.paragraph_open = (tokens, idx) => (tokens[idx].hidden ? "" : `<p class="cms-p">`)
  md.renderer.rules.copy_chip = (tokens, idx) => {
    const text = tokens[idx].content
    return `<button type="button" class="cms-copy" data-copy="${escapeHtml(text)}"><span>${escapeHtml(text)}</span></button>`
  }
  md.renderer.rules.callout_open = (tokens, idx) => {
    const kind = tokens[idx].info || "note"
    const title = String(tokens[idx].attrGet("data-title") || "")
    if (kind === "spoiler") {
      return `<details class="cms-spoiler"><summary>${escapeHtml(title || "Reveal hidden contents")}</summary>`
    }
    return `<div class="cms-callout cms-callout-${escapeHtml(kind)}"><div class="cms-callout-label">${escapeHtml(CALLOUT_LABELS[kind] || "Note")}</div>`
  }
  md.renderer.rules.callout_close = (tokens, idx) => (tokens[idx].info === "spoiler" ? "</details>" : "</div>")

  withClass(md, "bullet_list_open", "cms-ul")
  withClass(md, "ordered_list_open", "cms-ol")
  withClass(md, "blockquote_open", "cms-quote")
  withClass(md, "table_open", "cms-table")
  withClass(md, "hr", "cms-hr")
  const imageOpen = md.renderer.rules.image
  md.renderer.rules.image = (tokens, idx, options, env, self) => {
    tokens[idx].attrJoin("class", "cms-img")
    if (imageOpen) return imageOpen(tokens, idx, options, env, self)
    return self.renderToken(tokens, idx, options)
  }
  const linkOpen = md.renderer.rules.link_open
  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const href = String(tokens[idx].attrGet("href") || "")
    if (!/^(https?:|mailto:|#|\/)/i.test(href)) tokens[idx].attrSet("href", "#")
    tokens[idx].attrJoin("class", "cms-a")
    if (/^https?:/i.test(href)) {
      tokens[idx].attrSet("target", "_blank")
      tokens[idx].attrSet("rel", "noopener noreferrer")
    }
    if (linkOpen) return linkOpen(tokens, idx, options, env, self)
    return self.renderToken(tokens, idx, options)
  }
  return md
}

const markdown = createMarkdown()

export function renderPageMarkdown(source: string) {
  return markdown.render(source || "", { slugs: new Map<string, number>() } satisfies SlugEnv)
}
