import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { useEffect } from 'react';

type DataEntry = Database['public']['Tables']['data_entries']['Row'];
type DataEntryInsert = Database['public']['Tables']['data_entries']['Insert'];
type DataEntryUpdate = Database['public']['Tables']['data_entries']['Update'];

export type DataEntryWithRelations = DataEntry & {
  reservoirs?: { name: string } | null;
  employees?: { full_name: string } | null;
};

// Helper to bypass strict typing
const db = supabase as any;

export function useDataEntries() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`data_entries_changes-${Math.random().toString(36).slice(2, 10)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'data_entries',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['data_entries'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['data_entries'],
    queryFn: async (): Promise<DataEntryWithRelations[]> => {
      const { data, error } = await db
        .from('data_entries')
        .select('*, reservoirs(name), employees(full_name)')
        .order('recorded_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return (data || []) as DataEntryWithRelations[];
    },
  });
}

export function useCreateDataEntry() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (entry: DataEntryInsert) => {
      const { data, error } = await db
        .from('data_entries')
        .insert(entry)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data_entries'] });
    },
  });
}

export function useUpdateDataEntry() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: DataEntryUpdate & { id: string }) => {
      const { data, error } = await db
        .from('data_entries')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data_entries'] });
    },
  });
}

export function useDeleteDataEntry() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db
        .from('data_entries')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data_entries'] });
    },
  });
}
