import type { Control } from 'react-hook-form'
import type { z } from 'zod'
import { formSchema, type FormValues } from './category-manager'

export type { FormValues }

type CategoryFormControl = Control<z.input<typeof formSchema>, any, FormValues>

export type FieldType = 'string' | 'number' | 'boolean' | 'enum' | 'date' | 'textarea' | 'players' | 'server' | 'server-grid' | 'players-grid'

export interface SortableFieldProps {
    id: string
    stepIndex: number
    fieldIndex: number
    control: CategoryFormControl
    remove: (index: number) => void
}

export interface SortableStepProps {
    id: string
    stepIndex: number
    control: CategoryFormControl
    removeStep: (index: number) => void
}
