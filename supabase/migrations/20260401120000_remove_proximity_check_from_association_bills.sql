DROP POLICY IF EXISTS "Associations can insert bills when super admin is in zone" ON public.association_bills;

CREATE POLICY "Associations can insert bills without proximity"
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
  );
