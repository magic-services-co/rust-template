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
import { parseAsInteger, useQueryState } from "nuqs"
import { useDebouncedCallback } from "use-debounce"
import { useCallback, useEffect, useState } from "react"
import { backendApi } from "@/lib/api"
import { getAuthToken } from "@/lib/laravel-auth"


type TicketUser = {
    name: string
    image: string | null
}
const columns: ColumnDef<AppTableFeatures, Ticket>[] = [
    {
        accessorKey: "id",
        header: "Ticket ID",
        cell: ({ row }) => <div className="capitalize">#{row.getValue("id")}</div>,
    },
    {
        accessorKey: "user",
        header: "User",
        cell: ({ row }) => (
            <div className="flex items-center gap-2">
                <Avatar>
                    <AvatarImage src={row.getValue<TicketUser>("user")?.image ?? ""} />
                    <AvatarFallback>
                        {row.getValue<TicketUser>("user")?.name?.split(" ").map((n) => n[0]).join("")}
                    </AvatarFallback>
                </Avatar>
                {row.getValue<TicketUser>("user")?.name}
            </div>
        ),
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
    /* {
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
    } */
]

type TicketTableProps = {
    tickets: Ticket[]
    pagination: {
        totalItems: number
        currentPage: number
        totalPages: number
    }
}

export default function TicketTable() {
    const [sorting, setSorting] = useState<SortingState>([])
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>({})
    const [statusFilter, setStatusFilter] = useState<string>("all")

    const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1));
    const [pageSize, setPageSize] = useQueryState('pageSize', parseAsInteger.withDefault(10));

    const [searchQuery, setSearchQuery] = useQueryState('search', {
        defaultValue: '',
        shallow: false,
        clearOnDefault: true,
    });

    const debouncedSetSearchQuery = useDebouncedCallback(setSearchQuery, 300);

    const { data, isLoading } = useQuery<TicketTableProps>({
        queryKey: ['admin-tickets', page, pageSize, searchQuery, statusFilter],
        queryFn: async () => {
            const token = getAuthToken()
            const headers: Record<string, string> = { Accept: 'application/json' }
            if (token) headers['Authorization'] = `Bearer ${token}`
            const params = new URLSearchParams({
                page: String(page),
                pageSize: String(pageSize),
                search: searchQuery,
                status: statusFilter,
            })
            const response = await fetch(backendApi(`admin/tickets?${params}`), { credentials: 'include', headers })
            if (!response.ok) {
                throw new Error('Failed to fetch tickets')
            }
            return await response.json()
        },
    })

    const handlePageChange = useCallback((newPage: number) => {
        setPage(newPage);
    }, [setPage]);

    const table = useTable({
        features: appTableFeatures,
        data: data?.tickets ?? [],
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onColumnVisibilityChange: setColumnVisibility,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            pagination: {
                pageIndex: page - 1,
                pageSize: pageSize,
            },
        },
        manualPagination: true,
        autoResetPageIndex: true,
        pageCount: Math.ceil((data?.pagination?.totalItems ?? 0) / pageSize),
    })

    useEffect(() => {
        if (statusFilter !== "all") {
            table.getColumn("status")?.setFilterValue(statusFilter)
        } else {
            table.getColumn("status")?.setFilterValue(undefined)
        }
    }, [statusFilter, table])
    return (
        <Card className="bg-secondary/15 border-border/5 backdrop-blur">
            <CardContent>
                <div className="py-4 flex flex-col gap-2.5 md:gap-0 md:flex-row items-center justify-between">
                    <Input
                        placeholder="Search by user name, steam, or discord..."
                        /* value={(table.getColumn("id")?.getFilterValue() as string) ?? ""}
                            onChange={(event) =>
                            table.getColumn("id")?.setFilterValue(event.target.value)
                        } */
                        defaultValue={searchQuery}
                        onChange={(e) => debouncedSetSearchQuery(e.target.value)}
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
                                                <Link href={`/admin/ticket/${row.original.id}`} className="w-full h-full">
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </Link>
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
                            : `${data?.pagination.totalItems} ticket(s) total.`
                        }
                    </div>
                    <div className="space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(page - 1)}
                            disabled={page === 1}
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(page + 1)}
                            disabled={page * pageSize >= (data?.pagination?.totalItems ?? 0)}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
