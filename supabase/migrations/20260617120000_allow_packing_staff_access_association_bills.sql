-- Allow packing_staff role to SELECT approved association_bills
-- and UPDATE them (for box_number, sealing_tag_number, items, total)

-- 0. First add 'packing_staff' to the app_role enum (if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'app_role'
      AND e.enumlabel = 'packing_staff'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'packing_staff';
  END IF;
END
$$;
