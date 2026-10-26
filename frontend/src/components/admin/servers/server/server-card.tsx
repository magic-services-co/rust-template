import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { LinkIcon, GripVertical } from 'lucide-react'
import { ServerActions } from '@/components/admin/servers/server-actions'
import { Badge } from '@/components/ui/badge'
import { Server } from '@/types/category'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface ServerCardProps {
    server: Server;
    isDragging?: boolean;
}

export function ServerCard({ server, isDragging }: ServerCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: server.server_id, data: { type: 'server' } })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            className={`transition-shadow ${isDragging ? 'shadow-lg' : 'shadow-none'}`}
        >
            <Card className={`transition-colors ${isDragging ? 'bg-accent' : 'hover:bg-accent'}`}>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <span {...listeners}>
                            <GripVertical size={16} className="mr-2 cursor-move" />
                        </span>
                        {server.server_name}
                        <Link
                            href={`https://www.battlemetrics.com/servers/rust/${server.server_id}`}
                            target="_blank"
                            className="ml-2"
                        >
                            <LinkIcon className="w-4 h-4" />
                        </Link>
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-row justify-between items-center gap-2">
                    <div className="flex flex-col gap-2">
                        <p className="text-sm text-gray-500">
                            ID: {server.server_id}
                        </p>
                        <HarmonyLink server={server} />
                    </div>
                    <ServerActions
                        serverId={server.server_id}
                        serverName={server.server_name}
                        enabled={server.enabled !== false}
                        serverImagePath={server.image_path ?? null}
                        serverAddress={server.server_address ?? null}
                        wipeSchedule={server.wipe_schedule ?? 'auto'}
                        currentMapThumbnailUrl={server.current_map_thumbnail_url ?? null}
                        pterodactylPanelId={server.pterodactyl_panel_id ?? null}
                        pterodactylServerIdentifier={server.pterodactyl_server_identifier ?? null}
                        tagIds={Array.isArray(server.tags) ? server.tags.map((tag) => Number(tag.id)).filter((id) => !Number.isNaN(id)) : []}
                    />
                </CardContent>
            </Card>
        </div>
    )
}

function frameworkLabel(runtime?: Server["mod_runtime"]): string | null {
    if (runtime === "carbon") return "Carbon"
    if (runtime === "oxide") return "Oxide"
    if (runtime === "vanilla") return "Vanilla"
    return null
}

function HarmonyLink({ server }: { server: Server }) {
    if (!server.harmony_status) return null

    const seen = server.harmony_seen_at ? new Date(server.harmony_seen_at) : null
    const seenLabel = seen && !Number.isNaN(seen.getTime()) ? seen.toLocaleString() : null
    const framework = frameworkLabel(server.mod_runtime)
    const version = server.harmony_version
        ? `MagicCore ${server.harmony_version}${framework ? ` · ${framework}` : ""}`
        : framework

    const statusClass =
        server.harmony_status === "connected"
            ? undefined
            : server.harmony_status === "stale"
                ? "border-amber-500 bg-amber-500/10 text-amber-500"
                : "border-zinc-500 bg-zinc-500/10 text-zinc-400"
    const statusText =
        server.harmony_status === "connected"
            ? "Connected"
            : server.harmony_status === "stale"
                ? "Stale"
                : "Not connected"
    const title =
        server.harmony_status === "offline"
            ? "MagicCore has not checked in"
            : seenLabel
                ? `Last check-in ${seenLabel}`
                : undefined

    return (
        <div className="flex flex-wrap items-center gap-1.5">
            <Badge
                variant={server.harmony_status === "connected" ? "active" : "outline"}
                className={statusClass}
                title={title}
            >
                {statusText}
            </Badge>
            {server.harmony_update_available ? (
                <Badge
                    variant="destructive"
                    title={server.harmony_latest ? `This site has MagicCore ${server.harmony_latest}` : "A newer MagicCore is on this site"}
                >
                    Out of date
                </Badge>
            ) : null}
            {version ? <span className="text-xs text-muted-foreground">{version}</span> : null}
        </div>
    )
}
