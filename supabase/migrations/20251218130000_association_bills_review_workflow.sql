-- Add review/approval workflow for association bills

-- 1) Add columns (idempotent)
ALTER TABLE public.association_bills
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 2) Constrain status values (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'association_bills_status_check'
  ) THEN
    ALTER TABLE public.association_bills
      ADD CONSTRAINT association_bills_status_check
      CHECK (status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

-- 3) Index for inbox queries
CREATE INDEX IF NOT EXISTS idx_association_bills_status_created_at
  ON public.association_bills(status, created_at DESC);

-- 4) RLS: allow super admins to review (update) bills
DROP POLICY IF EXISTS "Super admins can review association bills" ON public.association_bills;
CREATE POLICY "Super admins can review association bills"
  ON public.association_bills
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));


