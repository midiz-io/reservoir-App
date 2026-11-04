-- Add reservoir_id to suppliers table
ALTER TABLE public.suppliers 
ADD COLUMN IF NOT EXISTS reservoir_id UUID NOT NULL REFERENCES public.reservoirs(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_suppliers_reservoir_id ON public.suppliers(reservoir_id);
