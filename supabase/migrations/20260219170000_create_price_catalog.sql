-- Create price_catalog table
CREATE TABLE IF NOT EXISTS public.price_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_description TEXT NOT NULL,
    unit_price NUMERIC NOT NULL DEFAULT 0,
    category TEXT,
    reservoir_id UUID REFERENCES public.reservoirs(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.price_catalog ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Price catalog is viewable by everyone" 
ON public.price_catalog FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Price catalog is manageable by super admins" 
ON public.price_catalog FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_price_catalog_updated_at
BEFORE UPDATE ON public.price_catalog
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_price_catalog_item_description ON public.price_catalog(item_description);
CREATE INDEX IF NOT EXISTS idx_price_catalog_reservoir_id ON public.price_catalog(reservoir_id);
