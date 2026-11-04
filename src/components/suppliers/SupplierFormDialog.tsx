import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReservoirs } from '@/hooks/useReservoirs';
import { Supplier, SupplierInsert } from '@/hooks/useSuppliers';

const formSchema = z.object({
    collector_name: z.string().min(2, { message: 'Collector name is required' }),
    collector_phone: z.string().min(5, { message: 'Collector phone is required' }),
    association_name: z.string().min(2, { message: 'Fisheries association name is required' }),
    association_address: z.string().min(5, { message: 'Fisheries association address is required' }),
    reservoir_id: z.string({ required_error: 'Reservoir is required' }).min(1, 'Reservoir is required'),
});

interface SupplierFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    supplier: Supplier | null;
    onSubmit: (data: SupplierInsert) => Promise<void>;
    isLoading: boolean;
}

export function SupplierFormDialog({
    open,
    onOpenChange,
    supplier,
    onSubmit,
    isLoading,
}: SupplierFormDialogProps) {
    const { data: reservoirs } = useReservoirs();
    const form = useForm<SupplierInsert>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            collector_name: '',
            collector_phone: '',
            association_name: '',
            association_address: '',
            reservoir_id: '',
        },
    });

    useEffect(() => {
        if (supplier) {
            form.reset({
                collector_name: supplier.collector_name,
                collector_phone: supplier.collector_phone,
                association_name: supplier.association_name,
                association_address: supplier.association_address,
                reservoir_id: supplier.reservoir_id || '',
            });
        } else {
            form.reset({
                collector_name: '',
                collector_phone: '',
                association_name: '',
                association_address: '',
                reservoir_id: '',
            });
        }
    }, [supplier, form, open]);

    const handleFormSubmit = async (values: SupplierInsert) => {
        await onSubmit(values);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{supplier ? 'Edit Supplier' : 'Add New Supplier'}</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 pt-4">
                        <FormField
                            control={form.control}
                            name="collector_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Collector Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter collector name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="collector_phone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Collector Telephone Number</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter telephone number" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="association_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Fisheries Association Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter association name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="association_address"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Fisheries Association Address</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Enter association address" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="reservoir_id"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Select Reservoir</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    className={cn(
                                                        "w-full justify-between font-normal",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    {field.value
                                                        ? reservoirs?.find(
                                                            (reservoir) => reservoir.id === field.value
                                                        )?.name
                                                        : "Select reservoir..."}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                                            <Command>
                                                <CommandInput placeholder="Search reservoir..." />
                                                <CommandList>
                                                    <CommandEmpty>No reservoir found.</CommandEmpty>
                                                    <CommandGroup>
                                                        {reservoirs?.map((reservoir) => (
                                                            <CommandItem
                                                                value={reservoir.name}
                                                                key={reservoir.id}
                                                                onSelect={() => {
                                                                    form.setValue("reservoir_id", reservoir.id);
                                                                }}
                                                            >
                                                                <Check
                                                                    className={cn(
                                                                        "mr-2 h-4 w-4",
                                                                        reservoir.id === field.value
                                                                            ? "opacity-100"
                                                                            : "opacity-0"
                                                                    )}
                                                                />
                                                                {reservoir.name}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isLoading} className="gradient-water">
                                {isLoading ? 'Saving...' : supplier ? 'Update Supplier' : 'Add Supplier'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
