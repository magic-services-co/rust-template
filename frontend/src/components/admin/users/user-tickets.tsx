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
import { ArrowUpDown, ChevronDown } from "lucide-react"
import { useQuery } from "@tanstack/react-query"

import { Button, buttonVariants } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Ticket, TicketCategory } from "@/types/tickets";
import { format } from "date-fns"
import Link from "next/link"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"


type TicketUser = {
    name: string
    image: string | null
    /* accounts: {
        provider: string
        providerAccountId: string
    }[] */
}
const columns: ColumnDef<AppTableFeatures, Ticket>[] = [
    {
        accessorKey: "id",
        header: "Ticket ID",
        cell: ({ row }) => <div className="capitalize">#{row.getValue("id")}</div>,
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
            <Badge
                variant={row.getValue("status") === "open" ? "active" : "destructive"}
                className="capitalize select-none"
            >
                {row.getValue("status")}
            </Badge>
        ),
    },
    {
        accessorKey: "category",
        header: "Title",
        cell: ({ row }) => <div>{row.getValue<Partial<TicketCategory>>("category")?.name}</div>,
    },
    {
        accessorKey: "updatedAt",
        header: ({ column }) => (
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
                Updated
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => <div className="px-4">{format(new Date(row.getValue("updatedAt")), "MMM d, yyyy h:mm a")}</div>,
    },
    {
        accessorKey: "createdAt",
        header: ({ column }) => (
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
                Created
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => <div className="px-4">{format(new Date(row.getValue("createdAt")), "MMM d, yyyy h:mm a")}</div>,
    },
    {
        accessorKey: "view",
        header: "View",
        cell: ({ row }) => (
            <Link
                href={`/admin/ticket/${row.getValue("id")}`}
                className={cn(
                    buttonVariants({
                        variant: "outline",
                        size: "sm"
                    }),
                    "w-full md:w-auto"
                )}>
                View
            </Link>
        ),
    }
]

export default function UserTickets({ userId }: { userId: string }) {
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>({})
    const [statusFilter, setStatusFilter] = React.useState<string>("all")

    const { data: tickets, isLoading, isError } = useQuery<Ticket[]>({
        queryKey: ['admin-user-tickets', userId],
        queryFn: async () => {
            const { backendApi } = await import('@/lib/api');
            const { getAuthToken } = await import('@/lib/laravel-auth');
            const token = getAuthToken();
            const headers: Record<string, string> = { Accept: 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const res = await fetch(backendApi(`admin/tickets?userId=${userId}&page=1&pageSize=100`), { credentials: 'include', headers });
            const data = await res.json();
            return data.tickets;
        },
    })

    const table = useTable({
        features: appTableFeatures,
        data: tickets ?? [],
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

    const columnNames: Record<string, string> = {
        id: "Ticket ID",
        status: "Status",
        title: "Title",
        updatedAt: "Updated",
        createdAt: "Created",
    }

    return (
        <Card className="bg-secondary/15 border-border/5 backdrop-blur">
            <CardContent>
                <div className="py-4 flex flex-col gap-2.5 md:gap-0 md:flex-row items-center justify-between">
                    <Input
                        placeholder="Filter Tickets..."
                        value={(table.getColumn("id")?.getFilterValue() as string) ?? ""}
                        onChange={(event) =>
                            table.getColumn("id")?.setFilterValue(event.target.value)
                        }
                        className="md:max-w-sm bg-background/15 border-border/15 placeholder:text-muted-foreground/60"
                    />
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full md:w-[180px] bg-transparent border-border/15 text-muted-foreground/60">
                            <SelectValue placeholder="Filter by Status" />
                        </SelectTrigger>
                        <SelectContent className="bg-background/10 backdrop-blur border-border/15 text-muted-foreground">
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
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
                                        No results.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                <div className="flex items-center justify-end space-x-2 py-4">
                    <div className="flex-1 text-sm text-muted-foreground">
                        {isLoading
                            ? "Loading tickets..."
                            : `${table.getFilteredRowModel().rows.length} ticket(s) total.`
                        }
                    </div>
                    <div className="space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
