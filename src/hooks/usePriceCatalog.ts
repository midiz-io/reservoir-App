import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

export type PriceCatalogItem = Database['public']['Tables']['price_catalog']['Row'];
export type PriceCatalogInsert = Database['public']['Tables']['price_catalog']['Insert'];
export type PriceCatalogUpdate = Database['public']['Tables']['price_catalog']['Update'];

// Helper to bypass strict typing for dynamic queries if needed
const db = supabase as any;

export function usePriceCatalog() {
    return useQuery({
        queryKey: ['price_catalog'],
        queryFn: async (): Promise<PriceCatalogItem[]> => {
            const { data, error } = await db
                .from('price_catalog')
                .select('*, reservoirs(name)')
                .order('item_description', { ascending: true });

            if (error) throw error;
            return (data || []) as PriceCatalogItem[];
        },
    });
}

export function useCreatePriceCatalogItems() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (items: PriceCatalogInsert[]) => {
            const { data, error } = await db
                .from('price_catalog')
                .insert(items)
                .select();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['price_catalog'] });
        },
    });
}

export function useCreatePriceCatalogItem() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (item: PriceCatalogInsert) => {
            const { data, error } = await db
                .from('price_catalog')
                .insert(item)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['price_catalog'] });
        },
    });
}

export function useUpdatePriceCatalogItem() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...updates }: PriceCatalogUpdate & { id: string }) => {
            const { data, error } = await db
                .from('price_catalog')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['price_catalog'] });
        },
    });
}

export function useDeletePriceCatalogItem() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await db
                .from('price_catalog')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['price_catalog'] });
        },
    });
}
