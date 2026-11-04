-- Fix RLS policy for employees table definitively
-- This migration ensures that super_admins can manage all employee records without RLS violations.

-- 1. Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can manage employees" ON public.employees;
DROP POLICY IF EXISTS "Users can view own employee record" ON public.employees;
DROP POLICY IF EXISTS "Associations can view active employees" ON public.employees;
DROP POLICY IF EXISTS "super_admin_all_employees" ON public.employees;
DROP POLICY IF EXISTS "view_own_employee" ON public.employees;

-- 2. Create a very robust policy for super_admins
-- We use a direct subquery which is often more reliable in RLS than security definer functions in certain contexts
CREATE POLICY "super_admin_manage_all"
ON public.employees
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'super_admin'
  )
);

-- 3. Create policy for employees to view their own record
CREATE POLICY "employees_view_own"
ON public.employees
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 4. Create policy for fisheries associations to view active employees
CREATE POLICY "associations_view_active"
ON public.employees
FOR SELECT
TO authenticated
USING (
  status = 'active'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'fisheries_association'
  )
);
