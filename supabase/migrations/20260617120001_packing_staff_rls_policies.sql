-- RLS policies for packing_staff on association_bills, reservoirs, employees
-- Run this AFTER the enum value 'packing_staff' has been committed

-- 1. SELECT policy: packing_staff can view only approved bills
DROP POLICY IF EXISTS "Packing staff can view approved association bills" ON public.association_bills;
CREATE POLICY "Packing staff can view approved association bills"
  ON public.association_bills
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role::text FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'packing_staff'
    AND status = 'approved'
  );

-- 2. UPDATE policy: packing_staff can update approved bills (for packing data entry)
DROP POLICY IF EXISTS "Packing staff can update approved association bills" ON public.association_bills;
CREATE POLICY "Packing staff can update approved association bills"
  ON public.association_bills
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT role::text FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'packing_staff'
    AND status = 'approved'
  )
  WITH CHECK (
    (SELECT role::text FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'packing_staff'
    AND status = 'approved'
  );

-- 3. Allow packing_staff to view reservoirs (needed for the join in the query)
DROP POLICY IF EXISTS "Packing staff can view reservoirs" ON public.reservoirs;
CREATE POLICY "Packing staff can view reservoirs"
  ON public.reservoirs
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role::text FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'packing_staff'
  );

-- 4. Allow packing_staff to view employees (needed for the join in the query)
DROP POLICY IF EXISTS "Packing staff can view employees" ON public.employees;
CREATE POLICY "Packing staff can view employees"
  ON public.employees
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role::text FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'packing_staff'
  );
