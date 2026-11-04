-- Remove the foreign key constraint on employees.user_id
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_user_id_fkey;