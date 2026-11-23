import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

export type TagDispatch = Database['public']['Tables']['tag_dispatches']['Row'] & {
  reservoirs?: { name: string } | null;
  locations?: { name: string } | null;
  employees?: { full_name: string } | null;
};
export type TagDispatchInsert = Database['public']['Tables']['tag_dispatches']['Insert'];
export type TagDispatchUpdate = Database['public']['Tables']['tag_dispatches']['Update'];

const db = supabase as any;

export function useTagDispatches() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`tag-dispatches-changes-${Math.random().toString(36).slice(2, 10)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tag_dispatches' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['tag_dispatches'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['tag_dispatches'],
    queryFn: async (): Promise<TagDispatch[]> => {
      const { data, error } = await db
        .from('tag_dispatches')
        .select('*, reservoirs(name), locations(name), employees(full_name)')
        .order('sent_date', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as TagDispatch[];
    },
  });
}

export function useCreateTagDispatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dispatch: TagDispatchInsert) => {
      const { data, error } = await db
        .from('tag_dispatches')
        .insert(dispatch)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tag_dispatches'] });
    },
  });
}

export function useUpdateTagDispatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: TagDispatchUpdate & { id: string }) => {
      const { data, error } = await db
        .from('tag_dispatches')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tag_dispatches'] });
    },
  });
}

export function useDeleteTagDispatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db
        .from('tag_dispatches')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tag_dispatches'] });
    },
  });
}
