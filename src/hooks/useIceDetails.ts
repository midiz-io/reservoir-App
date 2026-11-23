import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

export type IceDetail = Database['public']['Tables']['ice_details']['Row'] & {
  locations?: { name: string } | null;
};
export type IceDetailInsert = Database['public']['Tables']['ice_details']['Insert'];
export type IceDetailUpdate = Database['public']['Tables']['ice_details']['Update'];

const db = supabase as any;
const LOCAL_ICE_STORAGE_KEY = 'reservoir_watch_ice_details_v1';
const FALLBACK_MODE_QUERY_KEY = ['ice_details_fallback_mode'];

export const ICE_DETAILS_SETUP_SQL = `CREATE TABLE IF NOT EXISTS public.ice_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_date DATE NOT NULL,
    boxes INTEGER NOT NULL DEFAULT 0 CHECK (boxes >= 0),
    ice_cubes NUMERIC NOT NULL DEFAULT 0 CHECK (ice_cubes >= 0),
    unit_rate NUMERIC NOT NULL DEFAULT 570 CHECK (unit_rate >= 0),
    bill_no TEXT NOT NULL DEFAULT '',
    bill_amount NUMERIC NOT NULL DEFAULT 0 CHECK (bill_amount >= 0),
    payment_ref TEXT,
    paid_amount NUMERIC NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
    paid_date DATE,
    driver_name TEXT,
    location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ice_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins and employees can view ice_details" ON public.ice_details;
CREATE POLICY "Admins and employees can view ice_details"
    ON public.ice_details FOR SELECT TO authenticated
    USING ((SELECT role::text FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) IN ('super_admin', 'employee'));

DROP POLICY IF EXISTS "Admins and employees can manage ice_details" ON public.ice_details;
CREATE POLICY "Admins and employees can manage ice_details"
    ON public.ice_details FOR ALL TO authenticated
    USING ((SELECT role::text FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) IN ('super_admin', 'employee'))
    WITH CHECK ((SELECT role::text FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) IN ('super_admin', 'employee'));

CREATE INDEX IF NOT EXISTS idx_ice_details_entry_date ON public.ice_details(entry_date ASC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_ice_details_bill_no ON public.ice_details(bill_no);
NOTIFY pgrst, 'reload schema';`;

export function isMissingTableError(error: any): boolean {
  if (!error) return false;
  const msg = String(error.message || '').toLowerCase();
  const code = String(error.code || '');
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    msg.includes('schema cache') ||
    msg.includes('could not find the table') ||
    msg.includes('does not exist')
  );
}

function readLocalIceDetails(): IceDetail[] {
  try {
    const raw = localStorage.getItem(LOCAL_ICE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.sort((a: IceDetail, b: IceDetail) => {
      const dateCmp = (a.entry_date || '').localeCompare(b.entry_date || '');
      if (dateCmp !== 0) return dateCmp;
      return (a.created_at || '').localeCompare(b.created_at || '');
    });
  } catch {
    return [];
  }
}

function writeLocalIceDetails(rows: IceDetail[]) {
  try {
    localStorage.setItem(LOCAL_ICE_STORAGE_KEY, JSON.stringify(rows));
  } catch {
    // ignore storage errors
  }
}

export function useIceDetailsFallbackMode() {
  return useQuery({
    queryKey: FALLBACK_MODE_QUERY_KEY,
    queryFn: () => false,
    initialData: false,
    staleTime: Infinity,
  });
}

export function useIceDetails() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`ice-details-changes-${Math.random().toString(36).slice(2, 10)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ice_details' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['ice_details'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['ice_details'],
    queryFn: async (): Promise<IceDetail[]> => {
      const { data, error } = await db
        .from('ice_details')
        .select('*, locations(name)')
        .order('entry_date', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) {
        if (isMissingTableError(error)) {
          queryClient.setQueryData(FALLBACK_MODE_QUERY_KEY, true);
          return readLocalIceDetails();
        }
        throw error;
      }

      queryClient.setQueryData(FALLBACK_MODE_QUERY_KEY, false);
      return (data || []) as IceDetail[];
    },
  });
}

export function useCreateIceDetail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entry: IceDetailInsert) => {
      const { data, error } = await db
        .from('ice_details')
        .insert(entry)
        .select()
        .single();

      if (error) {
        if (isMissingTableError(error)) {
          queryClient.setQueryData(FALLBACK_MODE_QUERY_KEY, true);
          const now = new Date().toISOString();
          const localItem: IceDetail = {
            id: crypto.randomUUID ? crypto.randomUUID() : `ice_${Date.now()}`,
            entry_date: entry.entry_date,
            boxes: entry.boxes ?? 0,
            ice_cubes: entry.ice_cubes ?? 0,
            unit_rate: entry.unit_rate ?? 570,
            bill_no: entry.bill_no ?? '',
            bill_amount: entry.bill_amount ?? 0,
            payment_ref: entry.payment_ref ?? null,
            paid_amount: entry.paid_amount ?? 0,
            paid_date: entry.paid_date ?? null,
            driver_name: entry.driver_name ?? null,
            location_id: entry.location_id ?? null,
            notes: entry.notes ?? null,
            created_by: entry.created_by ?? null,
            created_at: now,
            updated_at: now,
            locations: null,
          };
          const current = readLocalIceDetails();
          writeLocalIceDetails([...current, localItem]);
          return localItem;
        }
        throw error;
      }

      queryClient.setQueryData(FALLBACK_MODE_QUERY_KEY, false);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ice_details'] });
    },
  });
}

export function useUpdateIceDetail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: IceDetailUpdate & { id: string }) => {
      const { data, error } = await db
        .from('ice_details')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (isMissingTableError(error)) {
          queryClient.setQueryData(FALLBACK_MODE_QUERY_KEY, true);
          const current = readLocalIceDetails();
          const now = new Date().toISOString();
          let updatedRow: IceDetail | null = null;
          const next = current.map((row) => {
            if (row.id !== id) return row;
            updatedRow = { ...row, ...updates, updated_at: now };
            return updatedRow;
          });
          writeLocalIceDetails(next);
          return updatedRow;
        }
        throw error;
      }

      queryClient.setQueryData(FALLBACK_MODE_QUERY_KEY, false);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ice_details'] });
    },
  });
}

export function useDeleteIceDetail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db
        .from('ice_details')
        .delete()
        .eq('id', id);

      if (error) {
        if (isMissingTableError(error)) {
          queryClient.setQueryData(FALLBACK_MODE_QUERY_KEY, true);
          const current = readLocalIceDetails();
          writeLocalIceDetails(current.filter((row) => row.id !== id));
          return;
        }
        throw error;
      }

      queryClient.setQueryData(FALLBACK_MODE_QUERY_KEY, false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ice_details'] });
    },
  });
}
