function channel(value: number): number {
  const s = value / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

function parseHex(color: string): [number, number, number] | null {
  const match = color.trim().match(/^#?([0-9a-f]{6})$/i)
  if (!match) return null
  const n = parseInt(match[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function luminance(color: string): number | null {
  const rgb = parseHex(color)
  if (!rgb) return null
  return 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2])
}

function mix(from: string, to: string, amount: number): string {
  const a = parseHex(from)
  const b = parseHex(to)
  if (!a || !b) return from
  const ch = (left: number, right: number) => Math.round(left + (right - left) * amount)
  const n = (ch(a[0], b[0]) << 16) | (ch(a[1], b[1]) << 8) | ch(a[2], b[2])
  return `#${n.toString(16).padStart(6, "0")}`
}

export function contrastRatio(foreground: string, background: string): number | null {
  const a = luminance(foreground)
  const b = luminance(background)
  if (a === null || b === null) return null
  const lighter = Math.max(a, b)
  const darker = Math.min(a, b)
  return (lighter + 0.05) / (darker + 0.05)
}

export function readableText(color: string, background: string): string {
  if (!parseHex(color) || !parseHex(background)) return color
  const current = contrastRatio(color, background)
  if (current !== null && current >= 4.5) return color
  const toward = (luminance(background) ?? 0) > 0.4 ? "#111111" : "#ffffff"
  let next = color
  for (let step = 1; step <= 12; step++) {
    next = mix(color, toward, step / 12)
    const ratio = contrastRatio(next, background)
    if (ratio !== null && ratio >= 4.5) return next
  }
  return toward
}

export function roleBadgeColors(color: string): { color: string; backgroundColor: string; borderColor: string } | null {
  if (!parseHex(color)) return null
  const darkText = "#1c1917"
  const lightText = "#fffaf5"
  const darkRatio = contrastRatio(darkText, color) ?? 0
  const lightRatio = contrastRatio(lightText, color) ?? 0
  if (Math.max(darkRatio, lightRatio) >= 4.5) {
    return {
      color: darkRatio >= lightRatio ? darkText : lightText,
      backgroundColor: color,
      borderColor: color,
    }
  }
  const background = mix(color, "#3f0a0a", 0.55)
  return {
    color: readableText(lightText, background),
    backgroundColor: background,
    borderColor: background,
  }
}
