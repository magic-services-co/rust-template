"use client"

import { backendApi } from '@/lib/api'
import { getAuthToken } from '@/lib/laravel-auth'
import { useMemo, useState, useEffect } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CategoryWithId } from '@/types/tickets'
import { Checkbox } from '@/components/ui/checkbox'
import { format } from 'date-fns'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { CalendarIcon, Loader2 } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { ServerCombobox } from '@/components/server-combobox'
import ServerGrid from './server-grid'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import PlayerGrid from './player-grid'
import { useSupportTheme } from '@/hooks/use-support-theme'
import { withSupportDefaults } from '@/lib/layout-theme-defaults'
import { ErrorCta, ErrorHint, ErrorPageContent } from '@/components/error-page'
import { HomeCardCorners } from '@/components/home/home-card-corners'

interface DynamicTicketFormProps {
    categorySlug: string
    serverTheme?: any
}

export function DynamicTicketForm({ categorySlug, serverTheme }: DynamicTicketFormProps) {
    const { data: clientTheme } = useSupportTheme();
    const theme = withSupportDefaults(clientTheme || serverTheme);
    
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(0)
    const [direction, setDirection] = useState(0)

    const { data: category, isLoading, isError, error } = useQuery<CategoryWithId>({
        queryKey: ['ticket-category', categorySlug],
        queryFn: async () => {
            const response = await fetch(backendApi(`support/${categorySlug}`), { credentials: 'include' })
            if (!response.ok) throw new Error('Failed to fetch category')
            return response.json()
        },
    })

    const formSchema = useMemo(() => {
        return z.object(
            (category?.steps ?? []).reduce((acc: any, step: any) => {
                step.fields.forEach((field: any) => {
                    let fieldSchema
                    switch (field.type) {
                        case 'string':
                            fieldSchema = z.string()
                            if (field.options?.minLength) fieldSchema = fieldSchema.min(field.options.minLength, `Minimum length is ${field.options.minLength}`)
                            if (field.options?.maxLength) fieldSchema = fieldSchema.max(field.options.maxLength, `Maximum length is ${field.options.maxLength}`)
                            break
                        case 'number':
                            fieldSchema = z.number()
                            if (field.options?.min) fieldSchema = fieldSchema.min(field.options.min, `Minimum value is ${field.options.min}`)
                            if (field.options?.max) fieldSchema = fieldSchema.max(field.options.max, `Maximum value is ${field.options.max}`)
                            break
                        case 'boolean':
                            fieldSchema = z.boolean()
                            break
                        case 'enum':
                            fieldSchema = z.enum(field.options?.enumOptions || [])
                            break
                        case 'date':
                            fieldSchema = z.date()
                            if (field.options?.minDate) fieldSchema = fieldSchema.min(new Date(field.options.minDate), `Minimum date is ${field.options.minDate}`)
                            if (field.options?.maxDate) fieldSchema = fieldSchema.max(new Date(field.options.maxDate), `Maximum date is ${field.options.maxDate}`)
                            break
                        case 'textarea':
                            fieldSchema = z.string()
                            if (field.options?.minLength) fieldSchema = fieldSchema.min(field.options.minLength, `Minimum length is ${field.options.minLength}`)
                            if (field.options?.maxLength) fieldSchema = fieldSchema.max(field.options.maxLength, `Maximum length is ${field.options.maxLength}`)
                            break
                        case 'players':
                            fieldSchema = z.array(z.string())
                            if (field.options?.min) fieldSchema = fieldSchema.min(field.options.min, `Minimum ${field.options.min} players required`)
                            if (field.options?.max) fieldSchema = fieldSchema.max(field.options.max, `Maximum ${field.options.max} players allowed`)
                            break
                        case 'server':
                            fieldSchema = z.string()
                            break
                        case 'server-grid':
                            fieldSchema = z.string()
                            break
                        case 'players-grid':
                            fieldSchema = z.array(z.string())
                            if (field.options?.min) fieldSchema = fieldSchema.min(field.options.min, `Minimum ${field.options.min} players required`)
                            if (field.options?.max) fieldSchema = fieldSchema.max(field.options.max, `Maximum ${field.options.max} players allowed`)
                            break
                        default:
                            fieldSchema = z.string()
                    }
                    acc[field.key] = field.required ? fieldSchema : fieldSchema.optional()
                })
                return acc
            }, {})
        )
    }, [category]);

    const submitTicket = useMutation({
        mutationFn: async (data: z.infer<typeof formSchema>) => {
            const token = getAuthToken()
            const headers: Record<string, string> = { 'Content-Type': 'application/json' }
            if (token) headers['Authorization'] = `Bearer ${token}`
            const response = await fetch(backendApi('support'), {
                method: 'POST',
                headers,
                credentials: 'include',
                body: JSON.stringify({ content: data, categoryId: categorySlug }),
            })
            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to submit ticket')
            }
            return response.json()
        },
        onSuccess: (data) => {
            toast.success('Ticket submitted successfully')
            router.push(`/ticket/${data.id}`)
        },
        onError: (error) => {
            toast.error(error.message === 'Unauthorized' ? (
                'Please sign in to submit a ticket!'
            ) : (
                error.message || 'Failed to submit ticket'
            ))
        }
    })

    const defaultValues = useMemo(() =>
        category?.steps?.reduce((acc: any, step: any) => {
            step.fields.forEach((field: any) => {
                if (field.type === 'players-grid') {
                    acc[field.key] = []
                } else if (field.type === 'boolean') {
                    const def = field.options?.defaultValue
                    acc[field.key] = def === true || def === 'true'
                } else {
                    acc[field.key] = ''
                }
            })
            return acc
        }, {}) ?? {},
    [category])

    const form = useForm<Record<string, any>>({
        resolver: zodResolver(formSchema) as Resolver<Record<string, any>>,
        defaultValues,
        mode: 'onSubmit',
        criteriaMode: 'all'
    })

    useEffect(() => {
        if (!category?.steps?.length) return
        const values = (category?.steps ?? []).reduce((acc: any, step: any) => {
            step.fields.forEach((field: any) => {
                if (field.type === 'players-grid') acc[field.key] = []
                else if (field.type === 'boolean') {
                    const def = field.options?.defaultValue
                    acc[field.key] = def === true || def === 'true'
                }
                else acc[field.key] = ''
            })
            return acc
        }, {})
        form.reset(values)
    }, [category, form])

    const formVars = {
        ["--support-kicker" as string]: theme.kickerColor,
        ["--support-title" as string]: theme.titleColor,
        ["--support-label" as string]: theme.labelColor,
        ["--support-help" as string]: theme.helpTextColor,
        ["--support-input-bg" as string]: theme.inputBackground,
        ["--support-input-border" as string]: theme.inputBorder,
        ["--support-input-text" as string]: theme.inputText,
        ["--support-input-placeholder" as string]: theme.inputPlaceholder,
        ["--support-input-focus" as string]: theme.inputFocusBorder,
    }

    if (isLoading) {
        return (
            <div className="flex min-h-[300px] flex-col items-center justify-center py-16">
                <Loader2 className="h-10 w-10 animate-spin" style={{ color: theme.loadingSpinnerColor }} />
                <p className="support-form-meta pt-4 text-sm">Loading form</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="mx-auto max-w-[555px] pt-6">
                <ErrorHint>
                    <p className="font-mono text-[11px] uppercase tracking-[1.4px] text-[#e8a0a3]">
                        Could not load form
                    </p>
                    <p className="pt-2">{error.message}</p>
                </ErrorHint>
                <div className="flex justify-center pt-6">
                    <ErrorCta href="/support" variant="secondary">
                        BACK TO SUPPORT
                    </ErrorCta>
                </div>
            </div>
        );
    }

    if (!category) {
        return (
            <div className="mx-auto max-w-[555px] pt-6">
                <ErrorHint>
                    <p className="font-mono text-[11px] uppercase tracking-[1.4px] text-[#e8a0a3]">
                        Category not found
                    </p>
                    <p className="pt-2">This support form doesn&apos;t exist or is no longer available.</p>
                </ErrorHint>
                <div className="flex justify-center pt-6">
                    <ErrorCta href="/support">VIEW SUPPORT</ErrorCta>
                </div>
            </div>
        );
    }

    const currentStepFields = (category?.steps ?? []).find(step => step.order === currentStep)?.fields || []
    const currentStepMeta = (category?.steps ?? []).find(step => step.order === currentStep)
    const stepCount = (category?.steps ?? []).length
    const comboTriggerStyle = {
        backgroundColor: theme.inputBackground,
        borderColor: theme.inputBorder,
        color: theme.inputText,
        borderRadius: theme.buttonBorderRadius,
    }
    const comboContentStyle = {
        backgroundColor: "#0b0f15",
        borderColor: "rgba(255,255,255,0.1)",
        color: "#edf5ff",
    }

    const variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 300 : -300,
            opacity: 0
        }),
        center: {
            x: 0,
            opacity: 1
        },
        exit: (direction: number) => ({
            x: direction < 0 ? 300 : -300,
            opacity: 0
        })
    }

    const handleNext = async (e: React.MouseEvent) => {
        e.preventDefault()
        const isValid = await form.trigger(currentStepFields.map((field: Record<string, unknown>) => field.key as string).filter(Boolean) as string[])
        if (isValid) {
            setDirection(1)
            setCurrentStep(prev => Math.min(prev + 1, (category?.steps ?? []).length - 1))
        }
    }

    const handlePrevious = () => {
        setDirection(-1)
        setCurrentStep(prev => prev - 1)
    }

    const onSubmit = (data: z.infer<typeof formSchema>) => {

        submitTicket.mutate(data)
    }

    return (
        <div
            className="support-ticket-form relative mx-auto mt-8 w-full max-w-[1200px] overflow-visible border p-5 sm:p-8"
            style={{
                backgroundColor: theme.formBackground,
                borderColor: theme.formBorder,
                borderRadius: theme.cardBorderRadius,
                ...formVars,
            }}
        >
            <div className="flex flex-wrap items-end justify-between gap-3 border-b pb-5" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                <div>
                    <p className="support-form-kicker text-[9px] font-bold tracking-[1.62px]">
                        {String(currentStepMeta?.name || "DETAILS").toUpperCase()}
                    </p>
                    <p className="support-form-title pt-1 text-[18px] font-extrabold leading-7">
                        {String(category.name || "").toUpperCase()}
                    </p>
                </div>
                <p className="support-form-meta text-[10px] tracking-[1.2px]">
                    STEP {String(currentStep + 1).padStart(2, "0")} OF {String(stepCount).padStart(2, "0")}
                </p>
            </div>
            <div className="overflow-hidden pt-6">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <AnimatePresence custom={direction} mode="wait">
                            <motion.div
                                key={currentStep}
                                custom={direction}
                                variants={variants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ type: 'tween', duration: 0.3 }}
                                className="space-y-6"
                            >
                                {currentStepFields.map((field, index) => (
                                    <FormField
                                        key={String((field as Record<string, unknown>).id ?? (field as Record<string, unknown>).key ?? index)}
                                        control={form.control}
                                        name={(field as Record<string, unknown>).key as string}
                                        render={({ field: formField }) => (
                                            <FormItem>
                                                {field.type !== 'boolean' ? (
                                                    <FormLabel className="support-form-label">
                                                        {(field as Record<string, unknown>).label as React.ReactNode}
                                                        {Boolean((field as Record<string, unknown>).required) && <span className="ml-0.5" style={{ color: theme.errorTextColor }}>*</span>}
                                                    </FormLabel>
                                                ) : null}
                                                <FormControl>
                                                    <>
                                                        {field.type === 'string' && (
                                                            <Input
                                                                {...formField}
                                                                value={formField.value || ''}
                                                                placeholder={String(((field as Record<string, unknown>).options as Record<string, unknown> | undefined)?.placeholder ?? '')}
                                                                className="support-form-input h-[41px] rounded-none"
                                                            />
                                                        )}
                                                        {field.type === 'number' && (
                                                            <Input
                                                                {...formField}
                                                                type="number"
                                                                onChange={(e) => formField.onChange(Number(e.target.value))}
                                                                value={formField.value}
                                                                placeholder={String(((field as Record<string, unknown>).options as Record<string, unknown> | undefined)?.placeholder ?? '')}
                                                                className="support-form-input h-[41px] rounded-none"
                                                            />
                                                        )}
                                                        {field.type === 'boolean' ? (
                                                            <button
                                                                type="button"
                                                                className="ghost flex w-full cursor-pointer items-center justify-between gap-4 border px-4 py-3 text-left"
                                                                style={{
                                                                    borderColor: formField.value ? "#ba9142" : theme.inputBorder,
                                                                    backgroundColor: theme.inputBackground,
                                                                }}
                                                                onClick={() => formField.onChange(!Boolean(formField.value))}
                                                                aria-pressed={Boolean(formField.value)}
                                                            >
                                                                <span className="support-form-label m-0 pointer-events-none">
                                                                    {(field as Record<string, unknown>).label as React.ReactNode}
                                                                    {Boolean((field as Record<string, unknown>).required) && <span className="ml-0.5" style={{ color: theme.errorTextColor }}>*</span>}
                                                                </span>
                                                                <Checkbox
                                                                    className="ghost support-form-check pointer-events-none"
                                                                    checked={Boolean(formField.value)}
                                                                    tabIndex={-1}
                                                                    aria-hidden
                                                                />
                                                            </button>
                                                        ) : null}
                                                        {field.type === 'enum' ? (
                                                            <Select onValueChange={formField.onChange} defaultValue={formField.value}>
                                                                <SelectTrigger className="ghost support-form-input h-[41px] rounded-none">
                                                                    <SelectValue placeholder={String(field.label || "Select an option")} />
                                                                </SelectTrigger>
                                                                <SelectContent className="site-user-menu z-[200] rounded-none">
                                                                    {((((field as Record<string, unknown>).options as Record<string, unknown> | undefined)?.enumOptions as string[] | undefined) ?? []).map((option: string) => (
                                                                        <SelectItem key={option} value={option} className="site-user-menu-item rounded-none">
                                                                            {option}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        ) : null}
                                                        {field.type === 'date' ? (
                                                            <Popover>
                                                                <PopoverTrigger asChild>
                                                                    <button
                                                                        type="button"
                                                                        className={cn(
                                                                            "ghost support-form-input flex h-[41px] w-full items-center px-3 text-left text-sm font-normal",
                                                                            !formField.value && "opacity-70"
                                                                        )}
                                                                    >
                                                                        {formField.value ? (
                                                                            format(formField.value, "PPP")
                                                                        ) : (
                                                                            <span>Pick a date</span>
                                                                        )}
                                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                                    </button>
                                                                </PopoverTrigger>
                                                                <PopoverContent className="site-user-menu z-[200] w-auto rounded-none p-0" align="start">
                                                                    <Calendar
                                                                        mode="single"
                                                                        selected={formField.value}
                                                                        onSelect={formField.onChange}
                                                                        disabled={(date) => {
                                                                            if (((field as Record<string, unknown>).options as Record<string, unknown> | undefined)?.minDate && date < new Date(((field as Record<string, unknown>).options as Record<string, unknown>).minDate as string)) {
                                                                                return true;
                                                                            }
                                                                            if (((field as Record<string, unknown>).options as Record<string, unknown> | undefined)?.maxDate && date > new Date(((field as Record<string, unknown>).options as Record<string, unknown>).maxDate as string)) {
                                                                                return true;
                                                                            }
                                                                            return false;
                                                                        }}
                                                                    />
                                                                </PopoverContent>
                                                            </Popover>
                                                        ) : null}
                                                        {field.type === 'textarea' ? (
                                                            <Textarea
                                                                {...formField}
                                                                placeholder={String(((field as Record<string, unknown>).options as Record<string, unknown> | undefined)?.placeholder ?? '')}
                                                                className="support-form-input min-h-[120px] rounded-none"
                                                            />
                                                        ) : null}
                                                        {field.type === 'players' ? (
                                                            <ServerCombobox
                                                                value={formField.value}
                                                                onChange={formField.onChange}
                                                                groupByCategory={false}
                                                                allowGlobal={false}
                                                                triggerClassName="ghost support-form-input h-[41px] rounded-none"
                                                                triggerStyle={comboTriggerStyle}
                                                                popoverContentClassName="site-user-menu z-[200] rounded-none"
                                                                popoverContentStyle={comboContentStyle}
                                                            />
                                                        ) : null}
                                                        {field.type === 'server' ? (
                                                            <ServerCombobox
                                                                value={formField.value}
                                                                onChange={formField.onChange}
                                                                align='start'
                                                                triggerClassName="ghost support-form-input h-[41px] rounded-none"
                                                                triggerStyle={comboTriggerStyle}
                                                                popoverContentClassName="site-user-menu z-[200] rounded-none"
                                                                popoverContentStyle={comboContentStyle}
                                                            />
                                                        ) : null}
                                                        {field.type === 'server-grid' ? (
                                                            <>
                                                                <FormMessage />
                                                                <ServerGrid
                                                                    value={formField.value}
                                                                    onChange={formField.onChange}
                                                                />
                                                            </>
                                                        ) : null}
                                                        {field.type === 'players-grid' ? (
                                                            <>
                                                                <FormMessage />
                                                                <PlayerGrid
                                                                    value={formField.value}
                                                                    onChange={formField.onChange}
                                                                />
                                                            </>
                                                        ) : null}
                                                    </>
                                                </FormControl>
                                                {Boolean(((field as Record<string, unknown>).options as Record<string, unknown> | undefined)?.description) && (
                                                    <FormDescription className="support-form-help">
                                                        {((field as Record<string, unknown>).options as Record<string, unknown> | undefined)?.description as React.ReactNode}
                                                    </FormDescription>
                                                )}
                                                {field.type === 'server-grid' || field.type === 'players-grid' ? null : <FormMessage />}
                                            </FormItem>
                                        )}
                                    />
                                ))}
                            </motion.div>
                        </AnimatePresence>
                        <div className="flex justify-between gap-3 border-t pt-6" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                            {currentStep > 0 ? (
                                <button
                                    type="button"
                                    className="ghost support-form-btn-secondary flex h-[41px] min-w-[120px] items-center justify-center px-5 text-[10px] font-bold tracking-[1.4px]"
                                    onClick={handlePrevious}
                                >
                                    PREVIOUS
                                </button>
                            ) : <span />}
                            {currentStep < (stepCount - 1) ? (
                                <button
                                    type="button"
                                    className="ghost support-form-btn-primary flex h-[41px] min-w-[120px] items-center justify-center px-5 text-[10px] font-bold tracking-[1.4px]"
                                    onClick={handleNext}
                                >
                                    NEXT
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    disabled={submitTicket.isPending || submitTicket.isSuccess}
                                    className="ghost support-form-btn-primary flex h-[41px] min-w-[160px] items-center justify-center px-5 text-[10px] font-bold tracking-[1.4px] disabled:opacity-50"
                                >
                                    {submitTicket.isPending ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : 'SUBMIT TICKET'}
                                </button>
                            )}
                        </div>
                    </form>
                </Form>
            </div>
            <HomeCardCorners color="#ba9142" show />
        </div>
    )
}
