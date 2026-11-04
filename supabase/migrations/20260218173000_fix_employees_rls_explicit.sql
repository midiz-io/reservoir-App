-- Fix RLS policies for employees table to be more explicit
-- and ensure super_admin role is properly recognized during INSERT/UPDATE operations.

DROP POLICY IF EXISTS "Admins can manage employees" ON public.employees;

CREATE POLICY "Admins can manage employees"
  ON public.employees
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Re-assert other policies for completeness
DROP POLICY IF EXISTS "Users can view own employee record" ON public.employees;
CREATE POLICY "Users can view own employee record"
  ON public.employees
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Associations can view active employees" ON public.employees;
CREATE POLICY "Associations can view active employees"
  ON public.employees
  FOR SELECT
  TO authenticated
  USING (
    status = 'active'
    AND public.has_role(auth.uid(), 'fisheries_association')
  );
