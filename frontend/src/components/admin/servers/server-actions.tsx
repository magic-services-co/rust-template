'use client'

import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { backendApi } from '@/lib/api'
import { getAuthToken } from '@/lib/laravel-auth'
import { Button } from '@/components/ui/button'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'
import { Info } from 'lucide-react'
import Image from 'next/image'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { WIPE_SCHEDULE_OPTIONS, WIPE_SCHEDULE_VALUES } from '@/lib/wipe-schedule-presets'
import { PterodactylServerPicker } from '@/components/admin/servers/pterodactyl-server-picker'
import { PterodactylConsoleDialog } from '@/components/admin/servers/pterodactyl-console-dialog'
import { ServerTagPicker } from '@/components/admin/servers/server-tag-picker'

interface ServerActionsProps {
    serverId: string;
    serverName: string;
    enabled: boolean;
    serverImagePath: string | null;
    serverAddress: string | null;
    wipeSchedule?: string | null;
    currentMapThumbnailUrl?: string | null;
    pterodactylPanelId?: number | null;
    pterodactylServerIdentifier?: string | null;
    tagIds?: number[];
}

const serverFormSchema = z.object({
    server_id: z.string().min(1, 'Server ID is required'),
    enabled: z.boolean().default(true),
    name: z.string().min(1, 'Server name is required'),
    image_path: z.string().nullable(),
    server_address: z.string().nullable(),
    wipe_schedule: z
        .string()
        .refine((v) => (WIPE_SCHEDULE_VALUES as readonly string[]).includes(v), {
            message: 'Invalid wipe schedule',
        }),
    current_map_thumbnail_url: z.union([z.string().max(2048, 'URL is too long'), z.null()]).optional(),
    tagIds: z.array(z.number()).default([]),
})

type ServerFormData = z.output<typeof serverFormSchema>

export function ServerActions({
    serverId,
    serverName,
    enabled,
    serverImagePath,
    serverAddress,
    wipeSchedule,
    currentMapThumbnailUrl,
    pterodactylPanelId,
    pterodactylServerIdentifier,
    tagIds = [],
}: ServerActionsProps) {
    const router = useRouter()
    const queryClient = useQueryClient()
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [isConsoleOpen, setIsConsoleOpen] = useState(false)
    const [infoHoverOpen, setInfoHoverOpen] = useState(false)
    const [ptPanelId, setPtPanelId] = useState<number | null>(pterodactylPanelId ?? null)
    const [ptServerId, setPtServerId] = useState<string | null>(pterodactylServerIdentifier ?? null)

    const form = useForm<z.input<typeof serverFormSchema>, any, ServerFormData>({
        resolver: zodResolver(serverFormSchema),
        defaultValues: {
            server_id: serverId,
            enabled: enabled,
            name: serverName,
            image_path: serverImagePath,
            server_address: serverAddress,
            wipe_schedule: (wipeSchedule && WIPE_SCHEDULE_VALUES.includes(wipeSchedule as typeof WIPE_SCHEDULE_VALUES[number]))
                ? wipeSchedule
                : 'auto',
            current_map_thumbnail_url: currentMapThumbnailUrl ?? null,
            tagIds,
        },
    })

    const deleteMutation = useMutation({
        mutationFn: async () => {
            const token = getAuthToken();
            const headers: Record<string, string> = { Accept: 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const response = await fetch(backendApi(`admin/servers?id=${serverId}`), {
                method: 'DELETE',
                credentials: 'include',
                headers,
            })
            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error("You are not authorized to do this.")
                }
                throw new Error('Failed to complete request');
            }
            return response.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['servers'] })
            queryClient.invalidateQueries({ queryKey: ['categories'] })
            router.refresh()
            toast.success('Server deleted successfully')
        },
        onError: (error) => {
            toast.error(error.message || `Failed to complete request`)
        },
    })

    const updateMutation = useMutation({
        mutationFn: async (data: ServerFormData) => {
            const token = getAuthToken();
            const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const response = await fetch(backendApi('admin/servers'), {
                method: 'PUT',
                credentials: 'include',
                headers,
                body: JSON.stringify({
                    oldServerId: serverId,
                    serverId: data.server_id,
                    name: data.name,
                    imagePath: data.image_path,
                    serverAddress: data.server_address,
                    enabled: data.enabled,
                    wipeSchedule: data.wipe_schedule,
                    currentMapThumbnailUrl: (data.current_map_thumbnail_url?.trim() ?? '') || null,
                    pterodactylPanelId: ptPanelId,
                    pterodactylServerIdentifier: ptServerId,
                    tagIds: data.tagIds,
                }),
            })
            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error("You are not authorized to do this.")
                }
                throw new Error('Failed to complete request');
            }
            return response.json()
        },
        onSuccess: () => {
            setIsEditDialogOpen(false)
            queryClient.invalidateQueries({ queryKey: ['servers'] })
            queryClient.invalidateQueries({ queryKey: ['categories'] })
            router.refresh()
            toast.success('Server updated successfully')
        },
        onError: (error) => {
            toast.error(error.message || `Failed to complete request`)
        },
    })

    const handleDelete = () => {
        deleteMutation.mutate()
    }

    const handleEdit = () => {
        setIsEditDialogOpen(true)
        form.reset({
            server_id: serverId,
            enabled: enabled,
            name: serverName,
            image_path: serverImagePath,
            server_address: serverAddress,
            wipe_schedule: (wipeSchedule && WIPE_SCHEDULE_VALUES.includes(wipeSchedule as typeof WIPE_SCHEDULE_VALUES[number]))
                ? wipeSchedule
                : 'auto',
            current_map_thumbnail_url: currentMapThumbnailUrl ?? null,
            tagIds,
        })
        setPtPanelId(pterodactylPanelId ?? null)
        setPtServerId(pterodactylServerIdentifier ?? null)
    }

    function onSubmit(data: ServerFormData) {
        updateMutation.mutate(data)
    }

    const hasPterodactyl =
        pterodactylPanelId != null && Boolean(pterodactylServerIdentifier?.trim())

    return (
        <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={() => setIsConsoleOpen(true)}>
                Console
            </Button>
            <PterodactylConsoleDialog
                serverId={serverId}
                serverName={serverName}
                hasPterodactyl={hasPterodactyl}
                open={isConsoleOpen}
                onOpenChange={setIsConsoleOpen}
            />
            <Button onClick={handleEdit} disabled={updateMutation.isPending}>Edit</Button>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={deleteMutation.isPending}>
                        {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the server
                            and all associated data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Server</DialogTitle>
                        <DialogDescription>
                            Make changes to the server details below. Click save when you&apos;re done.
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <PterodactylServerPicker
                                panelId={ptPanelId}
                                serverIdentifier={ptServerId}
                                onPanelChange={setPtPanelId}
                                onServerChange={(id) => setPtServerId(id)}
                            />
                            <FormField
                                control={form.control}
                                name="enabled"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border/15 p-4">
                                        <div className="space-y-0.5">
                                            <FormLabel>
                                                Enable Server
                                            </FormLabel>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value !== false}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Server Name</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="server_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="inline-flex items-center gap-2">
                                                Server ID
                                                <Popover open={infoHoverOpen} onOpenChange={setInfoHoverOpen}>
                                                    <PopoverTrigger asChild>
                                                        <button
                                                            type="button"
                                                            className="text-muted-foreground hover:text-foreground"
                                                            onMouseEnter={() => setInfoHoverOpen(true)}
                                                            onMouseLeave={() => setInfoHoverOpen(false)}
                                                        >
                                                            <Info className="h-4 w-4" />
                                                        </button>
                                                    </PopoverTrigger>
                                                    <PopoverContent 
                                                        className="w-[600px] p-4" 
                                                        side="right"
                                                        align="start"
                                                        onMouseEnter={() => setInfoHoverOpen(true)}
                                                        onMouseLeave={() => setInfoHoverOpen(false)}
                                                    >
                                                        <div className="space-y-4">
                                                            <h4 className="font-semibold text-sm">Server ID - BattleMetrics ID</h4>
                                                            <p className="text-sm text-muted-foreground">
                                                                This is the server&apos;s BattleMetrics ID. You can find this ID in your server&apos;s BattleMetrics page URL.
                                                            </p>
                                                            <div className="flex justify-center">
                                                                <Image
                                                                    src="/info/bm/id.png"
                                                                    alt="BattleMetrics ID location"
                                                                    width={600}
                                                                    height={400}
                                                                    className="rounded-md border"
                                                                />
                                                            </div>
                                                        </div>
                                                    </PopoverContent>
                                                </Popover>
                                            </FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <FormField
                                control={form.control}
                                name="wipe_schedule"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Wipe schedule</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select cadence" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {WIPE_SCHEDULE_OPTIONS.map((o) => (
                                                    <SelectItem key={o.value} value={o.value}>
                                                        {o.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormDescription>
                                            Controls upcoming wipe dates on the public server details popup. Choose Automatic to derive timing from leaderboard history and BattleMetrics.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="current_map_thumbnail_url"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Current map thumbnail URL (optional)</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                value={field.value ?? ''}
                                                onChange={(e) => field.onChange(e.target.value || null)}
                                                placeholder="https://content.rustmaps.com/maps/…"
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            RustMaps CDN thumbnail (content.rustmaps.com). When set, overrides BattleMetrics for the server card map preview and the 3D viewer.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="tagIds"
                                render={({ field }) => (
                                    <FormItem>
                                        <ServerTagPicker value={field.value ?? []} onChange={field.onChange} />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="server_address"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Server Address (optional)</FormLabel>
                                            <FormControl>
                                                <Input {...field} value={field.value || ''} onChange={(e) => field.onChange(e.target.value || null)} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="image_path"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Header Image Path (optional)</FormLabel>
                                            <FormControl>
                                                <Input {...field} value={field.value || ''} onChange={(e) => field.onChange(e.target.value || null)} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={updateMutation.isPending}>
                                    {updateMutation.isPending ? 'Saving...' : 'Save'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
