import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { navigationItemSchema } from '@/types/navigation'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface AddNavigationDialogProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (data: z.infer<typeof navigationItemSchema>) => void
}

export function AddNavigationDialog({ isOpen, onClose, onSubmit }: AddNavigationDialogProps) {
    const form = useForm<z.input<typeof navigationItemSchema>, any, z.output<typeof navigationItemSchema>>({
        resolver: zodResolver(navigationItemSchema),
        defaultValues: {
            label: '',
            url: '',
            order: 0,
            hidden: false,
        },
    })

    const handleSubmit = (data: z.infer<typeof navigationItemSchema>) => {
        onSubmit(data)
        form.reset()
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Navigation Item</DialogTitle>
                    <DialogDescription>Add a new navigation link to the main navigation bar.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="label"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Label</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="url"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>URL</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="order"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Order</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            min={0}
                                            {...field}
                                            value={field.value ?? ""}
                                            onChange={e => {
                                                const v = e.target.value === "" ? 0 : parseInt(e.target.value, 10);
                                                field.onChange(Number.isNaN(v) ? 0 : v);
                                            }}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit">Add Item</Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
