-- NUCLEAR RLS FIX FOR EMPLOYEES TABLE
-- This migration wipes the slate clean and sets up a robust, guaranteed policy for admins.

DO $$ 
DECLARE
    pol RECORD;
BEGIN
    -- Drop every single policy on the employees table to avoid any hidden conflicts
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'employees' AND schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.employees', pol.policyname);
    END LOOP;
END $$;

-- Ensure RLS is enabled
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Re-assert the has_role function to be absolutely sure it's SECURITY DEFINER
-- and handles the user_roles table correctly.
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 1. THE PRIMARY ADMIN POLICY
-- This allows super_admins to do EVERYTHING.
-- We use public.has_role(auth.uid(), 'super_admin') which bypasses RLS on user_roles.
CREATE POLICY "employees_admin_nuclear_policy"
ON public.employees
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- 2. THE EMPLOYEE SELF-VIEW POLICY
-- Allows any authenticated user to view their own record.
CREATE POLICY "employees_self_select_policy"
ON public.employees
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 3. THE ASSOCIATION VIEW POLICY
-- Allows fisheries associations to view active employees.
CREATE POLICY "employees_association_select_policy"
ON public.employees
FOR SELECT
TO authenticated
USING (
  status = 'active'
  AND public.has_role(auth.uid(), 'fisheries_association')
);

-- Grant necessary permissions just in case
GRANT ALL ON public.employees TO authenticated;
GRANT ALL ON public.employees TO service_role;
