-- 1. Reservoir PL Stockings table (for Reservoir Breakdown: PL Stocked, Collection Qty, Outstanding)
CREATE TABLE IF NOT EXISTS public.reservoir_pl_stockings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservoir_id UUID NOT NULL REFERENCES public.reservoirs(id) ON DELETE CASCADE,
    stocked_date DATE NOT NULL,
    pl_quantity NUMERIC NOT NULL CHECK (pl_quantity >= 0),
    batch_reference TEXT,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reservoir_pl_stockings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view reservoir_pl_stockings" ON public.reservoir_pl_stockings;
CREATE POLICY "Authenticated users can view reservoir_pl_stockings"
    ON public.reservoir_pl_stockings
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Admins and employees can manage reservoir_pl_stockings" ON public.reservoir_pl_stockings;
CREATE POLICY "Admins and employees can manage reservoir_pl_stockings"
    ON public.reservoir_pl_stockings
    FOR ALL
    TO authenticated
    USING (
        (SELECT role::text FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) IN ('super_admin', 'employee')
    )
    WITH CHECK (
        (SELECT role::text FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) IN ('super_admin', 'employee')
    );

CREATE INDEX IF NOT EXISTS idx_reservoir_pl_stockings_reservoir_id ON public.reservoir_pl_stockings(reservoir_id);
CREATE INDEX IF NOT EXISTS idx_reservoir_pl_stockings_stocked_date ON public.reservoir_pl_stockings(stocked_date DESC);

-- 2. Tag Dispatches table (for tracking sent tag number ranges and sent dates)
CREATE TABLE IF NOT EXISTS public.tag_dispatches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prefix TEXT NOT NULL DEFAULT '',
    start_number INTEGER NOT NULL,
    end_number INTEGER NOT NULL,
    pad_length INTEGER NOT NULL DEFAULT 0,
    sent_date DATE NOT NULL,
    reservoir_id UUID REFERENCES public.reservoirs(id) ON DELETE SET NULL,
    location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
    field_officer_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT tag_dispatches_valid_range CHECK (end_number >= start_number)
);

ALTER TABLE public.tag_dispatches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view tag_dispatches" ON public.tag_dispatches;
CREATE POLICY "Authenticated users can view tag_dispatches"
    ON public.tag_dispatches
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Admins and employees can manage tag_dispatches" ON public.tag_dispatches;
CREATE POLICY "Admins and employees can manage tag_dispatches"
    ON public.tag_dispatches
    FOR ALL
    TO authenticated
    USING (
        (SELECT role::text FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) IN ('super_admin', 'employee')
    )
    WITH CHECK (
        (SELECT role::text FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) IN ('super_admin', 'employee')
    );

CREATE INDEX IF NOT EXISTS idx_tag_dispatches_sent_date ON public.tag_dispatches(sent_date DESC);
CREATE INDEX IF NOT EXISTS idx_tag_dispatches_reservoir_id ON public.tag_dispatches(reservoir_id);

-- 3. Updated_at triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_reservoir_pl_stockings_updated_at ON public.reservoir_pl_stockings;
CREATE TRIGGER update_reservoir_pl_stockings_updated_at
    BEFORE UPDATE ON public.reservoir_pl_stockings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_tag_dispatches_updated_at ON public.tag_dispatches;
CREATE TRIGGER update_tag_dispatches_updated_at
    BEFORE UPDATE ON public.tag_dispatches
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Audit triggers (if process_audit_log exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'process_audit_log') THEN
        DROP TRIGGER IF EXISTS audit_reservoir_pl_stockings_trigger ON public.reservoir_pl_stockings;
        CREATE TRIGGER audit_reservoir_pl_stockings_trigger
            AFTER INSERT OR UPDATE OR DELETE ON public.reservoir_pl_stockings
            FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

        DROP TRIGGER IF EXISTS audit_tag_dispatches_trigger ON public.tag_dispatches;
        CREATE TRIGGER audit_tag_dispatches_trigger
            AFTER INSERT OR UPDATE OR DELETE ON public.tag_dispatches
            FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();
    END IF;
END;
$$;

-- 5. Enable Realtime (safely ignore if already added)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reservoir_pl_stockings;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END;
$$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tag_dispatches;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END;
$$;
