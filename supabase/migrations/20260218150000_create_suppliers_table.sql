-- Create suppliers table
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collector_name TEXT NOT NULL,
    collector_phone TEXT NOT NULL,
    association_name TEXT NOT NULL,
    association_address TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Policies
-- Super admins can do everything
CREATE POLICY "Super admins can manage suppliers"
  ON public.suppliers
  FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Other authenticated users can view (if needed for bill entry dropdown)
CREATE POLICY "Authenticated users can view suppliers"
  ON public.suppliers
  FOR SELECT
  TO authenticated
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for search
CREATE INDEX idx_suppliers_collector_name ON public.suppliers(collector_name);
CREATE INDEX idx_suppliers_association_name ON public.suppliers(association_name);
