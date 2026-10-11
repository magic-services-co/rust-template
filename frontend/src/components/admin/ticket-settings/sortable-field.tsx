import React, { useState, useRef } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, ChevronUp, ChevronDown, Trash } from 'lucide-react'
import { FormField, FormItem, FormControl, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { backendApi } from '@/lib/api'
import { SortableFieldProps, FormValues, FieldType } from './types'
import { StringFieldDetails, NumberFieldDetails, BooleanFieldDetails, EnumFieldDetails, DateFieldDetails, TextAreaFieldDetails, PlayersFieldDetails, ServerFieldDetails } from './field-details'

export function SortableField({
    id,
    stepIndex,
    fieldIndex,
    control,
    remove
}: SortableFieldProps) {
    const [expanded, setExpanded] = useState(false)
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
    const { getValues, setValue } = useFormContext<FormValues>()

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    }

    const labelPath = `steps.${stepIndex}.fields.${fieldIndex}.label` as const
    const keyPath = `steps.${stepIndex}.fields.${fieldIndex}.key` as const
    const typePath = `steps.${stepIndex}.fields.${fieldIndex}.type` as const
    const optionsPath = `steps.${stepIndex}.fields.${fieldIndex}.options` as const

    const isFieldType = (value: unknown): value is FieldType =>
        ['string', 'number', 'boolean', 'enum', 'date', 'textarea', 'players', 'server', 'server-grid', 'players-grid'].includes(value as string);

    const watchedType = useWatch({ control, name: typePath })
    const fieldType = isFieldType(watchedType) ? watchedType : 'string'

    const slugifyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    React.useEffect(() => () => {
        if (slugifyTimeoutRef.current) clearTimeout(slugifyTimeoutRef.current)
    }, [])
    const queueSlug = (label: string) => {
        if (slugifyTimeoutRef.current) clearTimeout(slugifyTimeoutRef.current)
        const trimmed = label.trim()
        if (!trimmed) return
        slugifyTimeoutRef.current = setTimeout(() => {
            fetch(backendApi(`slugify?text=${encodeURIComponent(trimmed)}`))
                .then((res) => (res.ok ? res.json() : { slug: '' }))
                .then((data) => {
                    const next = data.slug ?? ''
                    if (getValues(keyPath) !== next) {
                        setValue(keyPath, next, { shouldDirty: true })
                    }
                })
                .catch(() => {})
        }, 300)
    }
    return (
        <div ref={setNodeRef} style={style} className="mb-4 p-4 border rounded-lg">
            <div className="flex items-center space-x-4">
                <div {...attributes} {...listeners}>
                    <GripVertical className="cursor-move" />
                </div>
                <FormField
                    control={control}
                    name={labelPath}
                    render={({ field }) => (
                        <FormItem className="flex-grow">
                            <FormControl>
                                <Input
                                    {...field}
                                    placeholder="Label"
                                    onChange={(event) => {
                                        field.onChange(event)
                                        queueSlug(event.target.value)
                                    }}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={control}
                    name={typePath}
                    render={({ field }) => (
                        <FormItem className="flex-shrink-0">
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Type" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="string">Short Response</SelectItem>
                                    <SelectItem value="textarea">Long Response</SelectItem>
                                    <SelectItem value="number">Number</SelectItem>
                                    <SelectItem value="boolean">True/False</SelectItem>
                                    <SelectItem value="enum">Select An Option</SelectItem>
                                    <SelectItem value="date">Select A Date</SelectItem>
                                    <SelectItem value="server">Select Servers (List)</SelectItem>
                                    <SelectItem value="server-grid">Select Servers (Grid)</SelectItem>
                                    <SelectItem value="players-grid">Select Players (Grid)</SelectItem>
                                </SelectContent>
                            </Select>
                        </FormItem>
                    )}
                />
                <FormField
                    control={control}
                    name={`steps.${stepIndex}.fields.${fieldIndex}.required`}
                    render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        id={`required-${stepIndex}-${fieldIndex}`}
                                    />
                                    <label htmlFor={`required-${stepIndex}-${fieldIndex}`}>
                                        Required
                                    </label>
                                </div>
                            </FormControl>
                        </FormItem>
                    )}
                />
                <Button type="button" size={"icon"} variant="ghost" onClick={() => setExpanded(!expanded)}>
                    {expanded ? <ChevronUp /> : <ChevronDown />}
                </Button>
                <Button type="button" size={"icon"} variant="destructive" onClick={() => remove(fieldIndex)}><Trash size={16} /></Button>
            </div>
            {expanded ? (
                <div className="mt-4 space-y-4">
                    <FormField
                        control={control}
                        name={`${optionsPath}.description`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                    <Input {...field} value={field.value ?? ''} placeholder="Description" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={control}
                        name={`${optionsPath}.placeholder`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Placeholder</FormLabel>
                                <FormControl>
                                    <Input {...field} value={field.value ?? ''} placeholder="Placeholder" />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                    {fieldType === 'string' ? (
                        <StringFieldDetails
                            stepIndex={stepIndex}
                            fieldIndex={fieldIndex}
                            control={control}
                            optionsPath={optionsPath}
                        />
                    ) : null}
                    {fieldType === 'number' ? (
                        <NumberFieldDetails
                            stepIndex={stepIndex}
                            fieldIndex={fieldIndex}
                            control={control}
                            optionsPath={optionsPath}
                        />
                    ) : null}
                    {fieldType === 'boolean' ? (
                        <BooleanFieldDetails
                            stepIndex={stepIndex}
                            fieldIndex={fieldIndex}
                            control={control}
                            optionsPath={optionsPath}
                        />
                    ) : null}
                    {fieldType === 'enum' ? (
                        <EnumFieldDetails
                            stepIndex={stepIndex}
                            fieldIndex={fieldIndex}
                            control={control}
                            optionsPath={optionsPath}
                        />
                    ) : null}
                    {fieldType === 'date' ? (
                        <DateFieldDetails
                            stepIndex={stepIndex}
                            fieldIndex={fieldIndex}
                            control={control}
                            optionsPath={optionsPath}
                        />
                    ) : null}
                    {fieldType === 'textarea' ? (
                        <TextAreaFieldDetails
                            stepIndex={stepIndex}
                            fieldIndex={fieldIndex}
                            control={control}
                            optionsPath={optionsPath}
                        />
                    ) : null}
                    {fieldType === 'players' ? (
                        <PlayersFieldDetails
                            stepIndex={stepIndex}
                            fieldIndex={fieldIndex}
                            control={control}
                            optionsPath={optionsPath}
                        />
                    ) : null}
                    {fieldType === 'server' ? (
                        <ServerFieldDetails
                        /*  stepIndex={stepIndex}
                         fieldIndex={fieldIndex}
                         control={control}
                         optionsPath={optionsPath} */
                        />
                    ) : null}
                    {fieldType === 'server-grid' ? (
                        <ServerFieldDetails
                        /*  stepIndex={stepIndex}
                         fieldIndex={fieldIndex}
                         control={control}
                         optionsPath={optionsPath} */
                        />
                    ) : null}
                    {fieldType === 'players-grid' ? (
                        <PlayersFieldDetails
                            stepIndex={stepIndex}
                            fieldIndex={fieldIndex}
                            control={control}
                            optionsPath={optionsPath}
                        />
                    ) : null}
                </div>
            ) : null}
        </div>
    )
}
