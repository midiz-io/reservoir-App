-- 1. Ice Details ledger table (matching daily ice cubes, boxes, bill amount, payments, running balance, and driver)
CREATE TABLE IF NOT EXISTS public.ice_details (
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
    ON public.ice_details
    FOR SELECT
    TO authenticated
    USING (
        (SELECT role::text FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) IN ('super_admin', 'employee')
    );

DROP POLICY IF EXISTS "Admins and employees can manage ice_details" ON public.ice_details;
CREATE POLICY "Admins and employees can manage ice_details"
    ON public.ice_details
    FOR ALL
    TO authenticated
    USING (
        (SELECT role::text FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) IN ('super_admin', 'employee')
    )
    WITH CHECK (
        (SELECT role::text FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) IN ('super_admin', 'employee')
    );

CREATE INDEX IF NOT EXISTS idx_ice_details_entry_date ON public.ice_details(entry_date ASC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_ice_details_bill_no ON public.ice_details(bill_no);

-- 2. Google Sheet Sync configuration table
CREATE TABLE IF NOT EXISTS public.google_sheet_sync_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key TEXT UNIQUE NOT NULL DEFAULT 'collection_bills',
    sheet_url TEXT NOT NULL DEFAULT '',
    apps_script_url TEXT NOT NULL DEFAULT '',
    auto_sync_enabled BOOLEAN NOT NULL DEFAULT true,
    last_synced_at TIMESTAMPTZ,
    last_synced_count INTEGER DEFAULT 0,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.google_sheet_sync_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view google_sheet_sync_configs" ON public.google_sheet_sync_configs;
CREATE POLICY "Authenticated users can view google_sheet_sync_configs"
    ON public.google_sheet_sync_configs
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Admins and employees can manage google_sheet_sync_configs" ON public.google_sheet_sync_configs;
CREATE POLICY "Admins and employees can manage google_sheet_sync_configs"
    ON public.google_sheet_sync_configs
    FOR ALL
    TO authenticated
    USING (
        (SELECT role::text FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) IN ('super_admin', 'employee')
    )
    WITH CHECK (
        (SELECT role::text FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) IN ('super_admin', 'employee')
    );

-- 3. Updated_at triggers
DROP TRIGGER IF EXISTS update_ice_details_updated_at ON public.ice_details;
CREATE TRIGGER update_ice_details_updated_at
    BEFORE UPDATE ON public.ice_details
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_google_sheet_sync_configs_updated_at ON public.google_sheet_sync_configs;
CREATE TRIGGER update_google_sheet_sync_configs_updated_at
    BEFORE UPDATE ON public.google_sheet_sync_configs
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Audit triggers
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'process_audit_log') THEN
        DROP TRIGGER IF EXISTS audit_ice_details_trigger ON public.ice_details;
        CREATE TRIGGER audit_ice_details_trigger
            AFTER INSERT OR UPDATE OR DELETE ON public.ice_details
            FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();
    END IF;
END;
$$;

-- 5. Enable Realtime
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ice_details;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END;
$$;
