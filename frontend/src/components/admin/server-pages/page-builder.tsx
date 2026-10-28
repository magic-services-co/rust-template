"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { backendApi } from "@/lib/api";
import { getAuthToken } from "@/lib/laravel-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { MarkdownGuide } from "@/components/admin/server-pages/markdown-guide";
import { ServerCombobox } from "@/components/admin/server-pages/server-combobox";
import { Loader2, Bold, Italic, Heading, List, Link, Code, Image as ImageIcon, Copy } from "lucide-react";

interface ServerPage {
    id: string;
    server_id: string;
    title: string;
    description?: string | null;
    slug: string;
    content: any;
    enabled: boolean;
}

interface PageBuilderProps {
    page?: ServerPage;
    onSuccess?: () => void;
}

const DEFAULT_PAGE_MARKDOWN = `Welcome to this page.

Use it for rules, commands, kits, or anything your community needs to know.

## Quick start
- Keep headings short
- Use **bold** for important callouts
- Make a command copyable with [copy:/kit starter]

## Example
\`/kit starter\` — starter gear on wipe day.
`;

export function PageBuilder({ page, onSuccess }: PageBuilderProps) {
    const [selectedServerId, setSelectedServerId] = useState<string | null>(page?.server_id || null);
    const queryClient = useQueryClient();

    const [content, setContent] = useState(() => {
        if (page?.content) {
            if (typeof page.content === 'string') return page.content;
            return JSON.stringify(page.content);
        }
        return DEFAULT_PAGE_MARKDOWN;
    });

    const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm({
        defaultValues: {
            title: page?.title || "",
            description: page?.description || "",
            slug: page?.slug || "",
            content: page?.content
                ? typeof page.content === "string"
                    ? page.content
                    : JSON.stringify(page.content)
                : DEFAULT_PAGE_MARKDOWN,
            enabled: page?.enabled ?? true
        }
    });

    const insertMarkdown = (before: string, after: string = before) => {
        const textarea = document.getElementById('content') as HTMLTextAreaElement;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = content.substring(start, end);
        const newText = content.substring(0, start) + before + selectedText + after + content.substring(end);
        
        setContent(newText);
        setValue('content', newText);
        
        requestAnimationFrame(() => {
            setTimeout(() => {
                textarea.focus();
                const cursorPos = start + before.length + selectedText.length + after.length;
                textarea.setSelectionRange(cursorPos, cursorPos);
                
                const scrollPosition = textarea.scrollTop;
                textarea.scrollTop = scrollPosition;
            }, 0);
        });
    };

    const handleCopyToClipboard = () => {
        const textarea = document.getElementById('content') as HTMLTextAreaElement;
        if (!textarea) return;
        
        textarea.select();
        navigator.clipboard.writeText(content).then(() => {
            toast.success("Content copied to clipboard!");
        }).catch(() => {
            document.execCommand('copy');
            toast.success("Content copied to clipboard!");
        });
        
        setTimeout(() => {
            textarea.focus();
        }, 0);
    };

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const url = page ? backendApi(`admin/server-pages/${page.id}`) : backendApi("admin/server-pages");
            const method = page ? "PATCH" : "POST";
            const token = getAuthToken();
            const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
            if (token) headers["Authorization"] = `Bearer ${token}`;

            const response = await fetch(url, {
                method,
                credentials: "include",
                headers,
                body: JSON.stringify({
                    ...data,
                    server_id: selectedServerId || null,
                    content: content
                })
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                const message =
                    typeof error?.error === "string"
                        ? error.error
                        : typeof error?.message === "string"
                          ? error.message
                          : error?.errors && typeof error.errors === "object"
                            ? Object.values(error.errors).flat().find((m: unknown) => typeof m === "string") as string | undefined
                            : undefined;
                throw new Error(message || "Failed to save page");
            }

            return response.json();
        },
        onSuccess: () => {
            toast.success(page ? "Page updated successfully" : "Page created successfully");
            queryClient.invalidateQueries({ queryKey: ["serverPages"] });
            onSuccess?.();
        },
        onError: (error: Error) => {
            toast.error(error.message || "Failed to save page");
        }
    });

    const onSubmit = (data: any) => {
        if (!content || content.trim() === '') {
            toast.error("Content is required");
            return;
        }

        createMutation.mutate({ ...data, content: content });
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="server">Server (Optional)</Label>
                <ServerCombobox
                    value={selectedServerId || ""}
                    onChange={(value: string) => {
                        setSelectedServerId(value || null);
                    }}
                    disabled={!!page}
                    allowNone={true}
                />
                <p className="text-xs text-muted-foreground">
                    Leave empty for a general page (e.g., /about). Select a server for server-specific pages (e.g., /servers/[server]/commands).
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                    id="title"
                    {...register("title", { required: "Title is required" })}
                    placeholder="e.g., Server Commands or About Our Server"
                />
                {errors.title && (
                    <p className="text-sm text-destructive">{errors.title.message as string}</p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                    id="description"
                    rows={2}
                    {...register("description")}
                    placeholder="Shown under the title, like the line under the home heading"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="slug">URL Slug *</Label>
                <Input
                    id="slug"
                    {...register("slug", { 
                        required: "Slug is required",
                        pattern: {
                            value: /^[a-z0-9-]+$/,
                            message: "Slug must only contain lowercase letters, numbers, and hyphens"
                        }
                    })}
                    placeholder="e.g., commands or about"
                />
                <p className="text-xs text-muted-foreground">
                    URL: {selectedServerId ? `/servers/[server_id]/${watch('slug') || 'slug'}` : `/${watch('slug') || 'slug'}`}
                </p>
                {errors.slug && (
                    <p className="text-sm text-destructive">{errors.slug.message as string}</p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="content">Content (Markdown) *</Label>
                <div className="border rounded-lg overflow-hidden">
                    <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/50">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => insertMarkdown('**', '**')}
                            title="Bold"
                        >
                            <Bold className="h-4 w-4" />
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => insertMarkdown('*', '*')}
                            title="Italic"
                        >
                            <Italic className="h-4 w-4" />
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => insertMarkdown('## ', '')}
                            title="Heading"
                        >
                            <Heading className="h-4 w-4" />
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => insertMarkdown('- ', '')}
                            title="Bullet List"
                        >
                            <List className="h-4 w-4" />
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => insertMarkdown('[', '](url)')}
                            title="Link"
                        >
                            <Link className="h-4 w-4" />
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => insertMarkdown('`', '`')}
                            title="Code"
                        >
                            <Code className="h-4 w-4" />
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => insertMarkdown('![alt]', '(url)')}
                            title="Image"
                            aria-label="Insert image"
                        >
                            <ImageIcon className="h-4 w-4" />
                        </Button>
                        <div className="w-px h-6 bg-border mx-1" />
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => insertMarkdown('[copy:', ']')}
                            title="Click to Copy Text"
                        >
                            📋
                        </Button>
                        <div className="w-px h-6 bg-border mx-1" />
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleCopyToClipboard}
                            title="Copy content to clipboard"
                        >
                            <Copy className="h-4 w-4" />
                        </Button>
                    </div>
                    <Textarea
                        id="content"
                        value={content}
                        onChange={(e) => {
                            setContent(e.target.value);
                            setValue('content', e.target.value);
                        }}
                        placeholder={DEFAULT_PAGE_MARKDOWN}
                        rows={20}
                        className="font-mono text-sm border-0 resize-none"
                    />
                </div>
                <p className="text-xs text-muted-foreground">
                    Use the toolbar buttons above or write Markdown directly. Click toolbar buttons to insert formatting for selected text. [copy:text] makes a published command copyable.
                </p>
                <MarkdownGuide />
                {errors.content && (
                    <p className="text-sm text-destructive">{errors.content.message as string}</p>
                )}
            </div>

            <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                    <Label htmlFor="enabled">Enabled</Label>
                    <p className="text-sm text-muted-foreground">
                        Whether this page is visible to users
                    </p>
                </div>
                <Switch
                    id="enabled"
                    checked={watch("enabled")}
                    onCheckedChange={(checked) => setValue("enabled", checked)}
                />
            </div>

            <div className="flex justify-end gap-2">
                <Button
                    type="submit"
                    disabled={createMutation.isPending}
                >
                    {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {page ? "Update Page" : "Create Page"}
                </Button>
            </div>
        </form>
    );
}
