"use client";

import { useState } from 'react';
import { backendApi } from '@/lib/api';
import { getAuthToken } from '@/lib/laravel-auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog"
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
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Pencil } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

const redirectSchema = z.object({
    source: z.string().min(1, "Source path is required"),
    destination: z.string().min(1, "Destination URL is required"),
    permanent: z.boolean().default(false),
});

type RedirectFormData = z.output<typeof redirectSchema>;

interface Redirect {
    id: number;
    source: string;
    destination: string;
    permanent: boolean;
}

function RedirectForm({
    onSubmit,
    initialData = null,
    isLoading
}: {
    onSubmit: (data: RedirectFormData) => void,
    initialData?: Redirect | null,
    isLoading: boolean
}) {
    const form = useForm<z.input<typeof redirectSchema>, any, RedirectFormData>({
        resolver: zodResolver(redirectSchema),
        defaultValues: initialData || {
            source: '',
            destination: '',
            permanent: false
        }
    });

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="source"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Source Path</FormLabel>
                            <FormControl>
                                <Input placeholder="/old-path" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="destination"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Destination URL</FormLabel>
                            <FormControl>
                                <Input placeholder="/new-path" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="permanent"
                    render={({ field }) => (
                        <FormItem className="flex space-y-0 items-center space-x-2">
                            <FormControl>
                                <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                            <FormLabel>Permanent Redirect (301)</FormLabel>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <DialogFooter>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        {initialData ? 'Update' : 'Create'} Redirect
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    );
}

export function RedirectsForm() {
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [editingRedirect, setEditingRedirect] = useState<Redirect | null>(null);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const queryClient = useQueryClient();

    const { data: redirects, isLoading } = useQuery<Redirect[]>({
        queryKey: ['redirects'],
        queryFn: async () => {
            const token = getAuthToken();
            const headers: Record<string, string> = { Accept: 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const res = await fetch(backendApi('admin/redirects'), { credentials: 'include', headers });
            if (!res.ok) throw new Error('Failed to fetch redirects');
            return res.json();
        }
    });

    const createMutation = useMutation({
        mutationFn: async (data: RedirectFormData) => {
            const token = getAuthToken();
            const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const res = await fetch(backendApi('admin/redirects'), {
                method: 'PUT',
                credentials: 'include',
                headers,
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to create redirect');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['redirects'] });
            toast.success('Redirect created successfully');
            setIsAddOpen(false);
        },
        onError: () => {
            toast.error('Failed to create redirect');
        }
    });

    const updateMutation = useMutation({
        mutationFn: async (data: RedirectFormData) => {
            const token = getAuthToken();
            const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const res = await fetch(backendApi('admin/redirects'), {
                method: 'PUT',
                credentials: 'include',
                headers,
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to update redirect');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['redirects'] });
            toast.success('Redirect updated successfully');
            setIsEditOpen(false);
            setEditingRedirect(null);
        },
        onError: () => {
            toast.error('Failed to update redirect');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const token = getAuthToken();
            const headers: Record<string, string> = { Accept: 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const res = await fetch(backendApi(`admin/redirects?id=${id}`), {
                method: 'DELETE',
                credentials: 'include',
                headers,
            });
            if (!res.ok) throw new Error('Failed to delete redirect');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['redirects'] });
            toast.success('Redirect deleted successfully');
            setDeleteId(null);
        },
        onError: () => {
            toast.error('Failed to delete redirect');
            setDeleteId(null);
        }
    });

    if (isLoading) {
        return <div className="flex items-center justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin" />
        </div>;
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>URL Redirects</CardTitle>
                        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Redirect
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Add New Redirect</DialogTitle>
                                </DialogHeader>
                                <RedirectForm
                                    onSubmit={createMutation.mutate}
                                    isLoading={createMutation.isPending}
                                />
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Source Path</TableHead>
                                <TableHead>Destination URL</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="w-[100px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {redirects?.map((redirect) => (
                                <TableRow key={redirect.id}>
                                    <TableCell>{redirect.source}</TableCell>
                                    <TableCell>{redirect.destination}</TableCell>
                                    <TableCell>{redirect.permanent ? 'Permanent (301)' : 'Temporary (302)'}</TableCell>
                                    <TableCell>
                                        <div className="flex space-x-2">
                                            <Dialog open={isEditOpen && editingRedirect?.id === redirect.id}
                                                onOpenChange={(open) => {
                                                    setIsEditOpen(open);
                                                    if (!open) setEditingRedirect(null);
                                                }}>
                                                <DialogTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setEditingRedirect(redirect)}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>Edit Redirect</DialogTitle>
                                                    </DialogHeader>
                                                    <RedirectForm
                                                        onSubmit={updateMutation.mutate}
                                                        initialData={editingRedirect}
                                                        isLoading={updateMutation.isPending}
                                                    />
                                                </DialogContent>
                                            </Dialog>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => setDeleteId(redirect.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the redirect.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteId && deleteMutation.mutate(deleteId)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleteMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : null}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
