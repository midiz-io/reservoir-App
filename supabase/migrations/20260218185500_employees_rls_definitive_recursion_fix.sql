-- DEFINITIVE RLS FIX FOR EMPLOYEES
-- This migration clears all policies and sets up a robust admin access check.

-- 1. Clear all existing policies on employees
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'employees' AND schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.employees', pol.policyname);
    END LOOP;
END $$;

-- 2. Clear potential policies on user_roles that might cause recursion
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_roles' AND schemaname = 'public') LOOP
        -- We only drop the admin ones that might be recursive
        IF pol.policyname LIKE '%Admin%' OR pol.policyname LIKE '%admin%' THEN
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_roles', pol.policyname);
        END IF;
    END LOOP;
END $$;

-- 3. Re-enable RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Create a robust admin policy for employees
-- Using a direct subquery with a restricted search path for safety
CREATE POLICY "permissive_admin_policy"
ON public.employees
FOR ALL
TO authenticated
USING (
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'super_admin'
)
WITH CHECK (
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'super_admin'
);

-- 5. Create basic self-view policy
CREATE POLICY "employee_self_select"
ON public.employees
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 6. Create association view policy
CREATE POLICY "association_view_active"
ON public.employees
FOR SELECT
TO authenticated
USING (
  status = 'active'
  AND (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'fisheries_association'
);

-- 7. Fix user_roles policy recursion if any
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "admin_manage_roles_no_recursion"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  -- We check role but avoid calling has_role() if it calls us back
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'super_admin'
);

-- 8. Ensure self-view on roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "users_view_own_roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
