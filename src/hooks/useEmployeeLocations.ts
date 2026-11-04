import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { useEffect } from 'react';

type EmployeeLocation = Database['public']['Tables']['employee_locations']['Row'];

export type EmployeeLocationWithEmployee = EmployeeLocation & {
  employees: {
    full_name: string;
    email: string;
    status: string;
  } | null;
};

// Helper to bypass strict typing
const db = supabase as any;

export function useEmployeeLocations() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('employee_locations_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'employee_locations',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['employee_locations'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['employee_locations'],
    queryFn: async (): Promise<EmployeeLocationWithEmployee[]> => {
      const { data, error } = await db
        .from('employee_locations')
        .select('*, employees(full_name, email, status)')
        .order('timestamp', { ascending: false });
      
      if (error) throw error;
      
      // Get latest location per employee
      const latestByEmployee = new Map<string, EmployeeLocationWithEmployee>();
      (data || []).forEach((loc: any) => {
        if (!latestByEmployee.has(loc.employee_id)) {
          latestByEmployee.set(loc.employee_id, loc as EmployeeLocationWithEmployee);
        }
      });
      
      return Array.from(latestByEmployee.values());
    },
  });
}

export function useEmployeeLocationHistory(employeeId: string) {
  return useQuery({
    queryKey: ['employee_locations', employeeId],
    queryFn: async (): Promise<EmployeeLocation[]> => {
      const { data, error } = await db
        .from('employee_locations')
        .select('*')
        .eq('employee_id', employeeId)
        .order('timestamp', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return (data || []) as EmployeeLocation[];
    },
    enabled: !!employeeId,
  });
}
