import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FisheriesAssociation {
  id: string;
  district: string;
  reservoir_id: string | null;
  society_name: string;
  president_name: string | null;
  president_contact: string | null;
  secretary_name: string | null;
  secretary_contact: string | null;
  treasurer_name: string | null;
  treasurer_contact: string | null;
  account_holder_name: string | null;
  account_no: string | null;
  bank_name: string | null;
  branch_name: string | null;
  created_at: string;
  updated_at: string;
}

export type FisheriesAssociationWithReservoir = FisheriesAssociation & {
  reservoirs: {
    name: string;
  } | null;
};

// Helper to bypass strict typing
const db = supabase as any;

export function useFisheriesAssociations() {
  return useQuery({
    queryKey: ['fisheries_associations'],
    queryFn: async (): Promise<FisheriesAssociationWithReservoir[]> => {
      const { data, error } = await db
        .from('fisheries_associations')
        .select('*, reservoirs(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as FisheriesAssociationWithReservoir[];
    },
  });
}

export function useFisheriesAssociation(id: string) {
  return useQuery({
    queryKey: ['fisheries_associations', id],
    queryFn: async (): Promise<FisheriesAssociationWithReservoir> => {
      const { data, error } = await db
        .from('fisheries_associations')
        .select('*, reservoirs(name)')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as FisheriesAssociationWithReservoir;
    },
    enabled: !!id,
  });
}

export function useCreateFisheriesAssociation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (association: Omit<FisheriesAssociation, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await db
        .from('fisheries_associations')
        .insert(association)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fisheries_associations'] });
    },
  });
}

export function useUpdateFisheriesAssociation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FisheriesAssociation> & { id: string }) => {
      const { data, error } = await db
        .from('fisheries_associations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fisheries_associations'] });
    },
  });
}

export function useDeleteFisheriesAssociation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db
        .from('fisheries_associations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fisheries_associations'] });
    },
  });
}
