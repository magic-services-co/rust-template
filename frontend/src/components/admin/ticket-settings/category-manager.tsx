"use client";

import React, { useState } from 'react'
import { backendApi } from '@/lib/api'
import { getAuthToken } from '@/lib/laravel-auth'
import { useForm, FormProvider, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import {
    FormField, FormItem, FormControl, FormLabel, FormDescription
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs } from '@/components/ui/tabs'
import { SortableStep } from './sortable-step'
import { CategoryList } from './category-list'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner';
import { EditCategoryForm } from './edit-category-form'
import { useQueryState } from 'nuqs'

interface Category extends FormValues {
    slug: string;
    ticketCount?: number;
}


export const fieldSchema = z.object({
    label: z.string().min(1, 'Label is required'),
    key: z.string().min(1, 'Key is required'),
    type: z.enum(['string', 'number', 'boolean', 'enum', 'date', 'textarea', 'players', 'server', 'server-grid', 'players-grid']),
    required: z.boolean().default(false),
    options: z.object({
        description: z.string().nullable().optional(),
        placeholder: z.string().nullable().optional(),
        minLength: z.coerce.number().nullable().optional(),
        maxLength: z.coerce.number().nullable().optional(),
        min: z.coerce.number().nullable().optional(),
        max: z.coerce.number().nullable().optional(),
        defaultValue: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]).nullable().optional(),
        enumOptions: z.array(z.string()).nullable().optional(),
        minDate: z.string().nullable().optional(),
        maxDate: z.string().nullable().optional(),
    }).optional(),
})

export const stepSchema = z.object({
    id: z.number().optional(),
    name: z.string().min(1, 'Step name is required'),
    fields: z.array(fieldSchema),
})

export const formSchema = z.object({
    name: z.string().min(1, 'Category name is required'),
    description: z.string().optional(),
    steps: z.array(stepSchema),
    maxTicketsPerUser: z.coerce.number().min(1).optional(),
    ticketCooldownMinutes: z.coerce.number().min(1).optional(),
    maxTicketsPerCooldown: z.coerce.number().min(1).optional(),
})

export type FormValues = z.infer<typeof formSchema>

export function CategoryManager() {
    const [selectedCategory, setSelectedCategory] = useQueryState('category', {
        defaultValue: 'new',
        parse: (value) => value || 'new',
        serialize: (value) => value.toString(),
    })
    const queryClient = useQueryClient()

    const { data: categories, isLoading, error } = useQuery<Category[]>({
        queryKey: ['ticket-admin-categories'],
        queryFn: async () => {
            const token = getAuthToken();
            const headers: Record<string, string> = { Accept: 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const response = await fetch(backendApi('admin/ticket-settings'), { credentials: 'include', headers });
            if (!response.ok) throw new Error('Failed to fetch categories');
            return response.json()
        },
    })

    const createCategoryMutation = useMutation({
        mutationFn: async (newCategory: FormValues) => {
            const token = getAuthToken();
            const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const response = await fetch(backendApi('admin/ticket-settings'), {
                method: 'POST',
                credentials: 'include',
                headers,
                body: JSON.stringify(newCategory),
            });
            if (!response.ok) throw new Error('Failed to create category')
            return response.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ticket-admin-categories'] })
            queryClient.invalidateQueries({ queryKey: ['ticket-categories'] })
            methods.reset() 
            toast.success('Category created successfully')
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to create category')
        },
    })

    const reorderCategoriesMutation = useMutation({
        mutationFn: async (categorySlugs: string[]) => {
            const token = getAuthToken();
            const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const response = await fetch(backendApi('admin/ticket-settings/reorder'), {
                method: 'POST',
                credentials: 'include',
                headers,
                body: JSON.stringify({ categorySlugs }),
            });
            if (!response.ok) throw new Error('Failed to reorder categories')
            return response.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ticket-admin-categories'] })
            queryClient.invalidateQueries({ queryKey: ['ticket-categories'] })
            toast.success('Categories reordered successfully')
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to reorder categories')
        },
    })

    const methods = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            description: '',
            steps: [{
                name: 'Step 1',
                fields: [{
                    label: '',
                    key: '',
                    type: 'string',
                    required: false,
                    options: {
                        description: '',
                        placeholder: '',
                    }
                }]
            }],
            maxTicketsPerUser: 5,
            ticketCooldownMinutes: 30,
            maxTicketsPerCooldown: 2,
        },
    })

    const { fields: steps, append: appendStep, remove: removeStep } = useFieldArray({
        control: methods.control,
        name: 'steps',
    })

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, keyboardSensorOptions)
    )

    const onDragEnd = (event: DragEndEvent) => {
        const { active, over } = event

        if (!over) return

        if (active.id !== over.id) {
            const activeId = active.id.toString()
            const overId = over.id.toString()

            if (activeId.startsWith('step-') && overId.startsWith('step-')) {
                const oldIndex = steps.findIndex(step => `step-${step.id}` === activeId)
                const newIndex = steps.findIndex(step => `step-${step.id}` === overId)
                const newSteps = arrayMove(steps, oldIndex, newIndex)
                methods.setValue('steps', newSteps)
            } else {
                const [activeStepIndex, activeFieldIndex] = activeId.split('-').map(Number)
                const [overStepIndex, overFieldIndex] = overId.split('-').map(Number)

                if (activeStepIndex === overStepIndex) {
                    const newSteps = [...methods.getValues().steps]
                    const stepFields = newSteps[activeStepIndex].fields
                    const newFields = arrayMove(stepFields, activeFieldIndex, overFieldIndex ?? stepFields.length)
                    newSteps[activeStepIndex].fields = newFields
                    methods.setValue('steps', newSteps)
                }
            }
        }
    }

    const onSubmit = (data: FormValues) => {
        const processedData = {
            ...data,
            maxTicketsPerUser: data.maxTicketsPerUser ? Number(data.maxTicketsPerUser) : undefined,
            ticketCooldownMinutes: data.ticketCooldownMinutes ? Number(data.ticketCooldownMinutes) : undefined,
            maxTicketsPerCooldown: data.maxTicketsPerCooldown ? Number(data.maxTicketsPerCooldown) : undefined,
        }
        createCategoryMutation.mutate(processedData)
    }

    const handleSelectCategory = (categoryId: string) => {
        setSelectedCategory(categoryId)
    }

    if (isLoading) return <div>Loading categories...</div>
    if (error) return <div>Error loading categories: {error.message}</div>

    const activeCategory = categories?.find((category) => category.slug === selectedCategory)

    return (
        <Tabs value={selectedCategory ?? 'new'} className="flex gap-4 h-full">
            <Card>
                <CardHeader>
                    <CardTitle>Categories</CardTitle>
                </CardHeader>
                <CardContent>
                    <CategoryList
                        categories={categories || []}
                        selectedCategory={selectedCategory}
                        onSelectCategory={handleSelectCategory}
                        onReorderCategories={(categorySlugs) => {
                            reorderCategoriesMutation.mutate(categorySlugs)
                        }}
                    />
                </CardContent>
            </Card>

            <div className="flex-grow">
                {selectedCategory !== 'new' && activeCategory ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>{activeCategory.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <EditCategoryForm key={activeCategory.slug} category={activeCategory} />
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardHeader>
                            <CardTitle>New Category</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <FormProvider {...methods}>
                                <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-8">
                                    <FormField
                                        control={methods.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Category Name</FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder="Category Name" />
                                                </FormControl>
                                                <FormDescription>
                                                    The name of the ticket category.
                                                </FormDescription>
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
                                                <FormDescription>
                                                    First line appears under the title. A second line becomes the small footer note on the card.
                                                </FormDescription>
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
                                                        <Input {...field} type="number" min={1} />
                                                    </FormControl>
                                                    <FormDescription>
                                                        Maximum number of open tickets a user can have in this category.
                                                    </FormDescription>
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
                                    <div className="flex gap-4 justify-between">
                                        <Button
                                            type="button"
                                            variant={"outline"}
                                            onClick={() => appendStep({ name: `Step ${steps.length + 1}`, fields: [] })}
                                        >
                                            Add Step
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={createCategoryMutation.isPending}
                                        >
                                            {createCategoryMutation.isPending ? 'Saving...' : 'Save Category'}
                                        </Button>
                                    </div>
                                </form>
                            </FormProvider>
                        </CardContent>
                    </Card>
                )}
            </div>
        </Tabs>
    )
}

const keyboardSensorOptions = {
    coordinateGetter: sortableKeyboardCoordinates,
}
