-- Fix for RLS policy on association_bills causing INSERT failures.
-- The previous policy strictly checked if the field officer's assigned_locations array contained the selected reservoir's location.
-- This caused INSERTs to fail if the field officer configuration was changed, or if an employee was inserting.

BEGIN;

-- 1. Relax the fisheries association INSERT policy.
DROP POLICY IF EXISTS "Associations can insert bills without proximity" ON public.association_bills;
CREATE POLICY "Associations can insert bills without proximity"
  ON public.association_bills
  FOR INSERT
  WITH CHECK (
    association_user_id = auth.uid()
    AND public.has_role(auth.uid(), 'fisheries_association')
  );

-- 2. Add policy for employees, managers and packing_staff to insert association bills if necessary.
-- They only need to be an authenticated employee user.
DROP POLICY IF EXISTS "Employees can insert association bills" ON public.association_bills;
CREATE POLICY "Employees can insert association bills"
  ON public.association_bills
  FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'employee') 
    OR public.has_role(auth.uid(), 'packing_staff')
    OR public.has_role(auth.uid(), 'super_admin')
  );

COMMIT;
