"use client";

import { useState, useEffect } from "react";
import { backendApi } from "@/lib/api";
import { getAuthToken } from "@/lib/laravel-auth";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { Info, Save, Plus, Trash2 } from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

const pageMetadataSchema = z.object({
    slug: z.string().min(1, "Slug is required"),
    title: z.string().optional(),
    description: z.string().optional(),
    keywords: z.string().optional(),
    ogTitle: z.string().optional(),
    ogDescription: z.string().optional(),
    ogImageUrl: z.string().url("Must be a valid URL").optional().or(z.literal('')),
    ogImageAlt: z.string().optional(),
    twitterTitle: z.string().optional(),
    twitterDescription: z.string().optional(),
    twitterImageUrl: z.string().url("Must be a valid URL").optional().or(z.literal('')),
});

type PageMetadataFormValues = z.infer<typeof pageMetadataSchema>;

const newPageSchema = z.object({
    newSlug: z.string().min(1, "Slug is required"),
});

type NewPageFormValues = z.infer<typeof newPageSchema>;

type SeoPageRecord = {
    slug: string;
    label?: string;
    path?: string;
    custom?: boolean;
    fallbackTitle?: string | null;
};

export function PagesSeoForm() {
    const [selectedPage, setSelectedPage] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const queryClient = useQueryClient();

    const { data: pages, isLoading: pagesLoading } = useQuery({
        queryKey: ["pageMetadata"],
        queryFn: async () => {
            const token = getAuthToken();
            const headers: Record<string, string> = { Accept: "application/json" };
            if (token) headers["Authorization"] = `Bearer ${token}`;
            const response = await fetch(backendApi("admin/page-metadata"), { credentials: "include", headers });
            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error("You are not authorized to view page metadata.")
                }
                throw new Error('Failed to fetch page metadata');
            }
            return response.json() as Promise<SeoPageRecord[]>;
        },
    });

    const { data: selectedPageData, isLoading: pageDataLoading } = useQuery({
        queryKey: ["pageMetadata", selectedPage],
        queryFn: async () => {
            if (!selectedPage) return null;
            const token = getAuthToken();
            const headers: Record<string, string> = { Accept: "application/json" };
            if (token) headers["Authorization"] = `Bearer ${token}`;
            const response = await fetch(backendApi(`admin/page-metadata/${selectedPage}`), { credentials: "include", headers });
            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error("You are not authorized to view page metadata.")
                }
                throw new Error('Failed to fetch page metadata');
            }
            return response.json() as Promise<SeoPageRecord & PageMetadataFormValues>;
        },
        enabled: !!selectedPage,
    });

    const form = useForm<PageMetadataFormValues>({
        resolver: zodResolver(pageMetadataSchema),
        defaultValues: {
            slug: "",
            title: "",
            description: "",
            keywords: "",
            ogTitle: "",
            ogDescription: "",
            ogImageUrl: "",
            ogImageAlt: "",
            twitterTitle: "",
            twitterDescription: "",
            twitterImageUrl: "",
        },
    });

    const newPageForm = useForm<NewPageFormValues>({
        resolver: zodResolver(newPageSchema),
        defaultValues: {
            newSlug: "",
        },
    });

    const isDisabled = pageDataLoading || isSubmitting;

    useEffect(() => {
        if (selectedPageData) {
            form.reset({
                slug: selectedPageData.slug,
                title: selectedPageData.title || "",
                description: selectedPageData.description || "",
                keywords: selectedPageData.keywords || "",
                ogTitle: selectedPageData.ogTitle || "",
                ogDescription: selectedPageData.ogDescription || "",
                ogImageUrl: selectedPageData.ogImageUrl || "",
                ogImageAlt: selectedPageData.ogImageAlt || "",
                twitterTitle: selectedPageData.twitterTitle || "",
                twitterDescription: selectedPageData.twitterDescription || "",
                twitterImageUrl: selectedPageData.twitterImageUrl || "",
            });
        } else {
            form.reset({
                slug: "",
                title: "",
                description: "",
                keywords: "",
                ogTitle: "",
                ogDescription: "",
                ogImageUrl: "",
                ogImageAlt: "",
                twitterTitle: "",
                twitterDescription: "",
                twitterImageUrl: "",
            });
        }
    }, [selectedPageData, form]);

    const mutation = useMutation({
        mutationFn: async (values: PageMetadataFormValues) => {
            if (values.slug.startsWith("/")) {
                throw new Error("Slug cannot start with a forward slash.")
            }
            const token = getAuthToken();
            const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
            if (token) headers["Authorization"] = `Bearer ${token}`;
            const response = await fetch(backendApi(`admin/page-metadata/${selectedPage}`), {
                method: "PUT",
                credentials: "include",
                headers,
                body: JSON.stringify(values),
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error("You are not authorized to save page metadata.")
                }
                throw new Error("Failed to save page metadata");
            }
            if (selectedPage !== values.slug) {
                setSelectedPage(values.slug)
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["pageMetadata"] });
            toast.success("Page metadata has been updated.");
        },
        onError: (error) => {
            toast.error(error.message || `Failed to update page metadata: ${error.message}`)
        },
        onSettled: () => {
            setIsSubmitting(false);
        },
    });

    const createMutation = useMutation({
        mutationFn: async (newSlug: string) => {
            if (newSlug.startsWith("/")) {
                throw new Error("Slug cannot start with a forward slash.")
            }
            const token = getAuthToken();
            const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
            if (token) headers["Authorization"] = `Bearer ${token}`;
            const response = await fetch(backendApi("admin/page-metadata"), {
                method: "POST",
                credentials: "include",
                headers,
                body: JSON.stringify({ slug: newSlug }),
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error("You are not authorized to create new page metadata.")
                }
                throw new Error("Failed to create new page metadata");
            }
            return response.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["pageMetadata"] });
            toast.success("New page metadata has been created.");
            setSelectedPage(data.slug);
            setIsCreateDialogOpen(false);
            newPageForm.reset();
        },
        onError: (error) => {
            toast.error(error.message || `Failed to create new page metadata`)
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async () => {
            const token = getAuthToken();
            const headers: Record<string, string> = { Accept: "application/json" };
            if (token) headers["Authorization"] = `Bearer ${token}`;
            const response = await fetch(backendApi(`admin/page-metadata/${selectedPage}`), {
                method: "DELETE",
                credentials: "include",
                headers,
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error("You are not authorized to delete page metadata.")
                }
                throw new Error("Failed to delete page metadata");
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["pageMetadata"] });
            toast.success("Page metadata has been deleted.");
            setSelectedPage(null);
            setIsDeleteDialogOpen(false);
        },
        onError: (error) => {
            toast.error(error.message || "Failed to delete page metadata. Please try again.");
        },
    });

    function onDelete() {
        deleteMutation.mutate();
    }

    function onSubmit(values: PageMetadataFormValues) {
        setIsSubmitting(true);
        mutation.mutate(values);
    }

    function onCreateNewPage(values: NewPageFormValues) {
        createMutation.mutate(values.newSlug);
    }

    return (
        <div className="flex">
            <div className="w-1/4 pr-4">
                <Tabs orientation="vertical" value={selectedPage || undefined} onValueChange={setSelectedPage}>
                    <TabsList className="flex flex-col h-full">
                        {pages?.map((page: SeoPageRecord) => (
                            <TabsTrigger
                                key={page.slug}
                                value={page.slug}
                                className="h-auto w-full py-2 capitalize"
                            >
                                <span className="flex flex-col items-start text-left">
                                    <span>{page.label || page.slug}</span>
                                    {page.custom && page.path ? (
                                        <span className="text-xs font-normal normal-case text-muted-foreground">{page.path}</span>
                                    ) : null}
                                </span>
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="mt-4 w-full">
                            <Plus className="h-4 w-4 mr-2" />
                            Create New Page
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Page</DialogTitle>
                        </DialogHeader>
                        <Form {...newPageForm}>
                            <form onSubmit={newPageForm.handleSubmit(onCreateNewPage)} className="space-y-4">
                                <FormField
                                    control={newPageForm.control}
                                    name="newSlug"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>New Page Slug</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="Enter new page slug" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Button type="submit">Create</Button>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>
            <div className="w-3/4">
                {selectedPage && (
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                            <FormField
                                control={form.control}
                                name="slug"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex items-center space-x-2">
                                            <FormLabel>Slug</FormLabel>
                                            <Popover>
                                                <PopoverTrigger>
                                                    <Info className="h-4 w-4 text-muted-foreground" />
                                                </PopoverTrigger>
                                                <PopoverContent className="w-80 p-3 text-muted-foreground text-sm">
                                                    The unique identifier for this page in the URL.
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                        <FormControl>
                                            <Input {...field} disabled={isDisabled || Boolean(selectedPageData?.custom)} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex items-center space-x-2">
                                            <FormLabel>Title</FormLabel>
                                            <Popover>
                                                <PopoverTrigger>
                                                    <Info className="h-4 w-4 text-muted-foreground" />
                                                </PopoverTrigger>
                                                <PopoverContent className="w-80 p-3 text-muted-foreground text-sm">
                                                    The title of the page, displayed in browser tabs and search results.
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                disabled={isDisabled}
                                                placeholder={selectedPageData?.fallbackTitle ? `Leave blank to use “${selectedPageData.fallbackTitle}”` : undefined}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex items-center space-x-2">
                                            <FormLabel>Description</FormLabel>
                                            <Popover>
                                                <PopoverTrigger>
                                                    <Info className="h-4 w-4 text-muted-foreground" />
                                                </PopoverTrigger>
                                                <PopoverContent className="w-80 p-3 text-muted-foreground text-sm">
                                                    A brief summary of the page content, used in search engine results.
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                        <FormControl>
                                            <Textarea
                                                {...field}
                                                disabled={isDisabled}
                                                placeholder={selectedPageData?.custom ? "Leave blank to use the site description" : undefined}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="keywords"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex items-center space-x-2">
                                            <FormLabel>Keywords</FormLabel>
                                            <Popover>
                                                <PopoverTrigger>
                                                    <Info className="h-4 w-4 text-muted-foreground" />
                                                </PopoverTrigger>
                                                <PopoverContent className="w-80 p-3 text-muted-foreground text-sm">
                                                    Comma-separated keywords relevant to the page content.
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                        <FormControl>
                                            <Input {...field} disabled={isDisabled} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="ogTitle"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex items-center space-x-2">
                                            <FormLabel>Open Graph Title</FormLabel>
                                            <Popover>
                                                <PopoverTrigger>
                                                    <Info className="h-4 w-4 text-muted-foreground" />
                                                </PopoverTrigger>
                                                <PopoverContent className="w-80 p-3 text-muted-foreground text-sm">
                                                    The title used when the page is shared on social media.
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                        <FormControl>
                                            <Input {...field} disabled={isDisabled} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="ogDescription"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex items-center space-x-2">
                                            <FormLabel>Open Graph Description</FormLabel>
                                            <Popover>
                                                <PopoverTrigger>
                                                    <Info className="h-4 w-4 text-muted-foreground" />
                                                </PopoverTrigger>
                                                <PopoverContent className="w-80 p-3 text-muted-foreground text-sm">
                                                    The description used when the page is shared on social media.
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                        <FormControl>
                                            <Textarea {...field} disabled={isDisabled} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="ogImageUrl"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex items-center space-x-2">
                                            <FormLabel>Open Graph Image URL</FormLabel>
                                            <Popover>
                                                <PopoverTrigger>
                                                    <Info className="h-4 w-4 text-muted-foreground" />
                                                </PopoverTrigger>
                                                <PopoverContent className="w-80 p-3 text-muted-foreground text-sm">
                                                    The image used when this page is shared. If it is empty, the site share image is used, then the site logo.
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                        <FormControl>
                                            <Input {...field} disabled={isDisabled} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="ogImageAlt"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex items-center space-x-2">
                                            <FormLabel>Open Graph Image Alt Text</FormLabel>
                                            <Popover>
                                                <PopoverTrigger>
                                                    <Info className="h-4 w-4 text-muted-foreground" />
                                                </PopoverTrigger>
                                                <PopoverContent className="w-80 p-3 text-muted-foreground text-sm">
                                                    Alternative text for the Open Graph image.
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                        <FormControl>
                                            <Input {...field} disabled={isDisabled} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="twitterTitle"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex items-center space-x-2">
                                            <FormLabel>Twitter Title</FormLabel>
                                            <Popover>
                                                <PopoverTrigger>
                                                    <Info className="h-4 w-4 text-muted-foreground" />
                                                </PopoverTrigger>
                                                <PopoverContent className="w-80 p-3 text-muted-foreground text-sm">
                                                    The title used when the page is shared on Twitter.
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                        <FormControl>
                                            <Input {...field} disabled={isDisabled} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="twitterDescription"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex items-center space-x-2">
                                            <FormLabel>Twitter Description</FormLabel>
                                            <Popover>
                                                <PopoverTrigger>
                                                    <Info className="h-4 w-4 text-muted-foreground" />
                                                </PopoverTrigger>
                                                <PopoverContent className="w-80 p-3 text-muted-foreground text-sm">
                                                    The description used when the page is shared on Twitter.
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                        <FormControl>
                                            <Textarea {...field} disabled={isDisabled} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="twitterImageUrl"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex items-center space-x-2">
                                            <FormLabel>Twitter Image URL</FormLabel>
                                            <Popover>
                                                <PopoverTrigger>
                                                    <Info className="h-4 w-4 text-muted-foreground" />
                                                </PopoverTrigger>
                                                <PopoverContent className="w-80 p-3 text-muted-foreground text-sm">
                                                    The URL of the image used when the page is shared on Twitter.
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                        <FormControl>
                                            <Input {...field} disabled={isDisabled} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="flex justify-between">
                                <Button type="submit" disabled={isDisabled}>
                                    <Save className="h-4 w-4 mr-2" />
                                    {isSubmitting ? "Saving..." : "Save Changes"}
                                </Button>
                                <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                                    <AlertDialogTrigger asChild>
                                        <Button type="button" variant="destructive" disabled={isDisabled}>
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete Page
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. This will permanently delete the
                                                page metadata for &quot;{selectedPage}&quot;.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </form>
                    </Form>
                )}
            </div>
        </div>
    );
}
