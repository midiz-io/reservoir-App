import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
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
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, UserPlus, Save, Eye, EyeOff } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';
import { useLocations } from '@/hooks/useLocations';
import { Checkbox } from '@/components/ui/checkbox';

type Employee = Database['public']['Tables']['employees']['Row'];

const createFormSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
  status: z.enum(['active', 'inactive']),
  role: z.enum(['employee', 'fisheries_association']),
  assigned_locations: z.array(z.string()).optional(),
});

const updateFormSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
  phone: z.string().optional(),
  status: z.enum(['active', 'inactive']),
  role: z.enum(['employee', 'fisheries_association']),
  assigned_locations: z.array(z.string()).optional(),
});

type FormData = z.infer<typeof createFormSchema>;

interface EmployeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: Employee | null;
  onSubmit: (data: FormData) => Promise<void>;
  isLoading: boolean;
}

export function EmployeeFormDialog({
  open,
  onOpenChange,
  employee,
  onSubmit,
  isLoading,
}: EmployeeFormDialogProps) {
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(employee ? updateFormSchema : createFormSchema),
    defaultValues: {
      full_name: '',
      email: '',
      password: '',
      phone: '',
      status: 'active',
      role: 'employee',
      assigned_locations: [],
    },
  });

  const { data: locations } = useLocations();
  const selectedLocations = form.watch('assigned_locations') || [];

  useEffect(() => {
    if (employee) {
      form.reset({
        full_name: employee.full_name,
        email: employee.email,
        password: '',
        phone: employee.phone || '',
        status: employee.status as 'active' | 'inactive',
        role: 'employee', // Default to employee, we'll fetch the real role in parent if needed
        assigned_locations: employee.assigned_locations || [],
      });
    } else {
      form.reset({
        full_name: '',
        email: '',
        password: '',
        phone: '',
        status: 'active',
        role: 'employee',
        assigned_locations: [],
      });
    }
  }, [employee, form]);

  const handleSubmit = async (data: FormData) => {
    const normalizedData = {
      ...data,
      email: data.email.trim().toLowerCase(),
      password: data.password?.trim() || '',
      user_id: employee?.user_id || crypto.randomUUID(),
    };

    // Validate password for new employees
    if (!employee && (!normalizedData.password || normalizedData.password.length < 6)) {
      form.setError('password', { message: 'Password is required and must be at least 6 characters' });
      return;
    }

    await onSubmit(normalizedData);
    form.reset();
  };

  const toggleLocation = (id: string) => {
    const current = form.getValues('assigned_locations') || [];
    const next = current.includes(id)
      ? current.filter(r => r !== id)
      : [...current, id];
    form.setValue('assigned_locations', next, { shouldValidate: true });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {employee ? <Save className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
            {employee ? 'Edit Employee' : 'Add Employee'}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="john@example.com"
                      {...field}
                      onChange={(e) => {
                        const value = e.target.value.trim().toLowerCase();
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="+94 77 123 4567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>User Role</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="employee">Employee / Field Officer</SelectItem>
                      <SelectItem value="fisheries_association">Fisheries Association</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password {employee ? '(leave blank to keep current)' : '(required)'}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        type={showPassword ? "text" : "password"} 
                        placeholder={employee ? "Leave blank to keep current password" : "Enter password"} 
                        {...field} 
                        value={field.value || ''} 
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
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
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Assigned Locations */}
            <div className="space-y-2">
              <FormLabel>Assigned Locations (Centers)</FormLabel>
              <div className="border rounded-lg p-3 max-h-32 overflow-y-auto space-y-2">
                {locations?.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No locations available</p>
                ) : (
                  locations?.map((location) => (
                    <div key={location.id} className="flex items-center gap-2">
                      <Checkbox
                        id={location.id}
                        checked={selectedLocations.includes(location.id)}
                        onCheckedChange={() => toggleLocation(location.id)}
                      />
                      <label
                        htmlFor={location.id}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {location.name}
                      </label>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
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
                {employee ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
