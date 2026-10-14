"use client";

import { backendApi } from "@/lib/api";
import { getAuthToken } from "@/lib/laravel-auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

type SitemapPage = {
    path: string;
    label: string;
    included: boolean;
    redirectsTo: string | null;
};

function authHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
        Accept: "application/json",
        "Content-Type": "application/json",
    };
    const token = getAuthToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
}

export function SitemapForm() {
    const queryClient = useQueryClient();
    const [excluded, setExcluded] = useState<string[]>([]);

    const { data: pages = [], isLoading, error } = useQuery({
        queryKey: ["sitemap-pages"],
        queryFn: async () => {
            const response = await fetch(backendApi("admin/sitemap"), {
                credentials: "include",
                headers: authHeaders(),
            });
            if (!response.ok) {
                throw new Error("Failed to load sitemap pages");
            }
            const data = (await response.json()) as { pages?: SitemapPage[] };
            return Array.isArray(data.pages) ? data.pages : [];
        },
    });

    useEffect(() => {
        setExcluded(pages.filter((page) => !page.included && !page.redirectsTo).map((page) => page.path));
    }, [pages]);

    const save = useMutation({
        mutationFn: async () => {
            const response = await fetch(backendApi("admin/sitemap"), {
                method: "PUT",
                credentials: "include",
                headers: authHeaders(),
                body: JSON.stringify({ excluded }),
            });
            if (!response.ok) {
                throw new Error("Failed to save sitemap pages");
            }
            return response.json() as Promise<{ pages?: SitemapPage[] }>;
        },
        onSuccess: (data) => {
            queryClient.setQueryData(["sitemap-pages"], Array.isArray(data.pages) ? data.pages : []);
            toast.success("Sitemap pages saved");
        },
        onError: (err: Error) => toast.error(err.message),
    });

    if (isLoading) {
        return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading public pages…
            </div>
        );
    }

    if (error) {
        return <p className="text-sm text-destructive">{(error as Error).message}</p>;
    }

    const toggle = (path: string, include: boolean) => {
        setExcluded((current) => {
            if (include) return current.filter((item) => item !== path);
            return current.includes(path) ? current : [...current, path];
        });
    };

    return (
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
                /sitemap.xml lists these public pages. Store tabs replace /store when that address redirects. Turn a page off to leave it out.
            </p>
            <div className="divide-y rounded-md border">
                {pages.map((page) => {
                    const included = page.redirectsTo ? false : !excluded.includes(page.path);
                    return (
                        <div key={page.path} className="flex items-center justify-between gap-4 px-4 py-3">
                            <div className="min-w-0">
                                <p className="font-medium">{page.label}</p>
                                <p className="truncate text-sm text-muted-foreground">{page.path}</p>
                                {page.redirectsTo ? (
                                    <p className="text-sm text-muted-foreground">Redirects to {page.redirectsTo}</p>
                                ) : null}
                            </div>
                            <Switch
                                checked={included}
                                disabled={Boolean(page.redirectsTo) || save.isPending}
                                onCheckedChange={(checked) => toggle(page.path, checked)}
                                aria-label={`Include ${page.path} in the sitemap`}
                            />
                        </div>
                    );
                })}
            </div>
            <Button type="button" className="gap-2" onClick={() => save.mutate()} disabled={save.isPending}>
                {save.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Save
            </Button>
        </div>
    );
}
