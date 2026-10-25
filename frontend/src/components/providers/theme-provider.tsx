"use client"

import * as React from "react"

const THEME_STORAGE_KEY = "theme"

type ThemeName = "light" | "dark" | "system"

function isThemeName(value: string): value is ThemeName {
    return value === "light" || value === "dark" || value === "system"
}

type ThemeContextValue = {
    theme: string
    setTheme: (theme: string) => void
    resolvedTheme: "light" | "dark"
    systemTheme: "light" | "dark"
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null)

function systemTheme(): "light" | "dark" {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function resolveTheme(theme: string): "light" | "dark" {
    if (theme === "dark" || theme === "light") return theme
    return systemTheme()
}

function applyTheme(theme: string) {
    const resolved = resolveTheme(theme)
    const root = document.documentElement
    root.classList.remove("light", "dark")
    root.classList.add(resolved)
    root.style.colorScheme = resolved
}

function withoutTransitions(run: () => void) {
    const style = document.createElement("style")
    style.appendChild(document.createTextNode(
        "*,*::before,*::after{-webkit-transition:none!important;transition:none!important}",
    ))
    document.head.appendChild(style)
    run()
    window.getComputedStyle(document.body)
    window.setTimeout(() => {
        style.remove()
    }, 1)
}

export function ThemeProvider({
    children,
    defaultTheme = "system",
    disableTransitionOnChange = false,
}: {
    children: React.ReactNode
    defaultTheme?: ThemeName
    disableTransitionOnChange?: boolean
    attribute?: string
    enableSystem?: boolean
}) {
    const [theme, setThemeState] = React.useState(defaultTheme)
    const [system, setSystem] = React.useState<"light" | "dark">("dark")

    const setTheme = React.useCallback((next: string) => {
        const themeName: ThemeName = isThemeName(next) ? next : defaultTheme
        const apply = () => {
            setThemeState(themeName)
            try {
                localStorage.setItem(THEME_STORAGE_KEY, themeName)
            } catch {
                /* storage can be blocked */
            }
            applyTheme(themeName)
        }
        if (disableTransitionOnChange) withoutTransitions(apply)
        else apply()
    }, [defaultTheme, disableTransitionOnChange])

    React.useEffect(() => {
        let stored = defaultTheme
        try {
            stored = (localStorage.getItem(THEME_STORAGE_KEY) as ThemeName | null) || defaultTheme
        } catch {
            stored = defaultTheme
        }
        setThemeState(stored)
        setSystem(systemTheme())
        applyTheme(stored)

        const media = window.matchMedia("(prefers-color-scheme: dark)")
        const onMedia = () => {
            const nextSystem = systemTheme()
            setSystem(nextSystem)
            const current = localStorage.getItem(THEME_STORAGE_KEY) || defaultTheme
            if (current === "system") applyTheme("system")
        }
        const onStorage = (event: StorageEvent) => {
            if (event.key !== THEME_STORAGE_KEY) return
            const next = event.newValue && isThemeName(event.newValue) ? event.newValue : defaultTheme
            setThemeState(next)
            applyTheme(next)
        }
        media.addEventListener("change", onMedia)
        window.addEventListener("storage", onStorage)
        return () => {
            media.removeEventListener("change", onMedia)
            window.removeEventListener("storage", onStorage)
        }
    }, [defaultTheme])

    const value = React.useMemo<ThemeContextValue>(() => ({
        theme,
        setTheme,
        resolvedTheme: theme === "system" ? system : resolveTheme(theme),
        systemTheme: system,
    }), [theme, setTheme, system])

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
    const value = React.useContext(ThemeContext)
    if (!value) {
        return {
            theme: "system",
            setTheme: () => {},
            resolvedTheme: "dark" as const,
            systemTheme: "dark" as const,
        }
    }
    return value
}
