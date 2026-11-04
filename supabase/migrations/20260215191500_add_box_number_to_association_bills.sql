-- Add box_number column to association_bills
ALTER TABLE public.association_bills
  ADD COLUMN IF NOT EXISTS box_number TEXT;
