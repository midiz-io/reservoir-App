import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';
import { useLocations } from '@/hooks/useLocations';

type Reservoir = Database['public']['Tables']['reservoirs']['Row'];

const formSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  description: z.string().optional(),
  latitude: z.string().trim().min(1, 'Latitude is required'),
  longitude: z.string().trim().min(1, 'Longitude is required'),
  geofence_radius: z.string().trim().min(1, 'Geofence radius is required'),
  capacity: z.string().optional(),
  location_id: z.string().optional(),
  status: z.enum(['active', 'maintenance', 'inactive']),
});

interface ReservoirFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservoir: Reservoir | null;
  onSubmit: (data: any) => Promise<void>;
  isLoading?: boolean;
}

export function ReservoirFormDialog({
  open,
  onOpenChange,
  reservoir,
  onSubmit,
  isLoading,
}: ReservoirFormDialogProps) {
  const { data: locations } = useLocations();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      latitude: '',
      longitude: '',
      geofence_radius: '100',
      capacity: '',
      location_id: '',
      status: 'active',
    },
  });

  useEffect(() => {
    if (reservoir) {
      form.reset({
        name: reservoir.name,
        description: reservoir.description || '',
        latitude: reservoir.latitude.toString(),
        longitude: reservoir.longitude.toString(),
        geofence_radius: reservoir.geofence_radius.toString(),
        capacity: reservoir.capacity?.toString() || '',
        location_id: reservoir.location_id || '',
        status: reservoir.status,
      });
    } else {
      form.reset({
        name: '',
        description: '',
        latitude: '',
        longitude: '',
        geofence_radius: '100',
        capacity: '',
        location_id: '',
        status: 'active',
      });
    }
  }, [reservoir, form, open]);

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    await onSubmit({
      name: values.name,
      description: values.description || null,
      latitude: parseFloat(values.latitude),
      longitude: parseFloat(values.longitude),
      geofence_radius: parseInt(values.geofence_radius),
      capacity: values.capacity ? parseInt(values.capacity) : null,
      location_id: values.location_id || null,
      status: values.status,
    });
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{reservoir ? 'Edit Reservoir' : 'Add Reservoir'}</DialogTitle>
          <DialogDescription>
            {reservoir ? 'Update reservoir details' : 'Create a new reservoir with geofence settings'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="latitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latitude</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="longitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Longitude</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="geofence_radius"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Geofence Radius (m)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacity (L)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="location_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a location" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {locations?.map(location => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
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
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {reservoir ? 'Update' : 'Create'} Reservoir
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
