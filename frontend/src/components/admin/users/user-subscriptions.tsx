'use client'
import { appTableFeatures, type AppTableFeatures } from "@/lib/table-features"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { getSubscriptions } from "@/app/actions/admin-store"
import {
    ColumnDef,
    flexRender,
    useTable,
    SortingState,
    ColumnFiltersState,
} from "@tanstack/react-table"
import { ArrowUpDown, Check, Copy } from "lucide-react"

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
import { Subscription } from "@/types/store"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { format } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"

interface SubscriptionsResponse {
    data?: Subscription[]
    error?: string
    status?: number
}

function SubscriptionIdCell({ subscriptionId }: { subscriptionId: string }) {
    const [copied, setCopied] = React.useState(false)

    const copyToClipboard = () => {
        navigator.clipboard.writeText(subscriptionId)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="flex items-center space-x-2">
            <Link
                href={`https://dashboard.paynow.gg/subscriptions/${subscriptionId}`}
                className="font-medium hover:underline"
                target="_blank"
                rel="noopener noreferrer"
            >
                {subscriptionId}
            </Link>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={copyToClipboard}
                            className="h-6 w-6"
                        >
                            {copied ? (
                                <Check className="h-4 w-4 text-green-500" />
                            ) : (
                                <Copy className="h-4 w-4" />
                            )}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{copied ? "Copied!" : "Copy ID"}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
    )
}

const columns: ColumnDef<AppTableFeatures, Subscription>[] = [
    {
        accessorKey: "id",
        header: "Subscription ID",
        cell: ({ row }) => <SubscriptionIdCell subscriptionId={row.getValue("id")} />,
    },
    {
        accessorKey: "product_name",
        header: "Product",
        cell: ({ row }) => <div>{row.getValue("product_name")}</div>,
    },
    {
        accessorKey: "total_amount_str",
        header: ({ column }) => (
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
                Amount
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => <div className="px-4">{row.getValue("total_amount_str")}</div>,
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
            <Badge
                variant={row.getValue("status") === "active" ? "active" : "destructive"}
                className="capitalize"
            >
                {row.getValue("status")}
            </Badge>
        ),
    },
    {
        accessorKey: "interval_value",
        header: "Billing Period",
        cell: ({ row }) => (
            <div>
                {row.getValue("interval_value")} {row.original["interval_scale"]}
                {Number(row.getValue("interval_value")) > 1 ? "s" : ""}
            </div>
        ),
    },
    {
        accessorKey: "created_at",
        header: ({ column }) => (
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
                Created At
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => {
            const createdAt = new Date(row.getValue("created_at"))
            return (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="px-4 cursor-help">
                                {formatDistanceToNow(createdAt, { addSuffix: true })}
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{format(createdAt, "PPpp")}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )
        },
    },
]

export function UserSubscriptions({ customerId }: { customerId: string }) {
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

    const { data: subscriptionsData, isLoading, isError } = useQuery<SubscriptionsResponse>({
        queryKey: ['subscriptions', customerId],
        queryFn: (): Promise<SubscriptionsResponse> => getSubscriptions(customerId) as Promise<SubscriptionsResponse>
    })

    const table = useTable({
        features: appTableFeatures,
        data: subscriptionsData?.data || [],
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
                    <CardTitle>Subscriptions</CardTitle>
                    <CardDescription>
                        View all subscriptions for this user.
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
                    <CardTitle>Subscriptions</CardTitle>
                    <CardDescription>
                        An error occurred while loading subscriptions.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-destructive">Error loading subscriptions. Please try again later.</div>
                </CardContent>
            </Card>
        )
    }

    if (subscriptionsData?.error) {
        const errorMessage = subscriptionsData?.status === 401 
            ? "You do not have permission to view this user's subscriptions." 
            : subscriptionsData?.error
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Subscriptions</CardTitle>
                    <CardDescription>
                        {errorMessage}
                    </CardDescription>
                </CardHeader>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 mb-1">
                <div>
                    <CardTitle>Subscriptions</CardTitle>
                    <CardDescription>
                        View all subscriptions for this user.
                    </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                    <Input
                        placeholder="Filter Subscription IDs..."
                        value={(table?.getColumn("id")?.getFilterValue() as string) || ""}
                        onChange={(e) => table?.getColumn("id")?.setFilterValue(e.target.value)}
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
                        <Skeleton className="h-12 w-[16.67%]" />
                        <Skeleton className="h-12 w-[16.67%]" />
                        <Skeleton className="h-12 w-[16.67%]" />
                        <Skeleton className="h-12 w-[16.67%]" />
                        <Skeleton className="h-12 w-[16.67%]" />
                        <Skeleton className="h-12 w-[16.67%]" />
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