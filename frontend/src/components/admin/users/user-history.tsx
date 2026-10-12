'use client'
import { appTableFeatures, type AppTableFeatures } from "@/lib/table-features"

import * as React from "react"
import {
    ColumnDef,
    ColumnFiltersState,
    SortingState,
    ColumnVisibilityState,
    flexRender,
    useTable,
} from "@tanstack/react-table"
import { ArrowUpDown } from "lucide-react"
import { useQuery } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { format } from "date-fns"

type BanHistory = {
    id: number
    action: string
    reason: string | null
    createdAt: string
    admin: {
        name: string
        image: string | null
    }
}

const columns: ColumnDef<AppTableFeatures, BanHistory>[] = [
    {
        accessorKey: "action",
        header: "Action",
        cell: ({ row }) => (
            <Badge
                variant={row.getValue("action") === "banned" ? "destructive" : "active"}
                className="capitalize select-none"
            >
                {row.getValue("action")}
            </Badge>
        ),
    },
    {
        accessorKey: "reason",
        header: "Reason",
        cell: ({ row }) => <div>{row.getValue("reason") || "No reason provided"}</div>,
    },
    {
        accessorKey: "admin",
        header: "Admin",
        cell: ({ row }) => <div>{row.getValue<BanHistory["admin"]>("admin")?.name}</div>,
    },
    {
        accessorKey: "createdAt",
        header: ({ column }) => (
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
                Date
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => <div className="px-4">{format(new Date(row.getValue("createdAt")), "MMM d, yyyy h:mm a")}</div>,
    },
]

export default function UserHistory({ userId }: { userId: string }) {
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>({})

    const { data: history, isLoading, isError } = useQuery<BanHistory[]>({
        queryKey: ['admin-user-history', userId],
        queryFn: async () => {
            const { backendApi } = await import('@/lib/api');
            const { getAuthToken } = await import('@/lib/laravel-auth');
            const token = getAuthToken();
            const headers: Record<string, string> = { Accept: 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const res = await fetch(backendApi(`admin/users/${userId}/history`), { credentials: 'include', headers });
            const data = await res.json();
            return data.history;
        },
    })

    const table = useTable({
        features: appTableFeatures,
        data: history ?? [],
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onColumnVisibilityChange: setColumnVisibility,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
        },
    })

    return (
        <Card className="bg-secondary/15 border-border/5 backdrop-blur">
            <CardContent>
                <div className="rounded-md overflow-hidden border border-border/15">
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id} className="bg-background/10 border-border/15 hover:bg-background/10">
                                    {headerGroup.headers.map((header) => {
                                        return (
                                            <TableHead key={header.id}>
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )}
                                            </TableHead>
                                        )
                                    })}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, index) => (
                                    <TableRow key={index} className="border-border/15">
                                        {columns.map((column, cellIndex) => (
                                            <TableCell key={cellIndex}>
                                                <Skeleton className="h-6 w-full" />
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        data-state={row.getIsSelected() && "selected"}
                                        className="border-border/15"
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id}>
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={columns.length} className="h-24 text-center">
                                        No ban history found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    )
} 