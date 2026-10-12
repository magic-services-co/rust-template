"use client";

import React from 'react'
import { backendApi } from '@/lib/api'
import { getAuthToken } from '@/lib/laravel-auth'
import { useForm, FormProvider, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormValues, formSchema } from './category-manager'
import { Button } from '@/components/ui/button'
import { FormField, FormItem, FormControl, FormMessage, FormLabel } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { SortableStep } from './sortable-step'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { z } from 'zod'
import { Loader2, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
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
} from "@/components/ui/alert-dialog"

interface EditCategoryFormProps {
    category: FormValues & { slug: string; ticketCount?: number };
}

export function EditCategoryForm({ category }: EditCategoryFormProps) {
    const router = useRouter()
    const queryClient = useQueryClient();
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
    const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = React.useState(false);
    const hasTickets = (category.ticketCount ?? 0) > 0;
    const methods = useForm<z.input<typeof formSchema>, any, FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            ...category,
            steps: category.steps.map(step => ({
                ...step,
                fields: step.fields.map(field => ({
                    ...field,
                    options: field.options ? {
                        ...field.options
                    } : undefined
                }))
            }))
        },
        mode: 'onSubmit',
    })

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, keyboardSensorOptions)
    )
    const { fields: steps, append: appendStep, remove: removeStep } = useFieldArray({
        control: methods.control,
        name: 'steps',
    })

    const updateCategoryMutation = useMutation({
        mutationFn: async (updatedCategory: FormValues & { slug: string }) => {
            const token = getAuthToken();
            const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const response = await fetch(backendApi('admin/ticket-settings'), {
                method: 'PUT',
                credentials: 'include',
                headers,
                body: JSON.stringify(updatedCategory),
            });
            if (!response.ok) {
                const errorResponse = await response.json();
                throw new Error(errorResponse.message || 'Failed to update category');
            }
            return response.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ticket-admin-categories'] })
            toast.success('Category updated successfully')
        },
        onError: (error) => {
            toast.error(error instanceof Error ? error.message : 'Failed to update category')
        },
    });

    const deleteCategoryMutation = useMutation({
        mutationFn: async (slug: string) => {
            const token = getAuthToken();
            const headers: Record<string, string> = { Accept: 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const response = await fetch(backendApi(`admin/ticket-settings?slug=${slug}`), {
                method: 'DELETE',
                credentials: 'include',
                headers,
            });
            if (!response.ok) {
                const errorResponse = await response.json();
                throw new Error(errorResponse.message || 'Failed to delete category');
            }
            return response.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ticket-admin-categories'] })
            toast.success('Category deleted successfully')
            router.push('/admin/ticket-settings')
        },
        onError: (error) => {
            toast.error(error instanceof Error ? error.message : 'Failed to delete category')
        },
    });

    const onDragEnd = (event: DragEndEvent) => { 
    }

    const onSubmit = (data: FormValues) => {
        try {
            formSchema.parse(data);
            updateCategoryMutation.mutate({ ...data, slug: category.slug });
        } catch (error) {
            if (error instanceof z.ZodError) {
                console.error('Zod validation error:', error.issues);
                toast.error('Form validation failed. Please check your inputs.');
            } else {
                console.error('Unexpected error:', error);
                toast.error('An unexpected error occurred.');
            }
        }
    };

    return (
        <FormProvider {...methods}>
            <form
                onSubmit={methods.handleSubmit(onSubmit)}
                className="space-y-8"
            >
                <FormField
                    control={methods.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Category Name</FormLabel>
                            <FormControl>
                                <Input {...field} placeholder="Category Name" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={methods.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Card description</FormLabel>
                            <FormControl>
                                <Textarea
                                    {...field}
                                    value={field.value ?? ''}
                                    rows={3}
                                    placeholder={"Account, gameplay, or server questions\nAverage reply · under 2 hours"}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-3 gap-4">
                    <FormField
                        control={methods.control}
                        name="maxTicketsPerUser"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Max Open Tickets per User</FormLabel>
                                <FormControl>
                                    <Input
                                        {...field}
                                        type="number"
                                        min={1}
                                        value={field.value == null ? "" : String(field.value)}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                    <SortableContext items={steps.map(step => `step-${step.id}`)} strategy={verticalListSortingStrategy}>
                        {steps.map((step, stepIndex) => (
                            <SortableStep
                                key={step.id}
                                id={`step-${step.id}`}
                                stepIndex={stepIndex}
                                control={methods.control}
                                removeStep={removeStep}
                            />
                        ))}
                    </SortableContext>
                </DndContext>

                <div className="flex gap-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => appendStep({ name: `Step ${steps.length + 1}`, fields: [] })}
                    >
                        Add Step
                    </Button>
                    <div className="flex gap-4">
                        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                            <AlertDialogTrigger asChild>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    disabled={deleteCategoryMutation.isPending}
                                >
                                    {deleteCategoryMutation.isPending ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="w-4 h-4" />
                                    )}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure you want to delete this category?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        {hasTickets ? (
                                            <>
                                                This category has <strong>{category.ticketCount}</strong> ticket{category.ticketCount !== 1 ? 's' : ''} associated with it.
                                                <br /><br />
                                                This action cannot be undone. This will permanently delete the category,
                                                all its associated steps and fields, and <strong>all {category.ticketCount} ticket{category.ticketCount !== 1 ? 's' : ''}</strong> in this category.
                                            </>
                                        ) : (
                                            <>
                                                This action cannot be undone. This will permanently delete the category
                                                and all its associated steps and fields.
                                            </>
                                        )}
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={() => {
                                            if (hasTickets) {
                                                setIsDeleteDialogOpen(false);
                                                setIsConfirmDeleteDialogOpen(true);
                                            } else {
                                                deleteCategoryMutation.mutate(category.slug);
                                            }
                                        }}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                        {hasTickets ? 'Continue' : 'Delete'}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        
                        {hasTickets && (
                            <AlertDialog open={isConfirmDeleteDialogOpen} onOpenChange={setIsConfirmDeleteDialogOpen}>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Final Confirmation Required</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            You are about to permanently delete this category and <strong>all {category.ticketCount} ticket{category.ticketCount !== 1 ? 's' : ''}</strong> within it.
                                            <br /><br />
                                            <strong>This action cannot be undone.</strong>
                                            <br /><br />
                                            All ticket data, messages, and history will be permanently lost.
                                            <br /><br />
                                            Are you absolutely sure you want to proceed?
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel onClick={() => setIsConfirmDeleteDialogOpen(false)}>
                                            Cancel
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={() => {
                                                setIsConfirmDeleteDialogOpen(false);
                                                deleteCategoryMutation.mutate(category.slug);
                                            }}
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                            Yes, Delete Everything
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                        <Button
                            type="submit"
                            disabled={updateCategoryMutation.isPending}
                        >
                            {updateCategoryMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : 'Update Category'}
                        </Button>
                    </div>
                </div>
            </form>
        </FormProvider>
    )
}

const keyboardSensorOptions = {
    coordinateGetter: sortableKeyboardCoordinates,
}
