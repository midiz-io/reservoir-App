-- Allow super admins to insert association bills without proximity checks
DROP POLICY IF EXISTS "Super admins can insert association bills without proximity" ON public.association_bills;
CREATE POLICY "Super admins can insert association bills without proximity"
  ON public.association_bills
  FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
  );
