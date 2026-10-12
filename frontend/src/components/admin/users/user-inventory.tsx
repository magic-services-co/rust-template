'use client'
import { appTableFeatures, type AppTableFeatures } from "@/lib/table-features"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { getInventory } from "@/app/actions/admin-store"
import {
    ColumnDef,
    flexRender,
    useTable,
    SortingState,
    ColumnFiltersState,
} from "@tanstack/react-table"
import { Ban, Clock } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { InventoryItem } from "@/types/store"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow, format, isAfter } from "date-fns"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Skeleton } from "@/components/ui/skeleton"

const columns: ColumnDef<AppTableFeatures, InventoryItem>[] = [
    {
        accessorKey: "product",
        header: "Product",
        cell: ({ row }) => {
            const product = row.original.product
            return <div>{product.name}</div>
        },
        filterFn: (row, id, value) => {
            return row.original.product.name.toLowerCase().includes(value.toLowerCase())
        },
    },
    {
        accessorKey: "state",
        header: "Status",
        cell: ({ row }) => (
            <Badge
                variant={row.getValue("state") === "active" ? "active" : "secondary"}
                className="capitalize"
            >
                {row.getValue("state")}
            </Badge>
        ),
    },
    {
        accessorKey: "expirable",
        header: "Type",
        cell: ({ row }) => (
            row.getValue("expirable") ? (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Clock size={16} className="cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Expirable</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            ) : (
                null
            )
        ),
    },
    {
        accessorKey: "expires_at",
        header: "Expiration",
        cell: ({ row }) => {
            const expiresAt = row.getValue("expires_at") as string | null
            const expirationDate = new Date(expiresAt || new Date())
            const isExpired = isAfter(new Date(), expirationDate)
            return (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                                {!expiresAt ? (
                                    <Ban size={16} className="cursor-help" />
                                ) : (
                                    <div className={cn("cursor-help", isExpired && "text-destructive")}>
                                        {formatDistanceToNow(expirationDate, { addSuffix: true })}
                                    </div>
                                )}
                        </TooltipTrigger>
                        <TooltipContent align="center">
                            {expiresAt ? format(expirationDate, "PPpp") : "This product does not expire."}
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )
        },
    },
    {
        accessorKey: "added_at",
        header: "Added",
        cell: ({ row }) => {
            const addedAt = new Date(row.getValue("added_at"))
            return (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="cursor-help">
                                {formatDistanceToNow(addedAt, { addSuffix: true })}
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{format(addedAt, "PPpp")}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )
        },
    },
    /*  {
         id: "actions",
         cell: ({ row }) => {
             const item = row.original
             return (
                 <DropdownMenu>
                     <DropdownMenuTrigger asChild>
                         <Button variant="ghost" className="h-8 w-8 p-0">
                             <span className="sr-only">Open menu</span>
                             <MoreHorizontal className="h-4 w-4" />
                         </Button>
                     </DropdownMenuTrigger>
                     <DropdownMenuContent align="end">
                         <DropdownMenuLabel>Actions</DropdownMenuLabel>
                         <DropdownMenuItem
                             onClick={() => navigator.clipboard.writeText(item.id)}
                         >
                             Copy item ID
                         </DropdownMenuItem>
                         <DropdownMenuSeparator />
                         <DropdownMenuItem>View details</DropdownMenuItem>
                         {item.state === "active" && (
                             <DropdownMenuItem className="text-destructive">
                                 Revoke item
                             </DropdownMenuItem>
                         )}
                     </DropdownMenuContent>
                 </DropdownMenu>
             )
         },
     }, */
]

export function UserInventory({ customerId }: { customerId: string }) {
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

    const { data: inventoryData, isLoading, isError, error } = useQuery<InventoryItem[]>({
        queryKey: ['user-inventory', customerId],
        queryFn: async (): Promise<InventoryItem[]> => {
            const data = await getInventory(customerId)
            if (data.error) {
                throw new Error(data.error)
            }
            return (data.data ?? []) as InventoryItem[]
        },
    })

    const table = useTable({
        features: appTableFeatures,
        data: inventoryData || [],
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        state: {
            sorting,
            columnFilters,
        },
    })

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Inventory</CardTitle>
                    <CardDescription>
                        View all inventory items for this user.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <TableSkeleton />
                </CardContent>
            </Card>
        )
    }

    if (isError) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Inventory</CardTitle>
                    <CardDescription>
                        {error instanceof Error && error.message === "Unauthorized" 
                            ? "You do not have permission to view this user's inventory."
                            : "An error occurred while loading inventory."}
                    </CardDescription>
                </CardHeader>
            </Card>
        )
    }

    /* if (inventoryData && inventoryData?.error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Inventory</CardTitle>
                    <CardDescription>
                    {inventoryData.status === 401 ? "You do not have permission to view this user's inventory." : inventoryData.error}
                    </CardDescription>
                </CardHeader>
            </Card>
        )
    } */
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 mb-1">
                <div>
                    <CardTitle>Inventory</CardTitle>
                    <CardDescription>
                        View all inventory items for this user.
                    </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                    <Input
                        placeholder="Filter products..."
                        value={(table?.getColumn("product")?.getFilterValue() as string) || ""}
                        onChange={(e) => table?.getColumn("product")?.setFilterValue(e.target.value)}
                    />
                </div>
            </CardHeader>
            <CardContent className="pb-0">
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        data-state={row.getIsSelected() && "selected"}
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
            </CardContent>
        </Card>
    )
}

function TableSkeleton() {
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center space-x-4">
                <Skeleton className="h-8 w-[250px]" />
                <Skeleton className="h-8 w-[200px]" />
            </div>
            <div className="border rounded-md p-2 flex flex-col gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex gap-4">
                        <Skeleton className="h-12 w-[25%]" />
                        <Skeleton className="h-12 w-[25%]" />
                        <Skeleton className="h-12 w-[25%]" />
                        <Skeleton className="h-12 w-[25%]" />
                    </div>
                ))}
            </div>
            <div className="flex justify-end space-x-2">
                <Skeleton className="h-8 w-[100px]" />
                <Skeleton className="h-8 w-[100px]" />
            </div>
        </div>
    )
}