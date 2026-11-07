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
import { Info, Save } from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";

const siteMetadataSchema = z.object({
    siteName: z.string().optional(),
    siteTitle: z.string().optional(),
    siteDescription: z.string().optional(),
    siteUrl: z.string().optional(),
    siteImageUrl: z.string().optional(),
    siteImageAlt: z.string().optional(),
    keywords: z.string().optional(),
    ogTitle: z.string().optional(),
    ogDescription: z.string().optional(),
    ogImageUrl: z.string().optional(),
    ogImageAlt: z.string().optional(),
    twitterTitle: z.string().optional(),
    twitterDescription: z.string().optional(),
    twitterImageUrl: z.string().optional(),
});

type SiteMetadataFormValues = z.infer<typeof siteMetadataSchema>;

export function GlobalSeoForm() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ["siteMetadata"],
        queryFn: async () => {
            const token = getAuthToken();
            const headers: Record<string, string> = { Accept: "application/json" };
            if (token) headers["Authorization"] = `Bearer ${token}`;
            const response = await fetch(backendApi("admin/settings/metadata"), { credentials: "include", headers });
            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error("You are not authorized to fetch site metadata.")
                }
                throw new Error("Failed to fetch site metadata");
            }
            return response.json();
        },
    });

    const form = useForm<SiteMetadataFormValues>({
        resolver: zodResolver(siteMetadataSchema),
        defaultValues: {
            siteName: "",
            siteTitle: "",
            siteDescription: "",
            siteUrl: "",
            siteImageUrl: "",
            siteImageAlt: "",
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

    const isDisabled = isLoading || isSubmitting;

    useEffect(() => {
        if (data) {
            form.reset(data);
        }
    }, [data, form]);

    const mutation = useMutation({
        mutationFn: async (values: SiteMetadataFormValues) => {
            const token = getAuthToken();
            const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
            if (token) headers["Authorization"] = `Bearer ${token}`;
            const response = await fetch(backendApi("admin/settings/metadata"), {
                method: "POST",
                credentials: "include",
                headers,
                body: JSON.stringify(values),
            });
            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error("You are not authorized to update site metadata.")
                }
                throw new Error('Failed to update site metadata');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["siteMetadata"] });
            toast.success("Site metadata has been updated.");
        },
        onError: (error) => {
            toast.error(error.message || "Failed to update site metadata. Please try again.");
        },
        onSettled: () => {
            setIsSubmitting(false);
        },
    });

    function onSubmit(values: SiteMetadataFormValues) {
        setIsSubmitting(true);
        mutation.mutate(values);
    }

    if (isLoading) {
        return (
            <div className="space-y-8 py-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-36" />
            </div>
        );
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="py-6 space-y-8">
                <FormField
                    control={form.control}
                    name="siteName"
                    render={({ field }) => (
                        <FormItem>
                            <div className="flex items-start space-x-2">
                                <FormLabel>Site Name</FormLabel>
                                <Popover>
                                    <PopoverTrigger>
                                        <Info className="h-4 w-4 text-muted-foreground" />
                                    </PopoverTrigger>
                                    <PopoverContent className="w-80 p-3 text-muted-foreground text-sm">
                                        The primary name of your website. This is often used in the site&apos;s header, footer, and as the main identifier across the web.
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
                    name="siteTitle"
                    render={({ field }) => (
                        <FormItem>
                            <div className="flex items-center space-x-2">
                                <FormLabel>Site Title</FormLabel>
                                <Popover>
                                    <PopoverTrigger>
                                        <Info className="h-4 w-4 text-muted-foreground" />
                                    </PopoverTrigger>
                                    <PopoverContent className="w-80 p-3 text-muted-foreground text-sm">
                                        The title that appears in search engine results and browser tabs. Leave it blank to use the site name from settings.
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
                    name="siteDescription"
                    render={({ field }) => (
                        <FormItem>
                            <div className="flex items-center space-x-2">
                                <FormLabel>Site Description</FormLabel>
                                <Popover>
                                    <PopoverTrigger>
                                        <Info className="h-4 w-4 text-muted-foreground" />
                                    </PopoverTrigger>
                                    <PopoverContent className="w-80 p-3 text-muted-foreground text-sm">
                                        A brief summary of your website&apos;s purpose and content. This appears in search engine results and should be compelling and informative, ideally 150-160 characters long.
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
                    name="siteUrl"
                    render={({ field }) => (
                        <FormItem>
                            <div className="flex items-center space-x-2">
                                <FormLabel>Site URL</FormLabel>
                                <Popover>
                                    <PopoverTrigger>
                                        <Info className="h-4 w-4 text-muted-foreground" />
                                    </PopoverTrigger>
                                    <PopoverContent className="w-80 p-3 text-muted-foreground text-sm">
                                        The full URL of your website&apos;s homepage. This is crucial for SEO and helps search engines understand the structure of your site.
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
                    name="siteImageUrl"
                    render={({ field }) => (
                        <FormItem>
                            <div className="flex items-center space-x-2">
                                <FormLabel>Site Image URL</FormLabel>
                                <Popover>
                                    <PopoverTrigger>
                                        <Info className="h-4 w-4 text-muted-foreground" />
                                    </PopoverTrigger>
                                    <PopoverContent className="w-80 p-3 text-muted-foreground text-sm">
                                        The URL of the default image representing your site. This image may be used when your site is shared on social media if no specific page image is available.
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
                    name="siteImageAlt"
                    render={({ field }) => (
                        <FormItem>
                            <div className="flex items-center space-x-2">
                                <FormLabel>Site Image Alt Text</FormLabel>
                                <Popover>
                                    <PopoverTrigger>
                                        <Info className="h-4 w-4 text-muted-foreground" />
                                    </PopoverTrigger>
                                    <PopoverContent className="w-80 p-3 text-muted-foreground text-sm">
                                        A text description of your site&apos;s default image. This improves accessibility and SEO by providing context for the image when it can&apos;t be displayed or viewed.
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
                                        Relevant terms describing your site&apos;s content. While less important for SEO now, they can still help define your site&apos;s focus. Separate keywords with commas.
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
                                        The title that appears when your content is shared on social media platforms. It should be attention-grabbing and relevant to the page content, typically under 60-70 characters.
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
                                        A brief summary of your content for social media sharing. It should be compelling and informative, ideally between 2-4 sentences or about 160 characters.
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
                                        The URL of the image that appears when your content is shared on social media. Ideal size is 1200x630 pixels for best display across various platforms.
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
                                        A text description of the Open Graph image. This improves accessibility and provides context when the image can&apos;t be displayed or for screen readers.
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
                                        The title that appears when your content is shared on Twitter. It should be concise and engaging, ideally under 70 characters for optimal display.
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
                                        A brief summary of your content for Twitter sharing. It should be compelling and to the point, ideally around 200 characters for best presentation in tweets.
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
                                        The URL of the image that appears when your content is shared on Twitter. Recommended size is 1200x675 pixels for optimal display in tweets.
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
                <Button type="submit" disabled={isDisabled}>
                    <Save className="h-4 w-4 mr-2" />
                    {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
            </form>
        </Form>
    );
}
