-- FIX LOGIN FAILURE AND RLS RECURSION
-- This migration restores the ability for users to verify their roles during login.

-- 1. Redefine has_role to be absolutely safe (redundant check but ensures it exists)
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

-- 2. Clear problematic policies on user_roles
DROP POLICY IF EXISTS "admin_manage_roles_no_recursion" ON public.user_roles;
DROP POLICY IF EXISTS "users_view_own_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

-- 3. Re-establish clean, non-recursive policies for user_roles
-- Users must be able to see their own role to log in!
CREATE POLICY "user_roles_self_select"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can do everything on user_roles using the SECURITY DEFINER function
CREATE POLICY "user_roles_admin_all"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- 4. Update employee policies to use the function as well (safer than subqueries)
DROP POLICY IF EXISTS "permissive_admin_policy" ON public.employees;
DROP POLICY IF EXISTS "employee_self_select" ON public.employees;
DROP POLICY IF EXISTS "association_view_active" ON public.employees;

CREATE POLICY "employees_admin_policy"
ON public.employees
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "employees_self_select"
ON public.employees
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "employees_association_select"
ON public.employees
FOR SELECT
TO authenticated
USING (
  status = 'active'
  AND public.has_role(auth.uid(), 'fisheries_association')
);
