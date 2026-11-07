"use client"

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { backendApi } from '@/lib/api'
import { getAuthToken } from '@/lib/laravel-auth'
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { format } from 'date-fns'
import { Input } from '@/components/ui/input'

interface Wipe {
    id: number
    server_id: string | null
    name: string | null
    started_at: string
    ended_at: string | null
    is_active: boolean
    createdAt: string
    updatedAt: string
}

interface WipesResponse {
    data: Wipe[]
}

export function WipeManagement() {
    const queryClient = useQueryClient()
    const [serverId, setServerId] = useState('')
    const [wipeName, setWipeName] = useState('')

    const { data, isLoading, error } = useQuery<WipesResponse>({
        queryKey: ['wipes', 'all'],
        queryFn: async () => {
            const token = getAuthToken();
            const headers: Record<string, string> = { Accept: 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const response = await fetch(backendApi('wipes'), { credentials: 'include', headers });
            if (!response.ok) {
                throw new Error('Failed to fetch wipes')
            }
            return response.json()
        },
        staleTime: 30 * 1000,
    })

    const createMutation = useMutation({
        mutationFn: async () => {
            const token = getAuthToken();
            const headers: Record<string, string> = {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const response = await fetch(backendApi('admin/wipes'), {
                method: 'POST',
                credentials: 'include',
                headers,
                body: JSON.stringify({
                    server_id: serverId.trim(),
                    name: wipeName.trim() || undefined,
                }),
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.error || errorData.message || 'Failed to record wipe')
            }
            return response.json()
        },
        onSuccess: () => {
            toast.success('Wipe recorded')
            setWipeName('')
            queryClient.invalidateQueries({ queryKey: ['wipes'] })
        },
        onError: (error) => {
            toast.error(error instanceof Error ? error.message : 'Failed to record wipe')
        },
    })

    const deleteMutation = useMutation({
        mutationFn: async (wipeId: number) => {
            const token = getAuthToken();
            const headers: Record<string, string> = { Accept: 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const response = await fetch(backendApi(`admin/wipes/${wipeId}`), {
                method: 'DELETE',
                credentials: 'include',
                headers,
            });
            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || `Failed to delete wipe: ${response.statusText}`)
            }
            return response.json()
        },
        onSuccess: () => {
            toast.success("Wipe deleted successfully")
            queryClient.invalidateQueries({ queryKey: ['wipes'] })
        },
        onError: (error) => {
            const errorMessage = error instanceof Error ? error.message : 'Failed to delete wipe'
            toast.error(errorMessage)
        }
    })

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Wipe Management</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">Loading wipes...</p>
                </CardContent>
            </Card>
        )
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Wipe Management</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-destructive">Error loading wipes. Please try again.</p>
                </CardContent>
            </Card>
        )
    }

    const wipes = data?.data || []

    return (
        <Card>
            <CardHeader>
                <CardTitle>Wipe Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                    MagicCore records a wipe when the map save changes, if WIPES_ENABLED is on and the server API key can call POST /api/wipes. A crash before that save does not create a row. Record one here when a wipe was missed. Deleting a wipe also deletes its stats.
                </p>
                <form
                    className="flex flex-col gap-2 sm:flex-row"
                    onSubmit={(event) => {
                        event.preventDefault()
                        if (!serverId.trim()) {
                            toast.error('Server id is required')
                            return
                        }
                        createMutation.mutate()
                    }}
                >
                    <Input
                        value={serverId}
                        onChange={(event) => setServerId(event.target.value)}
                        placeholder="Server id"
                        className="sm:max-w-xs"
                    />
                    <Input
                        value={wipeName}
                        onChange={(event) => setWipeName(event.target.value)}
                        placeholder="Name, optional"
                        className="sm:max-w-xs"
                    />
                    <Button type="submit" disabled={createMutation.isPending}>
                        Record wipe
                    </Button>
                </form>
                {wipes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No wipes found.</p>
                ) : (
                    <div className="space-y-4">
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>ID</TableHead>
                                        <TableHead>Server ID</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Started</TableHead>
                                        <TableHead>Ended</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {wipes.map((wipe) => (
                                        <TableRow key={wipe.id}>
                                            <TableCell className="font-mono text-sm">{wipe.id}</TableCell>
                                            <TableCell className="font-mono text-sm">{wipe.server_id || 'N/A'}</TableCell>
                                            <TableCell>{wipe.name || 'Unnamed Wipe'}</TableCell>
                                            <TableCell className="text-sm">
                                                {format(new Date(wipe.started_at), 'MMM d, yyyy HH:mm')}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {wipe.ended_at ? format(new Date(wipe.ended_at), 'MMM d, yyyy HH:mm') : 'N/A'}
                                            </TableCell>
                                            <TableCell>
                                                {wipe.is_active ? (
                                                    <Badge variant="default" className="bg-green-600">Active</Badge>
                                                ) : (
                                                    <Badge variant="secondary">Inactive</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DeleteWipeDialog
                                                    wipe={wipe}
                                                    onDelete={() => deleteMutation.mutate(wipe.id)}
                                                    isDeleting={deleteMutation.isPending}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

function DeleteWipeDialog({ 
    wipe, 
    onDelete, 
    isDeleting 
}: { 
    wipe: Wipe
    onDelete: () => void
    isDeleting: boolean
}) {
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={isDeleting}>
                    Delete
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete Wipe</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to delete this wipe? This will permanently delete:
                        <ul className="list-disc list-inside mt-2 space-y-1">
                            <li>The wipe record (ID: {wipe.id})</li>
                            <li>All associated PvP stats</li>
                            <li>All associated PvE stats</li>
                            <li>All associated resources stats</li>
                            <li>All associated explosives stats</li>
                            <li>All associated farming stats</li>
                            <li>All associated misc stats</li>
                            <li>All associated events stats</li>
                            <li>All associated gambling stats</li>
                            <li>All associated location events</li>
                        </ul>
                        <strong className="block mt-2">This action cannot be undone.</strong>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onDelete}
                        disabled={isDeleting}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {isDeleting ? 'Deleting...' : 'Delete Wipe'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
