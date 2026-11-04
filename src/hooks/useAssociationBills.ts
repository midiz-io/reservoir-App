import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database, Json } from '@/integrations/supabase/types';
import { sendWhatsAppNotification } from '@/lib/whatsapp';

type AssociationBill = Database['public']['Tables']['association_bills']['Row'];
type AssociationBillInsert = Database['public']['Tables']['association_bills']['Insert'];
type AssociationBillUpdate = Database['public']['Tables']['association_bills']['Update'];

// Helper to bypass strict typing
const db = supabase as any;

export function useAssociationBills() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Set up Realtime WebSockets to instantly refresh data
    const channel = supabase
      .channel('association-bills-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'association_bills' },
        (payload) => {
          console.log('Real-time database change received:', payload);
          queryClient.invalidateQueries({ queryKey: ['association_bills'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['association_bills'],
    queryFn: async (): Promise<AssociationBill[]> => {
      const { data, error } = await db
        .from('association_bills')
        .select('*, employees(full_name, email), reservoirs(name)')
        .order('created_at', { ascending: false })
        .limit(5000);
      if (error) throw error;
      return (data || []) as AssociationBill[];
    },
    // Removed refetchInterval - we now use instant real-time websockets instead of polling
  });
}

export function useCreateAssociationBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bill: AssociationBillInsert) => {
      const { data, error } = await db
        .from('association_bills')
        .insert(bill)
        .select()
        .single();
      if (error) throw error;
      return data as AssociationBill;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['association_bills'] });
      // Condition 1: New availability/bill submitted (Goes to the Approving Officer)
      // Hardcoded or dynamically fetched phone number can be used
      sendWhatsAppNotification(
        '+94712345678', // Replace with the actual Center Manager/Approving Officer phone
        `🔴 [NEW BILL] A new bill (#${data.bill_no}) has been submitted for Reservoir ${data.reservoir_id}. Please review.`
      );
    },
  });
}

export function useReviewAssociationBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      rejection_reason,
      reviewed_by,
      reviewed_at,
      box_number,
      sealing_tag_number,
      remarks,
    }: {
      id: string;
      status: 'approved' | 'rejected' | 'pending';
      rejection_reason?: string | null;
      reviewed_by?: string | null;
      reviewed_at?: string | null;
      box_number?: string | null;
      sealing_tag_number?: string | null;
      remarks?: string | null;
    }) => {
      const updates: AssociationBillUpdate = {
        status,
        rejection_reason: status === 'rejected' ? (rejection_reason || 'Rejected') : null,
        reviewed_by: status === 'pending' ? null : reviewed_by,
        reviewed_at: status === 'pending' ? null : reviewed_at,
        box_number: box_number || undefined,
        sealing_tag_number: sealing_tag_number || undefined,
        remarks: remarks || null,
      };

      const { data, error } = await db
        .from('association_bills')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as AssociationBill;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['association_bills'] });
      // Condition 2: Approved or rejected (Goes to the association that submitted it)
      const statusText = variables.status === 'approved' ? '✅ APPROVED' : '❌ REJECTED';
      sendWhatsAppNotification(
        '+94712345678', // Replace with the Association/Submitter phone
        `[BILL UPDATE] Your bill (#${data.bill_no}) has been ${statusText} by the Center Manager.`
      );
    },
  });
}

export function useUpdateAssociationBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & AssociationBillUpdate) => {
      const { data, error } = await db
        .from('association_bills')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as AssociationBill;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['association_bills'] });
    },
  });
}

export function useBatchUpdateBoxAndTagNumbers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      billIds,
      box_number,
      sealing_tag_number,
      approveStatus,
      reviewed_by,
      updateBoxTag = false,
    }: {
      billIds: string[];
      box_number?: string;
      sealing_tag_number?: string;
      approveStatus?: boolean;
      reviewed_by?: string | null;
      updateBoxTag?: boolean;
    }) => {
      const updatePayload: AssociationBillUpdate = {};

      if (updateBoxTag || box_number !== undefined) {
        updatePayload.box_number = box_number || null;
      }
      if (updateBoxTag || sealing_tag_number !== undefined) {
        updatePayload.sealing_tag_number = sealing_tag_number || '';
      }

      if (approveStatus) {
        updatePayload.status = 'approved';
        if (reviewed_by) updatePayload.reviewed_by = reviewed_by;
        updatePayload.reviewed_at = new Date().toISOString();
      }

      const { data, error } = await db
        .from('association_bills')
        .update(updatePayload)
        .in('id', billIds)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['association_bills'] });
    },
  });
}

export function useSuperAdminProximityToReservoir(reservoirId: string | null) {
  return useQuery({
    queryKey: ['super_admin_proximity_to_reservoir', reservoirId],
    enabled: !!reservoirId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('super_admin_proximity_to_reservoir', {
        _reservoir_id: reservoirId as string,
      });
      if (error) throw error;
      return (data?.[0] as any || null) as {
        is_within: boolean;
        distance_m: number | null;
        last_seen: string | null;
      } | null;
    },
  });
}


