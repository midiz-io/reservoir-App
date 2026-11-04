-- Fix for RLS infinite recursion error on employees and user_roles tables

BEGIN;

-- 1. Ensure the has_role function is SECURITY DEFINER so it bypasses RLS and avoids recursion
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role text)
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
      AND role::text = _role
  )
$$;

-- 2. Drop the recursive policies
DROP POLICY IF EXISTS "permissive_admin_policy" ON public.employees;
DROP POLICY IF EXISTS "super_admin_manage_all" ON public.employees;
DROP POLICY IF EXISTS "admin_manage_roles_no_recursion" ON public.user_roles;

-- 3. Create non-recursive policies using the SECURITY DEFINER function
CREATE POLICY "permissive_admin_policy_fixed" ON public.employees
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "admin_manage_roles_fixed" ON public.user_roles
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

COMMIT;
