import React from 'react'
import { useFormContext } from 'react-hook-form'
import { FormField, FormItem, FormControl, FormLabel, FormDescription } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { CalendarIcon, Trash2 } from 'lucide-react'
import { FormValues } from './types'
import { Switch } from '@/components/ui/switch'


interface FieldDetailsProps {
    stepIndex: number
    fieldIndex: number
    control: any
    optionsPath: string
}

export function StringFieldDetails({ stepIndex, fieldIndex, control, optionsPath }: FieldDetailsProps) {
    return (
        <>
            <FormField
                control={control}
                name={`${optionsPath}.minLength`}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Min Length</FormLabel>
                        <FormControl>
                            <Input {...field} type="number" placeholder="Min Length" />
                        </FormControl>
                    </FormItem>
                )}
            />
            <FormField
                control={control}
                name={`${optionsPath}.maxLength`}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Max Length</FormLabel>
                        <FormControl>
                            <Input {...field} type="number" placeholder="Max Length" />
                        </FormControl>
                    </FormItem>
                )}
            />
        </>
    )
}

export function NumberFieldDetails({ stepIndex, fieldIndex, control, optionsPath }: FieldDetailsProps) {
    return (
        <div className="grid grid-cols-2 gap-4">
            <FormField
                control={control}
                name={`${optionsPath}.min`}
                render={({ field }) => (
                    <FormItem>
                        <FormControl>
                            <Input {...field} type="number" placeholder="Min Value" />
                        </FormControl>
                    </FormItem>
                )}
            />
            <FormField
                control={control}
                name={`${optionsPath}.max`}
                render={({ field }) => (
                    <FormItem>
                        <FormControl>
                            <Input {...field} type="number" placeholder="Max Value" />
                        </FormControl>
                    </FormItem>
                )}
            />
        </div>
    )
}

export function BooleanFieldDetails({ stepIndex, fieldIndex, control, optionsPath }: FieldDetailsProps) {
    return (
        <FormField
            control={control}
            name={`${optionsPath}.defaultValue`}
            render={({ field }) => (
                <FormItem className="space-y-2 flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-1 leading-none">
                        <FormLabel>Default Value</FormLabel>
                        <FormDescription>If checked, this field will be set to true by default.</FormDescription>
                    </div>
                    <FormControl>
                        <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                        />
                    </FormControl>
                </FormItem>
            )}
        />
    )
}

export function EnumFieldDetails({ stepIndex, fieldIndex, control }: FieldDetailsProps) {
    const { watch, setValue } = useFormContext<FormValues>()
    const optionsPath = `steps.${stepIndex}.fields.${fieldIndex}.options` as const
    const options = watch(`${optionsPath}.enumOptions`) as string[] | undefined

    const addOption = () => {
        const currentOptions = Array.isArray(options) ? options : []
        setValue(`${optionsPath}.enumOptions`, [...currentOptions, ''])
    }

    const removeOption = (optionIndex: number) => {
        const currentOptions = Array.isArray(options) ? [...options] : []
        currentOptions.splice(optionIndex, 1)
        setValue(`${optionsPath}.enumOptions`, currentOptions)
    }

    return (
        <div className="space-y-4">
            <FormLabel>Options</FormLabel>
            {Array.isArray(options) && options.map((_, optionIndex) => (
                <div key={optionIndex} className="flex items-center space-x-2">
                    <FormField
                        control={control}
                        name={`${optionsPath}.enumOptions.${optionIndex}`}
                        render={({ field }) => (
                            <FormItem className="flex-grow">
                                <FormControl>
                                    <Input {...field} placeholder={`Option ${optionIndex + 1}`} />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeOption(optionIndex)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ))}
            <div className="">
                <Button
                    type="button"
                    onClick={addOption}
                >
                    Add Option
                </Button>
            </div>
        </div>
    )
}

export function DateFieldDetails({ stepIndex, fieldIndex, control, optionsPath }: FieldDetailsProps) {
    return (
        <div className="grid grid-cols-2 gap-4">
            <FormField
                control={control}
                name={`${optionsPath}.minDate`}
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Min Date</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                                <FormControl>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-[240px] pl-3 text-left font-normal",
                                            !field.value && "text-muted-foreground"
                                        )}
                                    >
                                        {field.value ? (
                                            format(new Date(field.value), "PPP")
                                        ) : (
                                            <span>Pick a date</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={field.value ? new Date(field.value) : undefined}
                                    onSelect={(date) => field.onChange(date?.toISOString())}
                                />
                            </PopoverContent>
                        </Popover>
                    </FormItem>
                )}
            />
            <FormField
                control={control}
                name={`${optionsPath}.maxDate`}
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Max Date</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                                <FormControl>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-[240px] pl-3 text-left font-normal",
                                            !field.value && "text-muted-foreground"
                                        )}
                                    >
                                        {field.value ? (
                                            format(new Date(field.value), "PPP")
                                        ) : (
                                            <span>Pick a date</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={field.value ? new Date(field.value) : undefined}
                                    onSelect={(date) => field.onChange(date?.toISOString())}
                                />
                            </PopoverContent>
                        </Popover>
                    </FormItem>
                )}
            />
        </div>
    )
}

export function TextAreaFieldDetails({ stepIndex, fieldIndex, control, optionsPath }: FieldDetailsProps) {
    return (
        <>
            <FormField
                control={control}
                name={`${optionsPath}.minLength`}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Min Length</FormLabel>
                        <FormControl>
                            <Input {...field} type="number" placeholder="Min Length" />
                        </FormControl>
                    </FormItem>
                )}
            />
            <FormField
                control={control}
                name={`${optionsPath}.maxLength`}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Max Length</FormLabel>
                        <FormControl>
                            <Input {...field} type="number" placeholder="Max Length" />
                        </FormControl>
                    </FormItem>
                )}
            />
        </>
    )
}

export function PlayersFieldDetails({ stepIndex, fieldIndex, control, optionsPath }: FieldDetailsProps) {
    return (
        <>
            <FormField
                control={control}
                name={`${optionsPath}.min`}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Min Players</FormLabel>
                        <FormControl>
                            <Input {...field} type="number" placeholder="Min Players" />
                        </FormControl>
                    </FormItem>
                )}
            />
            <FormField
                control={control}
                name={`${optionsPath}.max`}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Max Players</FormLabel>
                        <FormControl>
                            <Input {...field} type="number" placeholder="Max Players" />
                        </FormControl>
                    </FormItem>
                )}
            />
        </>
    )
}

export function ServerFieldDetails() {
    return null;
}