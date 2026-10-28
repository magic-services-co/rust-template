import { z } from 'zod'

export const navigationItemSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  url: z.string().min(1, 'URL is required'),
  order: z.number().int().min(0),
  hidden: z.boolean().default(false),
})

export type NavigationItem = z.infer<typeof navigationItemSchema> & {
  id: string
  children?: NavigationItem[]
}
