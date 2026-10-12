"use client"
import { appTableFeatures, type AppTableFeatures } from "@/lib/table-features"

import { useState, useCallback } from "react"
import {
    ColumnDef,
    flexRender,
    useTable,
    ColumnFiltersState,
} from "@tanstack/react-table"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { parseAsInteger, useQueryState } from 'nuqs'
import { AdminLog } from "./columns"
import { useDebouncedCallback } from "use-debounce"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
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
import { Trash2 } from "lucide-react"
import { toast } from "sonner"

export function DataTable({
    columns,
}: { columns: ColumnDef<AppTableFeatures, AdminLog, any>[] }) {
    const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1));
    const [queryPageSize, setPageSize] = useQueryState('pageSize', parseAsInteger.withDefault(10));
    const [searchQuery, setSearchQuery] = useQueryState('search', {
        defaultValue: '',
        shallow: false,
        clearOnDefault: true,
    });
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [isClearing, setIsClearing] = useState(false);
    const queryClient = useQueryClient();

    const pageSize = queryPageSize ?? 10;

    const { data, isLoading, isError } = useQuery({
        queryKey: ['admin-logs', page, pageSize, searchQuery],
        queryFn: async () => {
            const response = await fetch(`/api/admin/logs/full?page=${page}&limit=${pageSize}${searchQuery ? `&action=${searchQuery}` : ''}`, {
                credentials: 'include',
            })
            if (!response.ok) {
                throw new Error('Failed to fetch logs')
            }
            return response.json()
        },
        placeholderData: (previousData) => previousData,
    });

    const handleFilterChange = useCallback((value: string) => {
        setSearchQuery(value);
        setPage(1);
    }, [setSearchQuery, setPage]);

    const handlePageChange = useCallback((newPage: number) => {
        setPage(newPage);
    }, [setPage]);

    const debouncedSetSearchQuery = useDebouncedCallback(handleFilterChange, 300);

    const handleClearLogs = async () => {
        try {
            setIsClearing(true);
            const response = await fetch('/api/admin/logs', {
                method: 'DELETE',
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('Failed to clear logs');
            }

            await queryClient.invalidateQueries({ queryKey: ['admin-logs'] });
            toast.success('Logs cleared successfully');
        } catch (error) {
            console.error('Error clearing logs:', error);
            toast.error('Failed to clear logs');
        } finally {
            setIsClearing(false);
        }
    };

    const table = useTable({
        features: appTableFeatures,
        data: data?.logs || [],
        columns,
        onColumnFiltersChange: setColumnFilters,
        state: {
            columnFilters,
            pagination: {
                pageIndex: page - 1,
                pageSize,
            },
        },
        manualPagination: true,
        manualFiltering: true,
        pageCount: Math.ceil((data?.pagination?.totalItems ?? 0) / pageSize),
        autoResetPageIndex: false,
    });

    return (
        <Card className="bg-secondary/15 border-border/5 backdrop-blur">
            <CardContent>
                <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Input
                            type="search"
                            defaultValue={searchQuery}
                            placeholder="Filter by action..."
                            className="max-w-sm bg-background/15"
                            onChange={(e) => debouncedSetSearchQuery(e.target.value)}
                        />
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" disabled={isClearing}>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Clear Logs
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete all admin logs
                                        from the database.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={handleClearLogs}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                        Clear All Logs
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">View Columns</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {table.getAllColumns().filter(
                                (column) => column.getCanHide()
                            ).map((column) => {
                                return (
                                    <DropdownMenuItem key={column.id} className="capitalize">
                                        <label className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={column.getIsVisible()}
                                                onChange={(e) => column.toggleVisibility(!!e.target.checked)}
                                                className="mr-2"
                                            />
                                            {column.id}
                                        </label>
                                    </DropdownMenuItem>
                                )
                            })}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <div className="rounded-md overflow-hidden border border-border/15">
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id} className="bg-background/10 border-border/15 hover:bg-background/10">
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
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, index) => (
                                    <TableRow key={index} className="border-border/15">
                                        {columns.map((_, cellIndex) => (
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
                <div className="flex items-center justify-between p-4">
                    <div className="flex-1 text-sm text-muted-foreground">
                        {isLoading
                            ? "Loading logs..."
                            : `${data?.pagination?.totalItems ?? 0} log(s) total.`
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