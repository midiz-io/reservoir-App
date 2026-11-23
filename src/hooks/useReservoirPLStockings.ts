import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

export type ReservoirPLStocking = Database['public']['Tables']['reservoir_pl_stockings']['Row'] & {
  reservoirs?: { name: string; location_id: string | null } | null;
};
export type ReservoirPLStockingInsert = Database['public']['Tables']['reservoir_pl_stockings']['Insert'];
export type ReservoirPLStockingUpdate = Database['public']['Tables']['reservoir_pl_stockings']['Update'];

const db = supabase as any;

export function useReservoirPLStockings() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`reservoir-pl-stockings-changes-${Math.random().toString(36).slice(2, 10)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservoir_pl_stockings' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['reservoir_pl_stockings'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['reservoir_pl_stockings'],
    queryFn: async (): Promise<ReservoirPLStocking[]> => {
      const { data, error } = await db
        .from('reservoir_pl_stockings')
        .select('*, reservoirs(name, location_id)')
        .order('stocked_date', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as ReservoirPLStocking[];
    },
  });
}

export function useCreateReservoirPLStocking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entry: ReservoirPLStockingInsert) => {
      const { data, error } = await db
        .from('reservoir_pl_stockings')
        .insert(entry)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservoir_pl_stockings'] });
    },
  });
}

export function useUpdateReservoirPLStocking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ReservoirPLStockingUpdate & { id: string }) => {
      const { data, error } = await db
        .from('reservoir_pl_stockings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservoir_pl_stockings'] });
    },
  });
}

export function useDeleteReservoirPLStocking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db
        .from('reservoir_pl_stockings')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservoir_pl_stockings'] });
    },
  });
}
