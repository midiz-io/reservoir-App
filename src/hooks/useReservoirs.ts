import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type Reservoir = Database['public']['Tables']['reservoirs']['Row'];
type Location = Database['public']['Tables']['locations']['Row'];
type ReservoirInsert = Database['public']['Tables']['reservoirs']['Insert'];
type ReservoirUpdate = Database['public']['Tables']['reservoirs']['Update'];

export type ReservoirWithLocation = Reservoir & {
  locations: Location | null;
};

// Helper to bypass strict typing
const db = supabase as any;

export function useReservoirs() {
  return useQuery({
    queryKey: ['reservoirs'],
    queryFn: async (): Promise<ReservoirWithLocation[]> => {
      const { data, error } = await db
        .from('reservoirs')
        .select('*, locations(*)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as ReservoirWithLocation[];
    },
  });
}

export function useReservoir(id: string) {
  return useQuery({
    queryKey: ['reservoirs', id],
    queryFn: async () => {
      const { data, error } = await db
        .from('reservoirs')
        .select('*, locations(*)')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateReservoir() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (reservoir: ReservoirInsert) => {
      const { data, error } = await db
        .from('reservoirs')
        .insert(reservoir)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservoirs'] });
    },
  });
}

export function useUpdateReservoir() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: ReservoirUpdate & { id: string }) => {
      const { data, error } = await db
        .from('reservoirs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservoirs'] });
    },
  });
}

export function useDeleteReservoir() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db
        .from('reservoirs')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservoirs'] });
    },
  });
}
