import { cn } from '@/lib/utils'

export type PanelDriver = 'pterodactyl' | 'pelican' | 'calagopus'

const PANEL_DRIVER_IMAGES: Record<PanelDriver, string> = {
    pterodactyl: '/images/panels/pterodactyl.svg',
    pelican: '/images/panels/pelican.svg',
    calagopus: '/images/panels/calagopus.svg',
}

const PANEL_DRIVER_CHIP: Record<PanelDriver, string> = {
    pterodactyl: 'bg-white',
    pelican: 'bg-white',
    calagopus: 'bg-zinc-900',
}

type PanelDriverMarkProps = {
    driver: PanelDriver
    label?: string
    className?: string
}

export function PanelDriverMark({ driver, label, className }: PanelDriverMarkProps) {
    return (
        <span className={cn('inline-flex min-w-0 items-center gap-2', className)}>
            <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-sm p-0.5', PANEL_DRIVER_CHIP[driver])}>
                <img src={PANEL_DRIVER_IMAGES[driver]} alt="" className="h-full w-full object-contain" />
            </span>
            {label ? <span className="truncate">{label}</span> : null}
        </span>
    )
}

export function panelDriverFromLabel(driver?: string | null): PanelDriver {
    if (driver === 'pelican' || driver === 'calagopus' || driver === 'pterodactyl') return driver
    return 'pterodactyl'
}
