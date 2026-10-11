'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { backendApi } from '@/lib/api'
import { getAuthToken } from '@/lib/laravel-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { getCategories } from '@/app/actions/admin'
import { Loader2, Info } from 'lucide-react'
import { WIPE_SCHEDULE_OPTIONS } from '@/lib/wipe-schedule-presets'
import Image from 'next/image'
import { PterodactylServerPicker, type PterodactylServerOption } from '@/components/admin/servers/pterodactyl-server-picker'
import { ServerTagPicker } from '@/components/admin/servers/server-tag-picker'

interface ServerFormData {
    id: string
    name: string
    categoryId: string
    order: number
    image_path: string
    server_address: string
    current_map_thumbnail_url: string
    wipe_schedule: string
}

export function AddServerForm() {
    const [open, setOpen] = useState(false)
    const [infoHoverOpen, setInfoHoverOpen] = useState(false)
    const [pterodactylPanelId, setPterodactylPanelId] = useState<number | null>(null)
    const [pterodactylServerIdentifier, setPterodactylServerIdentifier] = useState<string | null>(null)
    const [tagIds, setTagIds] = useState<number[]>([])
    const router = useRouter()
    const { control, register, handleSubmit, reset, setValue } = useForm<ServerFormData>({
        defaultValues: {
            wipe_schedule: 'auto',
            current_map_thumbnail_url: '',
        },
    })
    const { data: categories, isLoading: isCategoriesLoading } = useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            const result = await getCategories();
            if (result.error) {
                throw new Error(result.error);
            }
            return result.data;
        },
    })
    const queryClient = useQueryClient()

    const categoriesMemo = useMemo(() => categories?.map((category) => ({
        id: category.id,
        name: category.name
    })).flat(), [categories])

    const mutation = useMutation({
        mutationFn: async (data: ServerFormData) => {
            const token = getAuthToken();
            const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const response = await fetch(backendApi('admin/servers'), {
                method: 'POST',
                credentials: 'include',
                headers,
                body: JSON.stringify({
                    ...data,
                    categoryId: parseInt(data.categoryId, 10),
                    image_path: data.image_path || null,
                    current_map_thumbnail_url: data.current_map_thumbnail_url?.trim() || null,
                    wipe_schedule: data.wipe_schedule || 'auto',
                    pterodactylPanelId: pterodactylPanelId,
                    pterodactylServerIdentifier: pterodactylServerIdentifier,
                    tagIds,
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
            reset()
            setPterodactylPanelId(null)
            setPterodactylServerIdentifier(null)
            setTagIds([])
            setOpen(false)
            queryClient.invalidateQueries({ queryKey: ['fetch-server-list'] })
            queryClient.invalidateQueries({ queryKey: ['serverData'] })
            queryClient.invalidateQueries({ queryKey: ['categories'] })
            router.refresh()
            toast.success('Server added successfully')
        },
        onError: (error) => {
            toast.error(error.message || `Failed to complete request`)
        },
    })

    const onSubmit = (data: ServerFormData) => {
        mutation.mutate({
            ...data,
        })
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>Add Server</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New Server</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <PterodactylServerPicker
                        panelId={pterodactylPanelId}
                        serverIdentifier={pterodactylServerIdentifier}
                        onPanelChange={setPterodactylPanelId}
                        onServerChange={(id) => setPterodactylServerIdentifier(id)}
                        onServerSelected={(server: PterodactylServerOption) => {
                            setValue('name', server.name, { shouldDirty: true })
                            if (server.address) {
                                setValue('server_address', server.address, { shouldDirty: true })
                            }
                        }}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            {...register('name', { required: true })}
                            type="text"
                            placeholder="Server Name"
                        />
                        <div className="relative">
                            <Input
                                {...register('id', { required: true })}
                                type="text"
                                placeholder="Server ID"
                            />
                            <Popover open={infoHoverOpen} onOpenChange={setInfoHoverOpen}>
                                <PopoverTrigger asChild>
                                    <button
                                        type="button"
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
                        </div>
                    </div>
                    <ServerTagPicker value={tagIds} onChange={setTagIds} />
                    <Controller
                        name="categoryId"
                        control={control}
                        rules={{ required: true }}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                                {isCategoriesLoading ? (
                                    <SelectContent>
                                        <SelectItem key={0} value={"0"}>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        </SelectItem>
                                    </SelectContent>
                                ) : (
                                    <SelectContent>
                                        {categoriesMemo?.map((category) => (
                                            <SelectItem key={category.id} value={category.id.toString()}>
                                                {category.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                )}
                            </Select>
                        )}
                    />
                    <Controller
                        name="wipe_schedule"
                        control={control}
                        render={({ field }) => (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Wipe schedule</label>
                                <Select onValueChange={field.onChange} value={field.value || 'auto'}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Cadence" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {WIPE_SCHEDULE_OPTIONS.map((o) => (
                                            <SelectItem key={o.value} value={o.value}>
                                                {o.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    Used for the public server details popup (or Automatic from leaderboard / BM).
                                </p>
                            </div>
                        )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            {...register('server_address')}
                            type="text"
                            placeholder="Server Address (optional)"
                        />
                        <Input
                            {...register('image_path')}
                            type="text"
                            placeholder="Header Image Path (optional)"
                        />
                    </div>
                    <Input
                        {...register('current_map_thumbnail_url')}
                        type="url"
                        placeholder="Current map thumbnail URL — content.rustmaps.com (optional)"
                    />
                    <p className="text-xs text-muted-foreground -mt-2">
                        Overrides BattleMetrics for map preview and 3D viewer on the public server list.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            {...register('order', { required: true, valueAsNumber: true })}
                            type="number"
                            placeholder="Order"
                        />
                        <Button type="submit" disabled={mutation.isPending} className="w-full">
                            {mutation.isPending ? 'Adding...' : 'Add Server'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog >
    )
}
