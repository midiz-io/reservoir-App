-- Create fisheries_associations table
CREATE TABLE IF NOT EXISTS public.fisheries_associations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    district TEXT NOT NULL,
    reservoir_id UUID REFERENCES public.reservoirs(id) ON DELETE SET NULL,
    society_name TEXT NOT NULL,
    president_name TEXT,
    president_contact TEXT,
    secretary_name TEXT,
    secretary_contact TEXT,
    treasurer_name TEXT,
    treasurer_contact TEXT,
    account_holder_name TEXT,
    account_no TEXT,
    bank_name TEXT,
    branch_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.fisheries_associations ENABLE ROW LEVEL SECURITY;

-- Policies
-- Super admins can manage fisheries_associations
DROP POLICY IF EXISTS "Super admins can manage fisheries_associations" ON public.fisheries_associations;
CREATE POLICY "Super admins can manage fisheries_associations"
  ON public.fisheries_associations
  FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Other authenticated users can view (needed for dropdowns or queries)
DROP POLICY IF EXISTS "Authenticated users can view fisheries_associations" ON public.fisheries_associations;
CREATE POLICY "Authenticated users can view fisheries_associations"
  ON public.fisheries_associations
  FOR SELECT
  TO authenticated
  USING (true);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_fisheries_associations_updated_at ON public.fisheries_associations;
CREATE TRIGGER update_fisheries_associations_updated_at BEFORE UPDATE ON public.fisheries_associations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add indices for performance
CREATE INDEX IF NOT EXISTS idx_fisheries_associations_reservoir_id ON public.fisheries_associations(reservoir_id);
CREATE INDEX IF NOT EXISTS idx_fisheries_associations_society_name ON public.fisheries_associations(society_name);

-- Add to Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.fisheries_associations;
