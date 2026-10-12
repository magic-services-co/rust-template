"use client"
import { type AppTableFeatures } from "@/lib/table-features"

import { ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { getActionLabel } from "@/lib/admin-log"

export interface AdminLog {
    id: string
    action: string
    details: any
    timestamp: Date
    user: {
        id: string
        name: string | null
        image: string | null
    } | null
    targetUser?: TargetUser | null
    role?: Role | null
}

type TargetUser = {
    id: string
    name: string | null
    image: string | null
    steamId?: string | null
}

type Role = {
    id: string
    name: string
    color: string
}

export const columns: ColumnDef<AppTableFeatures, AdminLog>[] = [
    {
        accessorKey: "user",
        header: "Admin",
        cell: ({ row }) => {
            const user = row.original.user;
            if (!user) return <span className="text-muted-foreground">System</span>
            return (
                <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={user.image ?? ""} alt={user.name ?? ""} />
                        <AvatarFallback>
                            {user.name?.charAt(0) ?? "U"}
                        </AvatarFallback>
                    </Avatar>
                    <span>{user.name}</span>
                </div>
            )
        },
    },
    {
        accessorKey: "action",
        header: "Action",
        cell: ({ row }) => {
            const action = row.original.action ?? ''
            const isPageView = action.startsWith('PAGE_VIEW ')
            const actionLabel = getActionLabel(action)

            if (isPageView) {
                const path = action.replace(/^PAGE_VIEW\s+/, '')
                return (
                    <span className="flex flex-col gap-0.5">
                        <Badge variant="secondary" className="w-fit">Page view</Badge>
                        <span className="text-muted-foreground font-mono text-xs">{path}</span>
                    </span>
                )
            }
            if (actionLabel) {
                return (
                    <Badge variant="outline" className="capitalize">
                        {actionLabel}
                    </Badge>
                )
            }
            if (/^(GET|POST|PUT|PATCH|DELETE)\s+\//.test(action)) {
                return (
                    <span className="font-mono text-xs break-all" title={action}>
                        {action}
                    </span>
                )
            }
            return (
                <Badge variant="outline" className={cn(
                    "capitalize",
                    action === "ROLE_ASSIGNED" && "bg-green-500/15 border-green-500 text-green-500",
                    action === "ROLE_REVOKED" && "bg-red-500/15 border-red-500 text-red-500",
                )}>
                    {action?.toLowerCase().replace(/_/g, ' ')}
                </Badge>
            )
        },
    },
    {
        accessorKey: "targetUser",
        header: "User",
        cell: ({ row }) => {
            const targetUser = row.original.targetUser;
            if (!targetUser) return (
                <span className="text-muted-foreground">
                    {row.original.details?.targetId || "—"}
                </span>
            );
            const userSlug = targetUser.steamId ?? targetUser.id;
            return (
                <Link
                    href={`/admin/users/${userSlug}`}
                    className="flex items-center gap-2"
                    target="_blank"
                >
                    <Avatar className="h-8 w-8">
                        <AvatarImage
                            src={targetUser.image ?? ""}
                            alt={targetUser.name ?? ""}
                        />
                        <AvatarFallback>
                            {targetUser.name?.charAt(0) ?? "U"}
                        </AvatarFallback>
                    </Avatar>
                    <span>{targetUser.name}</span>
                </Link>
            )
        },
    },
    {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => {
            const role = row.original.role;
            if (!role)             return (
                <span className="text-muted-foreground">
                    {row.original.details?.role?.name || "—"}
                </span>
            )
            return (
                <Badge
                    variant="outline"
                    className="capitalize"
                    style={role.color ? {
                        backgroundColor: `${role.color}20`,
                        borderColor: role.color,
                        color: role.color,
                    } : {}}
                >
                    {role?.name}
                </Badge>
            )
        }
    },
    {
        accessorKey: "details",
        header: "Details",
        cell: ({ row }) => {
            const d = row.original.details
            if (!d || typeof d !== 'object') return null
            const path = d.path
            const targetId = d.targetId
            const parts: string[] = []
            if (path && !row.original.action?.startsWith('PAGE_VIEW')) parts.push(path)
            if (targetId) parts.push(`Target: ${targetId}`)
            if (parts.length === 0) return null
            return <span className="text-muted-foreground text-xs">{parts.join(' · ')}</span>
        },
    },
    {
        accessorKey: "timestamp",
        header: "Timestamp",
        cell: ({ row }) => format(new Date(row.original.timestamp), "MMM d, yyyy hh:mm:ss aa"),
    },
]