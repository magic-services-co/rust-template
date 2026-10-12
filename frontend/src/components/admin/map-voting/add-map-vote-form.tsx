"use client";

import { backendApi } from "@/lib/api";
import { getAuthToken } from "@/lib/laravel-auth";
import { ServerCombobox } from "@/components/server-combobox";
import { TimePicker } from "@/components/time-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon, Trash, Loader2, Link2, ImageIcon } from "lucide-react";
import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { toast } from "sonner";
import { useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { UploadFile } from "@/components/upload-file";
import Image from "next/image";
import { RustmapsCustomGeneratePanel } from "@/components/admin/map-voting/rustmaps-custom-generate-panel";

export type MapOptionStyle = "rustmaps" | "custom";

const mapVoteFormSchema = z.object({
    server: z.string().min(1, "Server is required"),
    vote_start: z.date({ message: "Vote start date is required" }),
    vote_end: z.date({ message: "Vote end date is required" }),
    map_start: z.date({ message: "Map start date is required" }),
    map_options: z.array(z.any()).min(2, "At least two map options are required").max(20, "Maximum 20 map options allowed"),
});

export type MapVoteFormData = z.infer<typeof mapVoteFormSchema>;

export function AddMapVoteForm() {
    const [open, setOpen] = useState(false)
    const queryClient = useQueryClient()
    const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)
    const { data: config } = useQuery({
        queryKey: ['mapVotingConfig'],
        queryFn: async () => {
            const token = getAuthToken();
            const headers: Record<string, string> = { Accept: 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const response = await fetch(backendApi('admin/map-voting/config'), { credentials: 'include', headers });
            if (!response.ok) throw new Error('Failed to fetch config');
            return response.json()
        },
    })

    const isLocalCdnConfigured = config?.isLocalCdnConfigured ?? false
    const rustmapsCustomGenerationEnabled = config?.rustmapsCustomGenerationEnabled === true

    const methods = useForm<MapVoteFormData>({
        resolver: zodResolver(mapVoteFormSchema),
        defaultValues: {
            map_options: [
                { optionStyle: "rustmaps" as MapOptionStyle, value: "" },
                { optionStyle: "rustmaps" as MapOptionStyle, value: "" },
            ],
        },
        criteriaMode: "all"
    })

    const { fields, append, remove } = useFieldArray({
        control: methods.control,
        name: "map_options",
    })

    const setRowStyle = (index: number, style: MapOptionStyle) => {
        const opts = methods.getValues("map_options")
        const current = opts[index] || {}
        if (style === "rustmaps") {
            opts[index] = { optionStyle: "rustmaps", value: (current as { value?: string }).value ?? "" }
        } else {
            opts[index] = {
                optionStyle: "custom",
                value: (current as { value?: string }).value ?? "",
                imageUrl: (current as { imageUrl?: string }).imageUrl ?? "",
                imageIconUrl: (current as { imageIconUrl?: string }).imageIconUrl ?? "",
                thumbnailUrl: (current as { thumbnailUrl?: string }).thumbnailUrl ?? "",
                rawImageUrl: (current as { rawImageUrl?: string }).rawImageUrl ?? "",
            }
        }
        methods.setValue("map_options", opts)
    }

    const handleImageUpload = async (file: File, index: number) => {
        setUploadingIndex(index)
        try {
            const formData = new FormData()
            formData.append('file', file)

            const token = getAuthToken();
            const headers: Record<string, string> = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const response = await fetch(backendApi('admin/map-voting/upload-image'), {
                method: 'POST',
                credentials: 'include',
                headers,
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to upload image')
            }

            const result = await response.json()
            
            const currentOptions = methods.getValues('map_options')
            currentOptions[index] = {
                ...currentOptions[index],
                imageUrl: result.url,
                imageIconUrl: result.url,
                thumbnailUrl: result.url,
                rawImageUrl: result.url,
            }
            methods.setValue('map_options', currentOptions)
            
            toast.success('Image uploaded successfully')
        } catch (error: any) {
            toast.error(error.message || 'Failed to upload image')
        } finally {
            setUploadingIndex(null)
        }
    }

    const mutation = useMutation({
        mutationFn: async (data: MapVoteFormData) => {
            const map_options = (data.map_options || []).map((o: { optionStyle?: MapOptionStyle; value?: string; imageUrl?: string; imageIconUrl?: string; thumbnailUrl?: string; rawImageUrl?: string }) =>
                o.optionStyle === "rustmaps"
                    ? { value: o.value ?? "" }
                    : {
                        value: o.value ?? "",
                        imageUrl: o.imageUrl ?? "",
                        imageIconUrl: o.imageIconUrl ?? "",
                        thumbnailUrl: o.thumbnailUrl ?? "",
                        rawImageUrl: o.rawImageUrl ?? "",
                    }
            )
            const payload = {
                ...data,
                vote_start: data.vote_start.toISOString(),
                vote_end: data.vote_end.toISOString(),
                map_start: data.map_start.toISOString(),
                map_options,
            }
            const token = getAuthToken();
            const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const response = await fetch(backendApi('admin/map-voting'), {
                method: 'POST',
                credentials: 'include',
                headers,
                body: JSON.stringify(payload),
            })
            if (!response.ok) {
                let message = `Request failed (${response.status})`
                try {
                    const errorData = await response.json()
                    if (errorData.message) message = errorData.message
                    if (errorData.error) message = errorData.error
                    if (errorData.errors && typeof errorData.errors === 'object') {
                        const parts = Object.entries(errorData.errors).flatMap(([k, v]) =>
                            Array.isArray(v) ? v.map((s: string) => `${k}: ${s}`) : [`${k}: ${v}`]
                        )
                        if (parts.length) message = parts.join('. ')
                    }
                } catch {
                }
                throw new Error(message)
            }
            return response.json()
        },
        onSuccess: () => {
            methods.reset()
            setOpen(false)
            queryClient.invalidateQueries({ queryKey: ['mapVotes'] })
            toast.success('Map vote created successfully')
        },
        onError: (error) => {
            toast.error(error.message || `Failed to complete request`)
        },
    })
    const onSubmit = (data: MapVoteFormData) => {
        mutation.mutate(data)
    }
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>Create New Vote</Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create New Vote</DialogTitle>
                    <DialogDescription>Create a new map vote.</DialogDescription>
                </DialogHeader>
                <FormProvider {...methods}>
                    <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={methods.control}
                                name="server"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Server</FormLabel>
                                        <FormControl>
                                            <ServerCombobox
                                                align="start"
                                                value={field.value}
                                                onChange={field.onChange}
                                                modal={true}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={methods.control}
                                name="map_start"
                                render={({ field }) => (
                                    <FormItem className="flex justify-end flex-col">
                                        <FormLabel className="text-left">Wipe Time</FormLabel>
                                        <Popover modal={true}>
                                            <FormControl>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        className={cn(
                                                            "justify-start text-left font-normal",
                                                            !field.value && "text-muted-foreground"
                                                        )}
                                                    >
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                        {field.value ? (
                                                            format(field.value, "PPpp")
                                                        ) : (
                                                            <span>Pick a date</span>
                                                        )}
                                                    </Button>
                                                </PopoverTrigger>
                                            </FormControl>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value}
                                                    onSelect={field.onChange}
                                                />
                                                <div className="flex justify-center p-3 border-t border-border/15">
                                                    <TimePicker
                                                        setDate={field.onChange}
                                                        date={field.value}
                                                    />
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    </FormItem>
                                )}
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <FormField
                                    control={methods.control}
                                    name="vote_start"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel className="text-left">Vote Start</FormLabel>
                                            <Popover modal={true}>
                                                <FormControl>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            className={cn(
                                                                "justify-start text-left font-normal",
                                                                !field.value && "text-muted-foreground"
                                                            )}
                                                        >
                                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                                            {field.value ? (
                                                                format(field.value, "PPpp")
                                                            ) : (
                                                                <span>Pick a date</span>
                                                            )}
                                                        </Button>
                                                    </PopoverTrigger>
                                                </FormControl>
                                                <PopoverContent className="w-auto p-0">
                                                    <Calendar
                                                        mode="single"
                                                        selected={field.value}
                                                        onSelect={field.onChange}
                                                    />
                                                    <div className="flex justify-center p-3 border-t border-border/15">
                                                        <TimePicker
                                                            setDate={field.onChange}
                                                            date={field.value}
                                                        />
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <FormField
                                    control={methods.control}
                                    name="vote_end"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel className="text-left">Vote End</FormLabel>
                                            <Popover modal={true}>
                                                <FormControl>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            className={cn(
                                                                "justify-start text-left font-normal",
                                                                !field.value && "text-muted-foreground"
                                                            )}
                                                        >
                                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                                            {field.value ? (
                                                                format(field.value, "PPpp")
                                                            ) : (
                                                                <span>Pick a date</span>
                                                            )}
                                                        </Button>
                                                    </PopoverTrigger>
                                                </FormControl>
                                                <PopoverContent className="w-auto p-0">
                                                    <Calendar
                                                        mode="single"
                                                        selected={field.value}
                                                        onSelect={field.onChange}
                                                    />
                                                    <div className="flex justify-center p-3 border-t border-border/15">
                                                        <TimePicker
                                                            setDate={field.onChange}
                                                            date={field.value}
                                                        />
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>
                        <div className="flex flex-col items-start gap-4">
                            <Label>Map Options</Label>
                            <p className="text-sm text-muted-foreground">
                                Each row can be a RustMaps link or a custom option (upload/image URL + map name).
                            </p>
                            <RustmapsCustomGeneratePanel
                                enabled={rustmapsCustomGenerationEnabled}
                                canAddMore={fields.length < 20}
                                onAppendRustmapsOption={(mapId) => {
                                    if (fields.length >= 20) {
                                        toast.error("Maximum 20 map options allowed.")
                                        return
                                    }
                                    append({ optionStyle: "rustmaps", value: mapId })
                                }}
                            />
                            {fields.map((field, index) => {
                                const rowStyle = (methods.watch(`map_options.${index}.optionStyle`) ?? "rustmaps") as MapOptionStyle
                                const imageUrl = methods.watch(`map_options.${index}.imageUrl`)
                                return (
                                    <div key={field.id} className="w-full space-y-3 p-4 border rounded-md">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <Label className="text-sm font-medium">Option {index + 1}</Label>
                                            <div className="flex items-center gap-2">
                                                <Tabs value={rowStyle} onValueChange={(v) => setRowStyle(index, v as MapOptionStyle)}>
                                                    <TabsList className="h-8 grid grid-cols-2">
                                                        <TabsTrigger value="rustmaps" className="flex items-center gap-1 text-xs px-2">
                                                            <Link2 className="h-3 w-3" />
                                                            RustMaps
                                                        </TabsTrigger>
                                                        <TabsTrigger value="custom" className="flex items-center gap-1 text-xs px-2">
                                                            <ImageIcon className="h-3 w-3" />
                                                            Custom
                                                        </TabsTrigger>
                                                    </TabsList>
                                                </Tabs>
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => {
                                                        if (fields.length > 2) { remove(index); return }
                                                        toast.error("You must have at least 2 map options.")
                                                    }}
                                                >
                                                    <Trash className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                        {rowStyle === "rustmaps" ? (
                                            <FormField
                                                control={methods.control}
                                                name={`map_options.${index}.value`}
                                                render={({ field: f }) => (
                                                    <FormItem>
                                                        <FormControl>
                                                            <Input {...f} placeholder="https://rustmaps.com/map/3500_12345 or map ID" />
                                                        </FormControl>
                                                        <FormDescription>Full link or map ID — saved as entered</FormDescription>
                                                    </FormItem>
                                                )}
                                            />
                                        ) : (
                                            <>
                                                {imageUrl && (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) ? (
                                                    <div className="relative w-full h-40 rounded-md overflow-hidden border">
                                                        {/rustmaps\.com\/map\//i.test(imageUrl) ? (
                                                            <Image src={imageUrl} alt={`Map ${index + 1}`} fill className="object-contain" unoptimized />
                                                        ) : (
                                                            <Image src={imageUrl} alt={`Map ${index + 1}`} fill className="object-contain" />
                                                        )}
                                                    </div>
                                                ) : null}
                                                <div className="space-y-2">
                                                    {isLocalCdnConfigured && (
                                                        <div className="space-y-1">
                                                            <Label className="text-xs">Upload Image</Label>
                                                            <UploadFile
                                                                accept="image/*"
                                                                maxSize={10}
                                                                onFilesSelected={(files) => { if (files.length > 0) handleImageUpload(files[0], index) }}
                                                                isUploading={uploadingIndex === index}
                                                            />
                                                        </div>
                                                    )}
                                                    <FormField
                                                        control={methods.control}
                                                        name={`map_options.${index}.imageUrl`}
                                                        render={({ field: f }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-xs">Image URL {!isLocalCdnConfigured && "(Required)"}</FormLabel>
                                                                <FormControl>
                                                                    <Input {...f} placeholder="https://example.com/map-image.jpg" />
                                                                </FormControl>
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        control={methods.control}
                                                        name={`map_options.${index}.value`}
                                                        render={({ field: f }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-xs">Map Name / ID (Optional)</FormLabel>
                                                                <FormControl>
                                                                    <Input {...f} placeholder="Map name or identifier" />
                                                                </FormControl>
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )
                            })}
                            <Button
                                type="button"
                                variant="secondary"
                                disabled={fields.length >= 20}
                                onClick={() => {
                                    if (fields.length >= 20) { toast.error("Maximum 20 map options allowed."); return }
                                    const last = methods.getValues("map_options")[fields.length - 1] as { optionStyle?: MapOptionStyle } | undefined
                                    append((last?.optionStyle === "custom")
                                        ? { optionStyle: "custom", value: "", imageUrl: "", imageIconUrl: "", thumbnailUrl: "", rawImageUrl: "" }
                                        : { optionStyle: "rustmaps", value: "" })
                                }}
                            >
                                Add Vote Option {fields.length >= 20 ? "(max 20)" : ""}
                            </Button>
                        </div>
                        <div className="pt-6">
                            <Button type="submit">Create New Vote</Button>
                        </div>
                    </form>
                </FormProvider>
            </DialogContent>
        </Dialog>
    )
}