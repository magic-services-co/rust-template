"use client"
import { appTableFeatures, type AppTableFeatures } from "@/lib/table-features"

import { useState, useCallback, useEffect } from "react"
import { backendApi } from "@/lib/api"
import { getAuthToken } from "@/lib/laravel-auth"
import {
    ColumnDef,
    flexRender,
    useTable,
    ColumnFiltersState,
    SortingState,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { useQuery } from '@tanstack/react-query'
import { parseAsInteger, useQueryState } from 'nuqs'
import { User } from "./columns"
import { useDebouncedCallback } from "use-debounce"
import { Check } from "lucide-react"
import { useSession } from "@/lib/laravel-auth-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { SteamcordImportDialog } from "@/components/admin/users/steamcord-import-dialog"
import { ServyCoreImportDialog } from "@/components/admin/users/servycore-import-dialog"

export function DataTable({
    columns,
}: { columns: ColumnDef<AppTableFeatures, User, any>[] }) {
    const { data: session } = useSession()
    const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1));
    const [pageSize, setPageSize] = useQueryState('pageSize', parseAsInteger.withDefault(10));
    const [searchQuery, setSearchQuery] = useQueryState('search', {
        defaultValue: '',
        shallow: false,
        clearOnDefault: true,
    });
    const [roleFilter, setRoleFilter] = useQueryState('role', {
        defaultValue: '',
        shallow: false,
        clearOnDefault: true,
    });
    const [sortBy, setSortBy] = useQueryState('sortBy', { defaultValue: 'createdAt', clearOnDefault: false });
    const [sortOrder, setSortOrder] = useQueryState('sortOrder', { defaultValue: 'desc', clearOnDefault: false });
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [rowSelection, setRowSelection] = useState({});

    const { data: roles, isLoading: isLoadingRoles } = useQuery({
        queryKey: ['roles'],
        queryFn: async () => {
            const token = getAuthToken()
            const headers: Record<string, string> = { Accept: 'application/json' }
            if (token) headers['Authorization'] = `Bearer ${token}`
            const response = await fetch(backendApi('admin/settings/roles'), { credentials: 'include', headers })
            if (!response.ok) throw new Error('Failed to fetch roles')
            const data = await response.json()
            return Array.isArray(data) ? data : []
        },
    });

    const { data, isLoading, isError } = useQuery({
        queryKey: ['admin-users', page, pageSize, searchQuery, roleFilter, sortBy, sortOrder],
        queryFn: async () => {
            const token = getAuthToken()
            const headers: Record<string, string> = { Accept: 'application/json' }
            if (token) headers['Authorization'] = `Bearer ${token}`
            const params = new URLSearchParams({
                page: String(page),
                pageSize: String(pageSize),
                search: searchQuery ?? '',
                role: roleFilter ?? '',
                sortBy: sortBy ?? 'createdAt',
                sortOrder: sortOrder ?? 'desc',
            })
            const response = await fetch(backendApi(`admin/users?${params.toString()}`), { credentials: 'include', headers })
            if (!response.ok) throw new Error('Failed to fetch users')
            return response.json()
        },
    });

    const handleFilterChange = useCallback((value: string) => {
        setSearchQuery(value);
        setPage(1);
    }, [setSearchQuery, setPage]);

    const handleRoleFilterChange = useCallback((value: string) => {
        setRoleFilter(value);
        setPage(1);
    }, [setRoleFilter, setPage]);

    const handlePageChange = useCallback((newPage: number) => {
        setPage(newPage);
    }, [setPage]);

    const debouncedSetSearchQuery = useDebouncedCallback(handleFilterChange, 300);

    const handleSort = useCallback((columnId: string) => {
        const nextOrder = sortBy === columnId && sortOrder === 'desc' ? 'asc' : 'desc'
        setSortBy(columnId)
        setSortOrder(nextOrder)
        setPage(1)
    }, [sortBy, sortOrder, setSortBy, setSortOrder, setPage])

    const table = useTable({
        features: appTableFeatures,
        data: data?.users || [],
        columns,
        onColumnFiltersChange: setColumnFilters,
        onSortingChange: setSorting,
        state: {
            columnFilters,
            pagination: {
                pageIndex: page - 1,
                pageSize,
            },
            sorting,
            rowSelection,
        },
        enableRowSelection: true,
        manualPagination: true,
        manualSorting: true,
        pageCount: Math.ceil((data?.total ?? 0) / pageSize),
        onRowSelectionChange: setRowSelection,
    });

    useEffect(() => {
        const selectedRows = table.getSelectedRowModel().rows;
        setSelectedIds(selectedRows.map(row => row.original.id));
    }, [rowSelection, table]);

    const handleMassDelete = async () => {
        setIsDeleting(true);
        try {
            const token = getAuthToken()
            const headers: Record<string, string> = { Accept: 'application/json' }
            if (token) headers['Authorization'] = `Bearer ${token}`
            await Promise.all(selectedIds.map(id => fetch(backendApi(`admin/users?id=${id}`), { method: 'DELETE', credentials: 'include', headers })));
            setShowDeleteDialog(false);
            setSelectedIds([]);
            table.resetRowSelection();
            if (typeof window !== 'undefined') window.location.reload();
        } catch (error) {
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="rounded-md bg-card">
            {table.getSelectedRowModel().rows.length > 0 && (
                <div className="p-4 flex items-center gap-2 bg-destructive/10 border-b border-destructive">
                    <span className="font-semibold">{table.getSelectedRowModel().rows.length} selected</span>
                    <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)} disabled={isDeleting}>
                        Delete Selected
                    </Button>
                    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete {table.getSelectedRowModel().rows.length} users?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. All selected user accounts and their data will be permanently deleted.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleMassDelete} className="bg-red-600 hover:bg-red-700" disabled={isDeleting}>
                                    {isDeleting ? 'Deleting...' : 'Delete'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            )}
            <div className="p-4 flex items-center justify-between">
                <Input
                    type="search"
                    defaultValue={searchQuery}
                    placeholder="Search by Username, PayNow, Discord or Steam..."
                    className="max-w-sm bg-background/15"
                    onChange={(e) => debouncedSetSearchQuery(e.target.value)}
                />
                <div className="flex items-center gap-2">
                    <SteamcordImportDialog />
                    <ServyCoreImportDialog />
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="flex items-center gap-2">
                                <span>Filter by Role</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>Select Role</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleRoleFilterChange('')}>
                                <span className="flex items-center">
                                    {!roleFilter && <Check className="mr-2 h-4 w-4" />}
                                    All Roles
                                </span>
                            </DropdownMenuItem>
                            {isLoadingRoles ? (
                                <DropdownMenuItem disabled>
                                    Loading roles...
                                </DropdownMenuItem>
                            ) : Array.isArray(roles) && roles.length > 0 ? (
                                roles.map((role: { id: string; name: string; color?: string }) => (
                                    <DropdownMenuItem 
                                        key={role.id} 
                                        onClick={() => handleRoleFilterChange(role.id)}
                                    >
                                        <span className="flex items-center">
                                            {roleFilter === role.id && <Check className="mr-2 h-4 w-4" />}
                                            {role.color && (
                                                <span 
                                                    className="w-3 h-3 rounded-full mr-2" 
                                                    style={{ backgroundColor: role.color }}
                                                />
                                            )}
                                            {role.name}
                                        </span>
                                    </DropdownMenuItem>
                                ))
                            ) : (
                                <DropdownMenuItem disabled>
                                    No roles available
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
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
            </div>
            <div className="">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} className="bg-background/10 border-border/15 hover:bg-background/10">
                                {headerGroup.headers.map((header) => (
                                    <TableHead 
                                        key={header.id}
                                        className={header.column.getCanSort() ? "cursor-pointer select-none hover:bg-muted/50" : ""}
                                        onClick={header.column.getCanSort() ? () => handleSort(header.column.id) : undefined}
                                    >
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                        {header.column.getCanSort() && sortBy === header.column.id && (
                                            <span className="ml-1">{sortOrder === 'asc' ? ' ↑' : ' ↓'}</span>
                                        )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody className='space-y-2.5'>
                        {table.getRowModel().rows?.length ? (
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
                                    {isLoading ? "Loading..." : "No results."}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="flex items-center gap-4 justify-between p-4 flex-wrap">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                        {(data?.total ?? 0) === 0
                            ? 'No users'
                            : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, data?.total ?? 0)} of ${data?.total ?? 0}`}
                    </span>
                    <Select
                        value={String(pageSize)}
                        onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}
                    >
                        <SelectTrigger className="w-[72px] h-8">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="25">25</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                        </SelectContent>
                    </Select>
                    <span>per page</span>
                    {table.getSelectedRowModel().rows.length > 0 && (
                        <span className="text-foreground">
                            ({table.getSelectedRowModel().rows.length} selected)
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
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
                        disabled={page * pageSize >= (data?.total ?? 0)}
                    >
                        Next
                    </Button>
                </div>
            </div>
        </div>
    )
}