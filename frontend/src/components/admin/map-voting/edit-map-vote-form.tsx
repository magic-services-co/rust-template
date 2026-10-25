"use client";

import { backendApi } from "@/lib/api";
import { getAuthToken } from "@/lib/laravel-auth";
import { ServerCombobox } from "@/components/server-combobox";
import { keepTimeOnDaySelect, TimePicker } from "@/components/time-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon, Loader2, Trash, TrashIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { toast } from "sonner";
import { useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { MapVote, MapVoteOption } from "@/types/vote";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { UploadFile } from "@/components/upload-file";
import Image from "next/image";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MapOptionStyle } from "./add-map-vote-form";
import { Link2, ImageIcon } from "lucide-react";
import { RustmapsCustomGeneratePanel } from "@/components/admin/map-voting/rustmaps-custom-generate-panel";

const mapVoteFormSchema = z.object({
    id: z.string().min(1, "ID is required"),
    enabled: z.boolean(),
    server: z.string().min(1, "Server is required"),
    vote_start: z.date({ message: "Vote start date is required" }),
    vote_end: z.date({ message: "Vote end date is required" }),
    map_start: z.date({ message: "Wipe time is required" }),
    map_options: z.array(z.any()).min(2, { message: "At least two map options are required" }).max(20, { message: "Maximum 20 map options allowed" }),
});

type MapVoteFormData = z.infer<typeof mapVoteFormSchema>;

interface EditMapVoteFormProps {
    vote: MapVote;
}

export function EditMapVoteForm({ vote }: EditMapVoteFormProps) {
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

    const mapOptionsToFormValues = (options: MapVote["map_options"] | undefined | null) => {
        const list = Array.isArray(options) ? options : []
        const mapped = list.map((o: MapVoteOption) => {
            const oRecord = o as unknown as Record<string, unknown>;
            const url = (o.url ?? oRecord.url) as string | undefined
            const imageUrl = (o.imageUrl ?? oRecord.image_url) as string | undefined
            const imageIconUrl = (o.imageIconUrl ?? oRecord.image_icon_url) as string | undefined
            const thumbnailUrl = (o.thumbnailUrl ?? oRecord.thumbnail_url) as string | undefined
            const rawImageUrl = (o.rawImageUrl ?? oRecord.raw_image_url) as string | undefined
            const rawUrl = String(url ?? "").trim()
            const rawImage = String(imageUrl ?? "").trim()
            const isRustMaps = rawUrl.includes("rustmaps.com") || rawImage.includes("rustmaps.com")
            const rustMapsValue = (rawUrl.includes("rustmaps.com") ? rawUrl : rawImage) || (rawUrl !== "#" ? rawUrl : "") || (rawImage !== "#" ? rawImage : "")
            const sanitize = (s: string) => (s && s !== "#" && (s.startsWith("http://") || s.startsWith("https://")) ? s : "")
            return isRustMaps
                ? { optionStyle: "rustmaps" as MapOptionStyle, value: rustMapsValue }
                : {
                    optionStyle: "custom" as MapOptionStyle,
                    value: (oRecord.value as string) ?? "",
                    imageUrl: sanitize(rawImage) || sanitize(rawUrl) || "",
                    imageIconUrl: sanitize(String(imageIconUrl ?? "")) || sanitize(rawImage) || sanitize(rawUrl) || "",
                    thumbnailUrl: sanitize(String(thumbnailUrl ?? "")) || sanitize(rawImage) || sanitize(rawUrl) || "",
                    rawImageUrl: sanitize(String(rawImageUrl ?? "")) || sanitize(rawImage) || sanitize(rawUrl) || "",
                }
        })
        while (mapped.length < 2) {
            mapped.push({ optionStyle: "rustmaps" as MapOptionStyle, value: "" })
        }
        return mapped
    }

    const getDefaultValues = () => ({
        id: vote.id,
        enabled: vote.enabled ?? true,
        server: vote.server_id ?? "",
        vote_start: new Date(vote.vote_start),
        vote_end: new Date(vote.vote_end),
        map_start: new Date(vote.map_start),
        map_options: mapOptionsToFormValues((vote as { map_options?: MapVote["map_options"]; mapOptions?: MapVote["map_options"] }).map_options ?? (vote as { mapOptions?: MapVote["map_options"] }).mapOptions),
    })

    const methods = useForm<MapVoteFormData>({
        resolver: zodResolver(mapVoteFormSchema),
        defaultValues: getDefaultValues(),
        criteriaMode: "all"
    })

    useEffect(() => {
        if (open) {
            const values = getDefaultValues()
            methods.reset(values)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- reset form when dialog opens; getDefaultValues/methods intentionally omitted to avoid loops
    }, [open, vote])

    const { fields, append, remove } = useFieldArray({
        control: methods.control,
        name: "map_options",
        rules: {
            minLength: 2,
            required: "At least two map options are required",
        }
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
            const payload: Record<string, unknown> = {
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
                method: 'PUT',
                credentials: 'include',
                headers,
                body: JSON.stringify(payload),
            })
            if (!response.ok) {
                if (response.status === 401) throw new Error("You are not authorized to do this.")
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
                } catch { /* non-JSON response */ }
                throw new Error(message)
            }
            return response.json()
        },
        onSuccess: () => {
            setOpen(false)
            queryClient.invalidateQueries({ queryKey: ['mapVotes'] })
            toast.success('Map vote updated successfully')
        },
        onError: (error) => {
            toast.error(error.message || `Failed to complete request`)
        },
    })

    const deleteMutation = useMutation({
        mutationFn: async () => {
            const token = getAuthToken();
            const headers: Record<string, string> = { Accept: 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const response = await fetch(backendApi(`admin/map-voting?id=${vote.id}`), {
                method: 'DELETE',
                credentials: 'include',
                headers,
            });
            if (!response.ok) {
                if (response.status === 401) throw new Error("You are not authorized to do this.")
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
                } catch { /* non-JSON response */ }
                throw new Error(message)
            }
            return response.json()
        },
        onSuccess: () => {
            setOpen(false)
            queryClient.invalidateQueries({ queryKey: ['mapVotes'] })
            toast.success('Map vote deleted successfully')
        },
        onError: (error) => {
            toast.error(error.message || `Failed to complete request`)
        },
    })

    const onSubmit = (data: MapVoteFormData) => {
        setFormError(null);
        if (data.map_options.length < 2) {
            setFormError("At least two map options are required");
            return;
        }
        mutation.mutate(data);
    }

    const [formError, setFormError] = useState<string | null>(null);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size={"sm"} variant="outline">Edit Vote</Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Map Vote</DialogTitle>
                    <DialogDescription>Edit the map vote for {vote.server?.server_name}</DialogDescription>
                </DialogHeader>
                <FormProvider {...methods}>
                    <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-8">
                        <div className="w-full flex items-center flex-row gap-6">
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
                                                fallbackLabel={vote.server?.server_name}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={methods.control}
                                name="enabled"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col h-full gap-4">
                                        <FormLabel>Enabled</FormLabel>
                                        <FormControl>
                                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                                        </FormControl>
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
                                            <Popover>
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
                                                        onSelect={(day) => field.onChange(keepTimeOnDaySelect(field.value, day))}
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
                                            <Popover>
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
                                                        onSelect={(day) => field.onChange(keepTimeOnDaySelect(field.value, day))}
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
                            <FormField
                                control={methods.control}
                                name="map_start"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel className="text-left">Wipe Time</FormLabel>
                                        <Popover>
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
                                                    onSelect={(day) => field.onChange(keepTimeOnDaySelect(field.value, day))}
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
                        <div className="flex flex-col items-start gap-4">
                            <Label>Map Options</Label>
                            <p className="text-sm text-muted-foreground">
                                Each row can be a RustMaps link or a custom option (upload/image URL + map name).
                            </p>
                            <RustmapsCustomGeneratePanel
                                enabled={rustmapsCustomGenerationEnabled}
                                canAddMore={fields.length < 20}
                                onAppendRustmapsOption={(mapId) => {
                                    const opts = methods.getValues("map_options")
                                    const emptyIndex = opts.findIndex((option: { optionStyle?: string; value?: string }) =>
                                        (option.optionStyle ?? "rustmaps") === "rustmaps" && !String(option.value ?? "").trim()
                                    )
                                    if (emptyIndex >= 0) {
                                        const next = [...opts]
                                        next[emptyIndex] = { optionStyle: "rustmaps", value: mapId }
                                        methods.setValue("map_options", next)
                                        return
                                    }
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
                                                {(imageUrl && (imageUrl.startsWith("http://") || imageUrl.startsWith("https://"))) ? (
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
                        <FormMessage>{methods.formState.errors.map_options?.message}</FormMessage>
                        {formError ? (
                            <Alert variant="destructive">
                                <AlertDescription>{formError}</AlertDescription>
                            </Alert>
                        ) : null}
                        <div className="pt-6 flex items-center justify-between">
                            <Button type="submit">
                                {mutation.isPending ? (
                                    <Loader2 className="animate-spin w-4 h-4" />
                                ) : "Update Vote"}
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" className="flex items-center gap-2">
                                        <TrashIcon className="w-4 h-4" />
                                        Delete Vote
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete the map vote
                                            and remove all associated data from the database.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={() => deleteMutation.mutate()}
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                            {deleteMutation.isPending ? (
                                                <Loader2 className="animate-spin w-4 h-4" />
                                            ) : "Delete Vote"}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </form>
                </FormProvider>
            </DialogContent>
        </Dialog>
    )
}