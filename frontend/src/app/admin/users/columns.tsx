"use client"
import { type AppTableFeatures } from "@/lib/table-features"

import { backendApi } from "@/lib/api"
import { getAuthToken } from "@/lib/laravel-auth"
import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { format } from "date-fns"
import Link from "next/link"
import { UserRole } from "@/types/user"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Trash2, Eye, Pencil } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useSession } from "@/lib/laravel-auth-react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

export interface User {
    id: string
    name: string | null
    email: string | null
    image: string | null
    role: string
    roles?: { id: string; name: string; color?: string | null }[]
    createdAt: Date
    updatedAt: Date
    lastSeenAt: Date | null
    discordId: string | null
    steamId: string | null
    isBanned: boolean
    banReason: string | null
    banExpiresAt: Date | null
    lastLoginAt: Date | null
}

function UserActionsCell({ user }: { user: User }) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const deleteMutation = useMutation({
        mutationFn: async () => {
            const token = getAuthToken()
            const headers: Record<string, string> = { Accept: 'application/json' }
            if (token) headers['Authorization'] = `Bearer ${token}`
            const response = await fetch(backendApi(`admin/users?id=${user.id}`), {
                method: 'DELETE',
                credentials: 'include',
                headers,
            });
            if (!response.ok) throw new Error('Failed to delete user');
            return response.json();
        },
        onSuccess: () => {
            toast.success('User deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            router.refresh();
        },
        onError: () => {
            toast.error('Failed to delete user');
        }
    });

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                        <Link href={`/admin/users/${user.steamId || user.id}`}>View Profile</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                        className="text-red-600"
                        onSelect={(e) => {
                            e.preventDefault();
                            setShowDeleteDialog(true);
                        }}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete User
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the user account
                            and remove all associated data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={() => deleteMutation.mutate()} 
                            className="bg-red-600 hover:bg-red-700"
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

export const columns: ColumnDef<AppTableFeatures, User>[] = [
    {
        id: "select",
        header: ({ table }) => (
            <Checkbox
                checked={table.getIsAllPageRowsSelected()}
                onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                aria-label="Select all"
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Select row"
            />
        ),
        enableSorting: false,
        enableHiding: false,
    },
    {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => {
            const user = row.original
            const profileId = user.steamId || user.id
            return (
                <Link href={`/admin/users/${profileId}`} className="flex items-center space-x-3 hover:opacity-90">
                    <Avatar>
                        <AvatarImage src={user.image || undefined} alt={user.name || ""} />
                        <AvatarFallback>{user.name?.charAt(0) || "U"}</AvatarFallback>
                    </Avatar>
                    <span>{user.name}</span>
                </Link>
            )
        },
        enableHiding: false,
        enableSorting: true,
    },
    {
        accessorKey: "steamId",
        header: "Steam ID",
        cell: ({ row }) => {
            const user = row.original
            return (
                <span>{user.steamId || "N/A"}</span>
            )
        },
        enableSorting: false,
    },
    {
        accessorKey: "discordId",
        header: "Discord ID",
        cell: ({ row }) => {
            const user = row.original
            return (
                <span>{user.discordId || "N/A"}</span>
            )
        },
        enableSorting: false,
    },
    {
        accessorKey: "role",
        header: "Roles",
        cell: ({ row }) => {
            const user = row.original
            const list = user.roles ?? (user.role ? [{ id: "", name: user.role, color: null }] : [])
            if (list.length === 0) return <span className="text-muted-foreground">—</span>
            return (
                <div className="flex flex-wrap gap-1">
                    {list.slice(0, 3).map((r) => (
                        <span
                            key={r.id || r.name}
                            className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border border-border/30"
                            style={r.color ? { borderColor: r.color, color: r.color } : {}}
                        >
                            {r.name}
                        </span>
                    ))}
                    {list.length > 3 && (
                        <span className="text-muted-foreground text-xs">+{list.length - 3}</span>
                    )}
                </div>
            )
        },
        enableSorting: false,
    },
    {
        accessorKey: "createdAt",
        header: "Account Linked On",
        cell: ({ row }) => format(new Date(row.getValue("createdAt")), "MM/dd/yyyy"),
        enableSorting: true,
    },
    {
        accessorKey: "lastSeenAt",
        header: "Last Seen",
        cell: ({ row }) => {
            const lastSeenAt = row.getValue("lastSeenAt") as Date | null;
            if (!lastSeenAt) return <span className="text-muted-foreground">Never</span>;
            return format(new Date(lastSeenAt), "MM/dd/yyyy HH:mm");
        },
        enableSorting: true,
    },
    {
        id: "actions",
        cell: ({ row }) => {
            return <UserActionsCell user={row.original} />;
        },
    },
]