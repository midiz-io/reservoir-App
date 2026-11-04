-- Fix RLS (Row-Level Security) policies for association bills and employee access

-- 1. Enable UPDATE access for Fisheries Associations to edit their own pending/rejected bills, forcing the updated status to 'pending' for re-review
DROP POLICY IF EXISTS "Associations can update own pending or rejected bills" ON public.association_bills;
CREATE POLICY "Associations can update own pending or rejected bills"
  ON public.association_bills
  FOR UPDATE
  TO authenticated
  USING (
    association_user_id = auth.uid()
    AND (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'fisheries_association'
    AND status IN ('pending', 'rejected')
  )
  WITH CHECK (
    association_user_id = auth.uid()
    AND (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'fisheries_association'
    AND status = 'pending'
  );

-- 2. Enable SELECT access for employees to view entered association bills
DROP POLICY IF EXISTS "Employees can view all association bills" ON public.association_bills;
CREATE POLICY "Employees can view all association bills"
  ON public.association_bills
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'employee'
  );

-- 3. Enable UPDATE access for employees to review/approve bills (merging with super_admin)
DROP POLICY IF EXISTS "Super admins can review association bills" ON public.association_bills;
DROP POLICY IF EXISTS "Super admins and employees can review association bills" ON public.association_bills;
CREATE POLICY "Super admins and employees can review association bills"
  ON public.association_bills
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) IN ('super_admin', 'employee')
  )
  WITH CHECK (
    (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) IN ('super_admin', 'employee')
  );

-- 4. Enable SELECT access for employees to view all other employee records (needed for UI fetches/joins)
DROP POLICY IF EXISTS "Employees can view all employees" ON public.employees;
CREATE POLICY "Employees can view all employees"
  ON public.employees
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'employee'
  );

-- 5. Trigger to automatically sync email updates in public.employees to auth.users (enables login with new email)
CREATE OR REPLACE FUNCTION public.sync_employee_email_to_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF (OLD.email IS NULL OR NEW.email <> OLD.email) THEN
    UPDATE auth.users
    SET 
      email = NEW.email,
      normalized_email = lower(NEW.email),
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('email', NEW.email)
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_employee_email_updated ON public.employees;
CREATE TRIGGER on_employee_email_updated
  AFTER UPDATE OF email ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_employee_email_to_auth();

-- 6. RPC Function to allow super_admins to reset employee passwords securely in auth.users
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.admin_reset_employee_password(
  _employee_user_id UUID,
  _new_password TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
  -- Verify the requesting user is a super admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
      AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only super admins can reset passwords.';
  END IF;

  -- Verify password length
  IF length(_new_password) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters.';
  END IF;

  -- Update auth.users with standard bcrypt hashed password
  UPDATE auth.users
  SET encrypted_password = crypt(_new_password, gen_salt('bf'))
  WHERE id = _employee_user_id;

  RETURN TRUE;
END;
$$;
