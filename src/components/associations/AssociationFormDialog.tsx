import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, Save, Building, Users, CreditCard } from 'lucide-react';
import { useReservoirs } from '@/hooks/useReservoirs';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { FisheriesAssociation } from '@/hooks/useFisheriesAssociations';

const DISTRICTS = [
  'Ampara',
  'Anuradhapura',
  'Badulla',
  'Batticaloa',
  'Colombo',
  'Galle',
  'Gampaha',
  'Hambantota',
  'Jaffna',
  'Kalutara',
  'Kandy',
  'Kegalle',
  'Kilinochchi',
  'Kurunegala',
  'Mannar',
  'Matale',
  'Matara',
  'Moneragala',
  'Mullaitivu',
  'Nuwara Eliya',
  'Polonnaruwa',
  'Puttalam',
  'Ratnapura',
  'Trincomalee',
  'Vavuniya',
];

const formSchema = z.object({
  district: z.string().min(1, 'District is required'),
  reservoir_id: z.string().min(1, 'Reservoir is required'),
  society_name: z.string().min(2, 'Society name must be at least 2 characters'),
  president_name: z.string().optional().or(z.literal('')),
  president_contact: z.string().optional().or(z.literal('')),
  secretary_name: z.string().optional().or(z.literal('')),
  secretary_contact: z.string().optional().or(z.literal('')),
  treasurer_name: z.string().optional().or(z.literal('')),
  treasurer_contact: z.string().optional().or(z.literal('')),
  account_holder_name: z.string().optional().or(z.literal('')),
  account_no: z.string().optional().or(z.literal('')),
  bank_name: z.string().optional().or(z.literal('')),
  branch_name: z.string().optional().or(z.literal('')),
});

type FormData = z.infer<typeof formSchema>;

interface AssociationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  association?: FisheriesAssociation | null;
  onSubmit: (data: FormData) => Promise<void>;
  isLoading: boolean;
}

export function AssociationFormDialog({
  open,
  onOpenChange,
  association,
  onSubmit,
  isLoading,
}: AssociationFormDialogProps) {
  const { data: reservoirs, isLoading: reservoirsLoading } = useReservoirs();

  const reservoirOptions = (reservoirs || []).map((r) => ({
    label: r.name,
    value: r.id,
  }));

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      district: '',
      reservoir_id: '',
      society_name: '',
      president_name: '',
      president_contact: '',
      secretary_name: '',
      secretary_contact: '',
      treasurer_name: '',
      treasurer_contact: '',
      account_holder_name: '',
      account_no: '',
      bank_name: '',
      branch_name: '',
    },
  });

  useEffect(() => {
    if (association) {
      form.reset({
        district: association.district,
        reservoir_id: association.reservoir_id || '',
        society_name: association.society_name,
        president_name: association.president_name || '',
        president_contact: association.president_contact || '',
        secretary_name: association.secretary_name || '',
        secretary_contact: association.secretary_contact || '',
        treasurer_name: association.treasurer_name || '',
        treasurer_contact: association.treasurer_contact || '',
        account_holder_name: association.account_holder_name || '',
        account_no: association.account_no || '',
        bank_name: association.bank_name || '',
        branch_name: association.branch_name || '',
      });
    } else {
      form.reset({
        district: '',
        reservoir_id: '',
        society_name: '',
        president_name: '',
        president_contact: '',
        secretary_name: '',
        secretary_contact: '',
        treasurer_name: '',
        treasurer_contact: '',
        account_holder_name: '',
        account_no: '',
        bank_name: '',
        branch_name: '',
      });
    }
  }, [association, open, form]);

  const handleSubmit = async (data: FormData) => {
    await onSubmit(data);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-display font-bold">
            {association ? <Save className="h-5 w-5 text-primary" /> : <Plus className="h-5 w-5 text-primary" />}
            {association ? 'Edit Fisheries Association' : 'Register Fisheries Association'}
          </DialogTitle>
          <DialogDescription>
            Enter the details of the fisheries society, key officers, and bank account settings.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            
            {/* Section 1: Basic Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b pb-1">
                <Building className="h-4.5 w-4.5 text-primary" />
                <h3 className="font-semibold text-foreground">Basic Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="society_name"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Fisheries Society Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter society name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="district"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>District</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select district" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-56">
                          {DISTRICTS.map((district) => (
                            <SelectItem key={district} value={district}>
                              {district}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reservoir_id"
                  render={({ field }) => (
                    <FormItem className="flex flex-col justify-end">
                      <FormLabel className="mb-2">Associated Reservoir</FormLabel>
                      <FormControl>
                        <SearchableSelect
                          options={reservoirOptions}
                          value={field.value}
                          onValueChange={field.onChange}
                          placeholder={reservoirsLoading ? 'Loading reservoirs...' : 'Select reservoir...'}
                          disabled={reservoirsLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Section 2: Key Officers */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b pb-1">
                <Users className="h-4.5 w-4.5 text-primary" />
                <h3 className="font-semibold text-foreground">Key Officers</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/20 p-4 rounded-xl border border-muted-foreground/10">
                {/* President */}
                <div className="space-y-4 md:col-span-2 border-b border-dashed pb-3 last:border-b-0 last:pb-0">
                  <h4 className="text-sm font-bold text-foreground/80">President Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="president_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">President Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="president_contact"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">President Contact No</FormLabel>
                          <FormControl>
                            <Input placeholder="Contact No" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Secretary */}
                <div className="space-y-4 md:col-span-2 border-b border-dashed pb-3 last:border-b-0 last:pb-0">
                  <h4 className="text-sm font-bold text-foreground/80">Secretary Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="secretary_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Secretary Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="secretary_contact"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Secretary Contact No</FormLabel>
                          <FormControl>
                            <Input placeholder="Contact No" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Treasurer */}
                <div className="space-y-4 md:col-span-2 last:border-b-0 last:pb-0">
                  <h4 className="text-sm font-bold text-foreground/80">Treasurer Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="treasurer_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Treasurer Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="treasurer_contact"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Treasurer Contact No</FormLabel>
                          <FormControl>
                            <Input placeholder="Contact No" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Bank Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b pb-1">
                <CreditCard className="h-4.5 w-4.5 text-primary" />
                <h3 className="font-semibold text-foreground">Bank Account Details</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="account_holder_name"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Account Holder Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Account Holder Name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="account_no"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Account No" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bank_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bank Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Bank Name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="branch_name"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Branch Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Branch Name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {association ? 'Update Details' : 'Register Society'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
