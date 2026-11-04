-- FINAL DEFINITIVE FIX FOR EMPLOYEES RLS
-- This migration clears all previous policies and sets up a robust, function-based policy for admins.

-- 1. Ensure RLS is enabled
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- 2. Drop EVERY potential policy name that might have been used
DROP POLICY IF EXISTS "Admins can manage employees" ON public.employees;
DROP POLICY IF EXISTS "Admins can manage all employees" ON public.employees;
DROP POLICY IF EXISTS "super_admin_manage_all" ON public.employees;
DROP POLICY IF EXISTS "super_admin_all_employees" ON public.employees;
DROP POLICY IF EXISTS "Users can view own employee record" ON public.employees;
DROP POLICY IF EXISTS "employees_view_own" ON public.employees;
DROP POLICY IF EXISTS "view_own_employee" ON public.employees;
DROP POLICY IF EXISTS "Associations can view active employees" ON public.employees;
DROP POLICY IF EXISTS "associations_view_active" ON public.employees;

-- 3. Use the SECURITY DEFINER function for the admin policy
-- This is much safer than direct subqueries which might trigger RLS recursion on user_roles.
CREATE POLICY "admin_all_policy"
ON public.employees
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- 4. Simplified policy for employees to see their own data
CREATE POLICY "employee_self_select"
ON public.employees
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 5. Simplified policy for associations to see active employees
CREATE POLICY "association_select_active"
ON public.employees
FOR SELECT
TO authenticated
USING (
  status = 'active' 
  AND public.has_role(auth.uid(), 'fisheries_association')
);
