"use client"

import { useState, useEffect } from "react"
import { backendApi } from "@/lib/api"
import { getAuthToken } from "@/lib/laravel-auth"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { TimePicker } from "@/components/time-picker"
import { CalendarIcon, Clock, User, Server, FolderOpen, Globe } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface BanFormProps {
    onSuccess?: () => void
    onCancel?: () => void
    hideTitle?: boolean
    initialData?: {
        userId?: string
        reason?: string
        banType?: string
        serverId?: string
        categoryId?: number
        expiresAt?: string
        userDisplay?: { name?: string | null; email?: string | null; image?: string | null }
    }
}

interface User {
    id: string
    name: string
    email: string | null
    image?: string
    type: 'user' | 'linked' | 'player' | 'steam_group'
    steamId?: string
    username?: string
    linkedUsers?: Array<{
        id: string
        name: string
        image?: string
        type: 'player'
    }>
}

interface Server {
    server_id: string
    server_name: string
    categoryId: number
}

interface Category {
    id: number
    name: string
}

export function BanForm({ onSuccess, onCancel, hideTitle, initialData }: BanFormProps) {
    const [formData, setFormData] = useState({
        userId: initialData?.userId || '',
        reason: initialData?.reason || '',
        banType: initialData?.banType || 'INDIVIDUAL',
        serverId: initialData?.serverId || '',
        categoryId: initialData?.categoryId || 0,
        expiresAt: initialData?.expiresAt || '',
        isPermanent: !initialData?.expiresAt
    })

    const [users, setUsers] = useState<User[]>([])
    const [servers, setServers] = useState<Server[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [showUserSearch, setShowUserSearch] = useState(false)
    const isEditMode = Boolean(initialData?.userId)
    const [selectedUser, setSelectedUser] = useState<User | null>(() => {
        if (initialData?.userId && initialData?.userDisplay) {
            return {
                id: initialData.userId,
                name: initialData.userDisplay.name ?? 'Selected user',
                email: initialData.userDisplay.email ?? null,
                image: initialData.userDisplay.image ?? undefined,
                type: 'user',
            }
        }
        if (initialData?.userId) {
            return {
                id: initialData.userId,
                name: 'Selected user',
                email: null,
                type: 'user',
            }
        }
        return null
    })
    const [timePickerDate, setTimePickerDate] = useState<Date>(new Date())

    useEffect(() => {
        fetchServers()
        fetchCategories()
        
        if (formData.expiresAt) {
            setTimePickerDate(new Date(formData.expiresAt))
        }
    }, [formData.expiresAt])

    useEffect(() => {
        if (initialData?.userId) {
            setSelectedUser({
                id: initialData.userId,
                name: initialData.userDisplay?.name ?? 'Selected user',
                email: initialData.userDisplay?.email ?? null,
                image: initialData.userDisplay?.image ?? undefined,
                type: 'user',
            })
        } else {
            setSelectedUser(null)
        }
    }, [initialData?.userId, initialData?.userDisplay?.name, initialData?.userDisplay?.email, initialData?.userDisplay?.image])

    const fetchServers = async () => {
        try {
            const token = getAuthToken();
            const headers: Record<string, string> = { Accept: 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const response = await fetch(backendApi('admin/servers'), { credentials: 'include', headers });
            if (response.ok) {
                const data = await response.json()
                setServers(data.servers || [])
            }
        } catch (error) {
            console.error('Failed to fetch servers:', error)
        }
    }

    const fetchCategories = async () => {
        try {
            const token = getAuthToken();
            const headers: Record<string, string> = { Accept: 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const response = await fetch(backendApi('admin/server-categories'), { credentials: 'include', headers });
            if (response.ok) {
                const data = await response.json()
                setCategories(data.categories || [])
            }
        } catch (error) {
            console.error('Failed to fetch categories:', error)
        }
    }

    const searchUsers = async (query: string) => {
        if (query.length < 2) return

        try {
            const token = getAuthToken();
            const headers: Record<string, string> = { Accept: 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const response = await fetch(backendApi(`admin/users/search?q=${encodeURIComponent(query)}`), { credentials: 'include', headers });
            if (response.ok) {
                const data = await response.json()
                setUsers(data.users || [])
            }
        } catch (error) {
            console.error('Failed to search users:', error)
        }
    }

    const handleUserSelect = (user: User) => {
        setSelectedUser(user)
        let steamIdFromEmail = null
        if (user.email && user.email.includes('@steamcommunity.com')) {
            const emailMatch = user.email.match(/^(\d{17})@steamcommunity\.com$/)
            if (emailMatch) {
                steamIdFromEmail = emailMatch[1]
            }
        }
        
        if (user.steamId) {
            setFormData(prev => ({ ...prev, userId: user.steamId! }))
        } else if (steamIdFromEmail) {
            setFormData(prev => ({ ...prev, userId: steamIdFromEmail }))
        } else if (user.type === 'steam_group') {
            setFormData(prev => ({ ...prev, userId: user.id }))
        } else if (user.type === 'player') {
            setFormData(prev => ({ ...prev, userId: user.id }))
        } else {
            setFormData(prev => ({ ...prev, userId: user.id }))
        }
        setShowUserSearch(false)
        setSearchTerm('')
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const payload = {
                userId: formData.userId,
                reason: formData.reason,
                banType: formData.banType,
                serverId: formData.banType === 'INDIVIDUAL' ? formData.serverId : undefined,
                categoryId: formData.banType === 'CATEGORY' ? formData.categoryId : undefined,
                expiresAt: formData.isPermanent ? null : formData.expiresAt
            }

            const token = getAuthToken();
            const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const response = await fetch(backendApi('admin/bans'), {
                method: 'POST',
                credentials: 'include',
                headers,
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                toast.success('Ban created successfully')
                onSuccess?.()
            } else {
                const error = await response.json()
                toast.error(error.error || 'Failed to create ban')
            }
        } catch (error) {
            console.error('Error creating ban:', error)
            toast.error('Failed to create ban')
        } finally {
            setLoading(false)
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

    const getBanTypeDescription = (type: string) => {
        switch (type) {
            case 'GLOBAL':
                return 'Ban from all servers'
            case 'CATEGORY':
                return 'Ban from specific server category'
            case 'INDIVIDUAL':
                return 'Ban from specific server'
            default:
                return ''
        }
    }

    return (
        <Card>
            {!hideTitle && (
                <CardHeader>
                    <CardTitle>{isEditMode ? 'Edit Ban' : 'Create New Ban'}</CardTitle>
                    <CardDescription>
                        {isEditMode ? 'Update ban details' : 'Ban a user from servers with different scope options'}
                    </CardDescription>
                </CardHeader>
            )}
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="user">User</Label>
                        <div className="relative">
                            {!isEditMode && (
                                <>
                            <Input
                                id="user"
                                placeholder="Search for user by name or steamid..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value)
                                    searchUsers(e.target.value)
                                    setShowUserSearch(true)
                                }}
                                onFocus={() => setShowUserSearch(true)}
                            />
                            {showUserSearch && users.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                    {users.map((user) => (
                                        <div
                                            key={user.id}
                                            className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer flex items-start space-x-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                                            onClick={() => handleUserSelect(user)}
                                        >
                                            {user.image && (
                                                <Image
                                                    src={user.image}
                                                    alt={user.name || ''}
                                                    width={40}
                                                    height={40}
                                                    className="h-10 w-10 rounded-full border-2 border-gray-200 dark:border-gray-600 flex-shrink-0"
                                                />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center space-x-2 mb-1">
                                                    <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                                                        {user.name || 'No name'}
                                                    </p>
                                                    {user.type === 'player' && (
                                                        <span className="rounded-full bg-zinc-200 px-2 py-1 text-xs font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                                                            Player
                                                        </span>
                                                    )}
                                                    {user.type === 'linked' && (
                                                        <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded-full font-medium">
                                                            Linked
                                                        </span>
                                                    )}
                                                    {user.type === 'user' && (
                                                        <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded-full font-medium">
                                                            User
                                                        </span>
                                                    )}
                                                    {user.type === 'steam_group' && (
                                                        <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded-full font-medium">
                                                            Steam Group
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="space-y-1">
                                                    {user.email && (
                                                        <div className="flex items-center space-x-2">
                                                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Email:</span>
                                                            <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{user.email}</span>
                                                        </div>
                                                    )}
                                                    {user.steamId && (
                                                        <div className="flex items-center space-x-2">
                                                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Steam ID:</span>
                                                            <span className="text-xs text-gray-700 dark:text-gray-300 font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                                                {user.steamId}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {user.username && (user.type === 'player' || user.type === 'steam_group') && (
                                                        <div className="flex items-center space-x-2">
                                                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Username:</span>
                                                            <span className="text-xs text-gray-700 dark:text-gray-300">{user.username}</span>
                                                        </div>
                                                    )}
                                                    {user.linkedUsers && user.linkedUsers.length > 0 && (
                                                        <div className="mt-2">
                                                            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
                                                                Additional accounts ({user.linkedUsers.length}):
                                                            </div>
                                                            <div className="space-y-1">
                                                                {user.linkedUsers.map((linkedUser, index) => (
                                                                    <div key={linkedUser.id} className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400">
                                                                        <span>•</span>
                                                                        <span>{linkedUser.name}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                                </>
                            )}
                        </div>
                        {selectedUser && (
                            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                <div className="flex items-start space-x-3">
                                    {selectedUser.image && (
                                        <Image
                                            src={selectedUser.image}
                                            alt={selectedUser.name || ''}
                                            width={40}
                                            height={40}
                                            className="h-10 w-10 rounded-full border-2 border-gray-200 dark:border-gray-600"
                                        />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center space-x-2 mb-1">
                                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                                                {selectedUser.name || 'No name'}
                                            </span>
                                            {selectedUser.type === 'player' && (
                                                <span className="rounded-full bg-zinc-200 px-2 py-1 text-xs font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                                                    Player
                                                </span>
                                            )}
                                            {selectedUser.type === 'linked' && (
                                                <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded-full font-medium">
                                                    Linked
                                                </span>
                                            )}
                                            {selectedUser.type === 'user' && (
                                                <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded-full font-medium">
                                                    User
                                                </span>
                                            )}
                                            {selectedUser.type === 'steam_group' && (
                                                <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded-full font-medium">
                                                    Steam Group
                                                </span>
                                            )}
                                        </div>
                                        <div className="space-y-1">
                                            {selectedUser.email && (
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Email:</span>
                                                    <span className="text-xs text-gray-700 dark:text-gray-300">{selectedUser.email}</span>
                                                </div>
                                            )}
                                            {selectedUser.steamId && (
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Steam ID:</span>
                                                    <span className="text-xs text-gray-700 dark:text-gray-300 font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                                        {selectedUser.steamId}
                                                    </span>
                                                </div>
                                            )}
                                            {selectedUser.username && (selectedUser.type === 'player' || selectedUser.type === 'steam_group') && (
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Username:</span>
                                                    <span className="text-xs text-gray-700 dark:text-gray-300">{selectedUser.username}</span>
                                                </div>
                                            )}
                                            {selectedUser.linkedUsers && selectedUser.linkedUsers.length > 0 && (
                                                <div className="mt-2">
                                                    <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
                                                        Additional accounts ({selectedUser.linkedUsers.length}):
                                                    </div>
                                                    <div className="space-y-1">
                                                        {selectedUser.linkedUsers.map((linkedUser, index) => (
                                                            <div key={linkedUser.id} className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400">
                                                                <span>•</span>
                                                                <span>{linkedUser.name}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="banType">Ban Type</Label>
                        <Select
                            value={formData.banType}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, banType: value }))}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="GLOBAL">
                                    <div className="flex items-center space-x-2">
                                        {getBanTypeIcon('GLOBAL')}
                                        <span>Global Ban</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="CATEGORY">
                                    <div className="flex items-center space-x-2">
                                        {getBanTypeIcon('CATEGORY')}
                                        <span>Category Ban</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="INDIVIDUAL">
                                    <div className="flex items-center space-x-2">
                                        {getBanTypeIcon('INDIVIDUAL')}
                                        <span>Individual Server Ban</span>
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-sm text-gray-500">
                            {getBanTypeDescription(formData.banType)}
                        </p>
                    </div>

                    {formData.banType === 'INDIVIDUAL' && (
                        <div className="space-y-2">
                            <Label htmlFor="server">Server</Label>
                            <Select
                                value={formData.serverId}
                                onValueChange={(value) => setFormData(prev => ({ ...prev, serverId: value }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a server" />
                                </SelectTrigger>
                                <SelectContent>
                                    {servers.map((server) => (
                                        <SelectItem key={server.server_id} value={server.server_id}>
                                            {server.server_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {formData.banType === 'CATEGORY' && (
                        <div className="space-y-2">
                            <Label htmlFor="category">Category</Label>
                            <Select
                                value={formData.categoryId.toString()}
                                onValueChange={(value) => setFormData(prev => ({ ...prev, categoryId: parseInt(value) }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((category) => (
                                        <SelectItem key={category.id} value={category.id.toString()}>
                                            {category.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="reason">Reason</Label>
                        <Textarea
                            id="reason"
                            placeholder="Enter ban reason..."
                            value={formData.reason}
                            onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                            required
                        />
                    </div>

                    <div className="space-y-4">
                        <Label>Duration</Label>
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="isPermanent"
                                checked={formData.isPermanent}
                                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPermanent: checked === true }))}
                            />
                            <Label htmlFor="isPermanent" className="cursor-pointer font-normal">Permanent ban</Label>
                        </div>

                        {!formData.isPermanent && (
                            <div className="space-y-2">
                                <Label>Expiration Date & Time</Label>
                                <Popover modal={true}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !formData.expiresAt && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {formData.expiresAt ? format(new Date(formData.expiresAt), "PPpp") : "Pick a date and time"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={formData.expiresAt ? new Date(formData.expiresAt) : undefined}
                                            onSelect={(date) => {
                                                if (date) {
                                                    const currentTime = formData.expiresAt ? new Date(formData.expiresAt) : new Date()
                                                    const newDateTime = new Date(date)
                                                    newDateTime.setHours(currentTime.getHours())
                                                    newDateTime.setMinutes(currentTime.getMinutes())
                                                    newDateTime.setSeconds(currentTime.getSeconds())
                                                    setTimePickerDate(newDateTime)
                                                    setFormData(prev => ({ ...prev, expiresAt: newDateTime.toISOString() }))
                                                }
                                            }}
                                            disabled={(date) => date < new Date()}
                                        />
                                        <div className="flex justify-center p-3 border-t border-border/15">
                                            <TimePicker
                                                setDate={(date) => {
                                                    if (date) {
                                                        setTimePickerDate(date)
                                                        setFormData(prev => ({ ...prev, expiresAt: date.toISOString() }))
                                                    }
                                                }}
                                                date={timePickerDate}
                                            />
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end space-x-2">
                        {onCancel && (
                            <Button type="button" variant="outline" onClick={onCancel}>
                                Cancel
                            </Button>
                        )}
                        <Button type="submit" disabled={loading || !formData.userId || !formData.reason}>
                            {loading ? 'Creating...' : 'Create Ban'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}
