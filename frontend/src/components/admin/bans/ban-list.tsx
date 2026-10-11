"use client"

import { useState, useEffect, useCallback } from "react"
import { backendApi } from "@/lib/api"
import { getAuthToken } from "@/lib/laravel-auth"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { MoreHorizontal, Search, Filter, Edit, Trash2, Clock, User, Server, FolderOpen, Globe, RefreshCw } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import { useQuery } from "@tanstack/react-query"
import { BanForm } from "./ban-form"

interface Ban {
    id: string
    userId: string
    reason: string
    banType: 'GLOBAL' | 'CATEGORY' | 'INDIVIDUAL'
    serverId?: string
    categoryId?: number
    expiresAt?: string
    isActive: boolean
    createdAt: string
    updatedAt: string
    user?: {
        id: string
        name: string
        email: string
        image?: string
        player?: {
            steam_id: string
            username: string
            avatar?: string
        }
    }
    admin: {
        id: string
        name: string
        email: string
    }
}

interface BanListProps {
    onRefresh?: () => void
}

export function BanList({ onRefresh }: BanListProps) {
    const [bans, setBans] = useState<Ban[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [banTypeFilter, setBanTypeFilter] = useState('all')
    const [statusFilter, setStatusFilter] = useState('all')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalBans, setTotalBans] = useState(0)
    const [showBanForm, setShowBanForm] = useState(false)
    const [editingBan, setEditingBan] = useState<Ban | null>(null)
    const [banToDelete, setBanToDelete] = useState<string | null>(null)
    const [isSyncing, setIsSyncing] = useState(false)

    const { data: battlemetricsConfig } = useQuery({
        queryKey: ["battlemetricsIntegration"],
        queryFn: async () => {
            const token = getAuthToken();
            const headers: Record<string, string> = { Accept: 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const response = await fetch(backendApi('admin/settings/battlemetrics'), { credentials: 'include', headers });
            if (!response.ok) {
                return null
            }
            return response.json()
        },
    })

    const fetchBans = useCallback(async () => {
        try {
            setLoading(true)
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '10',
                ...(searchTerm && { search: searchTerm }),
                ...(banTypeFilter && banTypeFilter !== 'all' && { banType: banTypeFilter }),
                ...(statusFilter && statusFilter !== 'all' && { isActive: statusFilter })
            })

            const token = getAuthToken();
            const headers: Record<string, string> = { Accept: 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const response = await fetch(backendApi(`admin/bans?${params}`), { credentials: 'include', headers });
            if (response.ok) {
                const data = await response.json()
                setBans(data.bans || [])
                setTotalPages(data.pagination?.pages || 1)
                setTotalBans(data.pagination?.total || 0)
            } else {
                toast.error('Failed to fetch bans')
            }
        } catch (error) {
            console.error('Error fetching bans:', error)
            toast.error('Failed to fetch bans')
        } finally {
            setLoading(false)
        }
    }, [page, searchTerm, banTypeFilter, statusFilter])

    useEffect(() => {
        fetchBans()
    }, [fetchBans])

    const handleDeleteBan = async (banId: string) => {
        try {
            const token = getAuthToken();
            const headers: Record<string, string> = { Accept: 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const response = await fetch(backendApi(`admin/bans/${banId}`), {
                method: 'DELETE',
                credentials: 'include',
                headers,
            });

            if (response.ok) {
                toast.success('Ban cleared successfully')
                setBanToDelete(null)
                fetchBans()
                onRefresh?.()
            } else {
                const error = await response.json()
                toast.error(error.error || 'Failed to clear ban')
                setBanToDelete(null)
            }
        } catch (error) {
            console.error('Error clearing ban:', error)
            toast.error('Failed to clear ban')
            setBanToDelete(null)
        }
    }

    const handleEditBan = (ban: Ban) => {
        setEditingBan(ban)
    }

    useEffect(() => {
        if (editingBan && !showBanForm) {
            setShowBanForm(true)
        }
    }, [editingBan, showBanForm])

    const handleSyncBans = async () => {
        setIsSyncing(true)
        try {
            const token = getAuthToken();
            const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const response = await fetch(backendApi('admin/settings/battlemetrics/sync'), {
                method: 'POST',
                credentials: 'include',
                headers,
            });

            if (response.ok) {
                const data = await response.json()
                if ((data.synced ?? 0) === 0 && (data.errors ?? 0) > 0) {
                    toast.error(data.message || data.error || 'Failed to sync bans from BattleMetrics')
                } else {
                    toast.success(data.message || `Synced ${data.synced} bans from BattleMetrics`)
                }
                fetchBans()
                onRefresh?.()
            } else {
                const error = await response.json()
                toast.error(error.error || 'Failed to sync bans from BattleMetrics')
            }
        } catch (error) {
            console.error('Error syncing bans:', error)
            toast.error('Failed to sync bans from BattleMetrics')
        } finally {
            setIsSyncing(false)
        }
    }

    const getBanTypeIcon = (type: string) => {
        switch (type) {
            case 'GLOBAL':
                return <Globe className="h-4 w-4" />
            case 'CATEGORY':
                return <FolderOpen className="h-4 w-4" />
            case 'INDIVIDUAL':
                return <Server className="h-4 w-4" />
            default:
                return <User className="h-4 w-4" />
        }
    }

    const getBanTypeColor = (type: string) => {
        switch (type) {
            case 'GLOBAL':
                return 'bg-red-100 text-red-800'
            case 'CATEGORY':
                return 'bg-orange-100 text-orange-800'
            case 'INDIVIDUAL':
                return 'bg-yellow-100 text-yellow-800'
            default:
                return 'bg-gray-100 text-gray-800'
        }
    }

    const isExpired = (expiresAt?: string) => {
        if (!expiresAt) return false
        return new Date(expiresAt) < new Date()
    }

    const filteredBans = bans.filter(ban => {
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase()
            const matchesSearch = (
                ban.user?.name?.toLowerCase().includes(searchLower) ||
                ban.user?.email?.toLowerCase().includes(searchLower) ||
                ban.reason.toLowerCase().includes(searchLower)
            )
            if (!matchesSearch) return false
        }
        
        if (banTypeFilter !== 'all' && ban.banType !== banTypeFilter) {
            return false
        }
        
        if (statusFilter !== 'all') {
            const isActive = statusFilter === 'true'
            if (ban.isActive !== isActive) {
                return false
            }
        }
        
        return true
    })

    return (
        <div className="space-y-6">
            <AlertDialog open={!!banToDelete} onOpenChange={(open) => !open && setBanToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Clear ban</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will remove the ban. The user will no longer be restricted by this ban. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => banToDelete && handleDeleteBan(banToDelete)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Clear ban
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold">Ban Management</h2>
                    <p className="text-gray-600">Manage user bans across servers</p>
                </div>
                <div className="flex gap-2">
                    {battlemetricsConfig?.enabled && (
                        <Button
                            variant="outline"
                            onClick={handleSyncBans}
                            disabled={isSyncing}
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                            {isSyncing ? 'Syncing...' : 'Sync Bans from BattleMetrics'}
                        </Button>
                    )}
                    <Dialog open={showBanForm} onOpenChange={(open) => {
                        setShowBanForm(open)
                        if (!open) setEditingBan(null)
                    }}>
                        <DialogTrigger asChild>
                            <Button onClick={() => setEditingBan(null)}>Create New Ban</Button>
                        </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>
                                {editingBan ? 'Edit Ban' : 'Create New Ban'}
                            </DialogTitle>
                            <DialogDescription>
                                {editingBan ? 'Update ban details' : 'Ban a user from servers with different scope options'}
                            </DialogDescription>
                        </DialogHeader>
                        <BanForm
                            hideTitle
                            onSuccess={() => {
                                setShowBanForm(false)
                                setEditingBan(null)
                                fetchBans()
                                onRefresh?.()
                            }}
                            onCancel={() => {
                                setShowBanForm(false)
                                setEditingBan(null)
                            }}
                            initialData={editingBan ? {
                                userId: editingBan.userId,
                                reason: editingBan.reason,
                                banType: editingBan.banType,
                                serverId: editingBan.serverId,
                                categoryId: editingBan.categoryId,
                                expiresAt: editingBan.expiresAt,
                                userDisplay: editingBan.user ? {
                                    name: editingBan.user.name,
                                    email: editingBan.user.email,
                                    image: editingBan.user.image,
                                } : undefined,
                            } : undefined}
                        />
                    </DialogContent>
                </Dialog>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Filters</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Search</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Search users or reasons..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Ban Type</label>
                            <Select value={banTypeFilter} onValueChange={setBanTypeFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All types" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All types</SelectItem>
                                    <SelectItem value="GLOBAL">Global</SelectItem>
                                    <SelectItem value="CATEGORY">Category</SelectItem>
                                    <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Status</label>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All statuses</SelectItem>
                                    <SelectItem value="true">Active</SelectItem>
                                    <SelectItem value="false">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">&nbsp;</label>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setSearchTerm('')
                                    setBanTypeFilter('all')
                                    setStatusFilter('all')
                                    setPage(1)
                                }}
                                className="w-full"
                            >
                                Clear Filters
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Bans ({totalBans})</CardTitle>
                    <CardDescription>
                        Manage and monitor user bans
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                            <p className="mt-2 text-gray-500">Loading bans...</p>
                        </div>
                    ) : filteredBans.length === 0 ? (
                        <div className="text-center py-8">
                            <User className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium">No bans found</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                {searchTerm || (banTypeFilter !== 'all') || (statusFilter !== 'all')
                                    ? "Try adjusting your filters"
                                    : "Get started by creating a new ban"
                                }
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredBans.map((ban) => (
                                <div key={ban.id} className="border rounded-lg p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-3 mb-2">
                                                {(ban.user?.image || ban.user?.player?.avatar) && (
                                                    <Image
                                                        src={ban.user?.image || ban.user?.player?.avatar || ''}
                                                        alt={ban.user?.name || ban.user?.player?.username || 'User'}
                                                        width={32}
                                                        height={32}
                                                        className="h-8 w-8 rounded-full"
                                                    />
                                                )}
                                                <div>
                                                    <h3 className="font-medium">
                                                        {ban.user?.name || 
                                                         ban.user?.player?.username || 
                                                         (ban.userId.match(/^\d{17}$/) ? `Steam ID: ${ban.userId}` : 'Unknown User')}
                                                    </h3>
                                                    <p className="text-sm text-gray-500">
                                                        {ban.user?.email || 
                                                         ban.user?.player?.steam_id || 
                                                         (ban.userId.match(/^\d{17}$/) ? `${ban.userId}@steamcommunity.com` : '')}
                                                    </p>
                                                </div>
                                                <Badge className={getBanTypeColor(ban.banType)}>
                                                    <div className="flex items-center space-x-1">
                                                        {getBanTypeIcon(ban.banType)}
                                                        <span>{ban.banType}</span>
                                                    </div>
                                                </Badge>
                                                {!ban.isActive && (
                                                    <Badge variant="secondary">Inactive</Badge>
                                                )}
                                                {ban.expiresAt && isExpired(ban.expiresAt) && (
                                                    <Badge variant="destructive">Expired</Badge>
                                                )}
                                            </div>
                                            
                                            <p className="text-sm text-gray-700 mb-2">{ban.reason}</p>
                                            
                                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                                                <div className="flex items-center space-x-1">
                                                    <Clock className="h-4 w-4" />
                                                    <span>Created: {format(new Date(ban.createdAt), 'MMM d, yyyy h:mm a')}</span>
                                                </div>
                                                {ban.expiresAt && (
                                                    <div className="flex items-center space-x-1">
                                                        <Clock className="h-4 w-4" />
                                                        <span>Expires: {format(new Date(ban.expiresAt), 'MMM d, yyyy h:mm a')}</span>
                                                    </div>
                                                )}
                                                {ban.serverId && (
                                                    <div className="flex items-center space-x-1">
                                                        <Server className="h-4 w-4" />
                                                        <span>Server ID: {ban.serverId}</span>
                                                    </div>
                                                )}
                                                {ban.categoryId && (
                                                    <div className="flex items-center space-x-1">
                                                        <FolderOpen className="h-4 w-4" />
                                                        <span>Category ID: {ban.categoryId}</span>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div className="text-xs text-gray-400 mt-1">
                                                Banned by: {ban.admin.name || ban.admin.email}
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center space-x-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleEditBan(ban)}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setBanToDelete(ban.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {totalPages > 1 && (
                        <div className="flex justify-center items-center space-x-2 mt-6">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                                disabled={page === 1}
                            >
                                Previous
                            </Button>
                            <span className="text-sm text-gray-500">
                                Page {page} of {totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={page === totalPages}
                            >
                                Next
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
