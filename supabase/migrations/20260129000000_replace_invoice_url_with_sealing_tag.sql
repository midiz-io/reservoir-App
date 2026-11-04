-- Replace invoice_image_url with sealing_tag_number in association_bills table

-- Add the new sealing_tag_number column as NOT NULL with a default empty string temporarily
ALTER TABLE public.association_bills 
ADD COLUMN IF NOT EXISTS sealing_tag_number TEXT NOT NULL DEFAULT '';

-- Remove the default constraint after adding the column
ALTER TABLE public.association_bills 
ALTER COLUMN sealing_tag_number DROP DEFAULT;

-- Drop the invoice_image_url column
ALTER TABLE public.association_bills 
DROP COLUMN IF EXISTS invoice_image_url;
