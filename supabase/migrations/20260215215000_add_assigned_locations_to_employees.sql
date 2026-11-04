-- Add assigned_locations column to employees
ALTER TABLE public.employees 
  ADD COLUMN IF NOT EXISTS assigned_locations UUID[] DEFAULT '{}';

-- Update RLS policy for association_bills to use assigned_locations
-- We check if the reservoir_id belongs to any of the assigned_locations of the field officer
DROP POLICY IF EXISTS "Associations can insert bills when super admin is in zone" ON public.association_bills;
CREATE POLICY "Associations can insert bills when super admin is in zone"
  ON public.association_bills
  FOR INSERT
  WITH CHECK (
    association_user_id = auth.uid()
    AND public.has_role(auth.uid(), 'fisheries_association')
    AND EXISTS (
      SELECT 1 FROM public.reservoirs r 
      JOIN public.employees e ON r.location_id = ANY(COALESCE(e.assigned_locations, '{}'::uuid[]))
      WHERE r.id = reservoir_id 
      AND e.id = field_officer_employee_id
    )
    AND public.is_super_admin_within_reservoir_geofence(reservoir_id)
  );

-- Optional: If you want to migrate existing assigned_reservoirs to assigned_locations 
-- This is tricky because a reservoir belongs to one location.
-- We can add the locations of all currently assigned reservoirs.
UPDATE public.employees
SET assigned_locations = (
  SELECT array_agg(DISTINCT location_id)
  FROM public.reservoirs
  WHERE id = ANY(assigned_reservoirs)
)
WHERE array_length(assigned_reservoirs, 1) > 0;
