import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type Employee = Database['public']['Tables']['employees']['Row'];
type EmployeeInsert = Database['public']['Tables']['employees']['Insert'];
type EmployeeUpdate = Database['public']['Tables']['employees']['Update'];

// Helper to bypass strict typing
const db = supabase as any;

export type EmployeeWithRole = Employee & { role?: string };

export function useEmployees() {
  return useQuery({
    queryKey: ['employees'],
    queryFn: async (): Promise<EmployeeWithRole[]> => {
      console.log('Fetching employees and roles...');
      const [employeesRes, rolesRes] = await Promise.all([
        db.from('employees').select('*').order('created_at', { ascending: false }),
        db.from('user_roles').select('user_id, role')
      ]);

      console.log('Raw employees data:', employeesRes.data);
      console.log('Raw roles data:', rolesRes.data);

      if (employeesRes.error) {
        console.error('Error fetching employees:', employeesRes.error);
        throw employeesRes.error;
      }
      if (rolesRes.error) {
        console.error('Error fetching roles:', rolesRes.error);
        throw rolesRes.error;
      }

      const rolesMap = (rolesRes.data || []).reduce((acc: any, curr: any) => {
        acc[curr.user_id] = curr.role;
        return acc;
      }, {});

      return (employeesRes.data || []).map((emp: Employee) => ({
        ...emp,
        role: rolesMap[emp.user_id] || 'employee'
      }));
    },
  });
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: ['employees', id],
    queryFn: async (): Promise<Employee | null> => {
      const { data, error } = await db
        .from('employees')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Employee;
    },
    enabled: !!id,
  });
}

export function useCurrentEmployee() {
  return useQuery({
    queryKey: ['current_employee'],
    queryFn: async (): Promise<Employee | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await db
        .from('employees')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as Employee | null;
    },
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (employee: EmployeeInsert) => {
      const { data, error } = await db
        .from('employees')
        .insert(employee)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: EmployeeUpdate & { id: string }) => {
      const { data, error } = await db
        .from('employees')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // First, get the employee to find their user_id
      const { data: employee, error: fetchError } = await db
        .from('employees')
        .select('user_id')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Delete the employee record from the database first
      const { error: deleteError } = await db
        .from('employees')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      // Also delete the associated auth user if user_id exists
      if (employee?.user_id) {
        try {
          const { error: functionError } = await supabase.functions.invoke('delete-employee-user', {
            body: {
              userId: employee.user_id,
            },
          });

          if (functionError) {
            console.warn('Failed to delete auth user via edge function:', functionError);
          }
        } catch (error) {
          console.warn('Edge function not available for user deletion:', error);
        }
      }

      return { employeeId: id, userId: employee?.user_id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}
