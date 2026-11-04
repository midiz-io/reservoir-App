-- Add fisheries association role + bill entry feature gated by super admin proximity

-- NOTE: the 'fisheries_association' enum value is added in a separate migration
-- (see 20251218084500_add_fisheries_association_role.sql) because Postgres
-- requires new enum values to be committed before they can be used.

-- 1) Enforce single-role-per-user (the frontend assumes one row in user_roles)
-- If any users currently have multiple roles, keep the best one (prefer super_admin).
WITH ranked AS (
  SELECT
    id,
    user_id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id
      ORDER BY (role = 'super_admin') DESC, id ASC
    ) AS rn
  FROM public.user_roles
)
DELETE FROM public.user_roles ur
USING ranked r
WHERE ur.id = r.id
  AND r.rn > 1;

ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_key;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);

-- 2) Track super admin locations (separate from employees)
CREATE TABLE IF NOT EXISTS public.admin_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION NOT NULL,
  battery_level DOUBLE PRECISION,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.admin_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can insert own admin location" ON public.admin_locations;
CREATE POLICY "Super admins can insert own admin location"
  ON public.admin_locations
  FOR INSERT
  WITH CHECK (
    auth.uid() = admin_user_id
    AND public.has_role(auth.uid(), 'super_admin')
  );

DROP POLICY IF EXISTS "Super admins can view all admin locations" ON public.admin_locations;
CREATE POLICY "Super admins can view all admin locations"
  ON public.admin_locations
  FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE INDEX IF NOT EXISTS idx_admin_locations_admin_user_id ON public.admin_locations(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_locations_timestamp ON public.admin_locations(timestamp DESC);

-- 3) Haversine distance helper (meters)
CREATE OR REPLACE FUNCTION public.haversine_meters(
  lat1 DOUBLE PRECISION,
  lon1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION,
  lon2 DOUBLE PRECISION
)
RETURNS DOUBLE PRECISION
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    2 * 6371000 * asin(
      sqrt(
        pow(sin(radians(lat2 - lat1) / 2), 2) +
        cos(radians(lat1)) * cos(radians(lat2)) *
        pow(sin(radians(lon2 - lon1) / 2), 2)
      )
    );
$$;

-- 4) Boolean gate for RLS checks
CREATE OR REPLACE FUNCTION public.is_super_admin_within_reservoir_geofence(_reservoir_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r_lat DOUBLE PRECISION;
  r_lon DOUBLE PRECISION;
  r_radius INTEGER;
  best_distance DOUBLE PRECISION;
BEGIN
  SELECT latitude, longitude, geofence_radius
    INTO r_lat, r_lon, r_radius
  FROM public.reservoirs
  WHERE id = _reservoir_id;

  IF r_lat IS NULL OR r_lon IS NULL OR r_radius IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT MIN(public.haversine_meters(al.latitude, al.longitude, r_lat, r_lon))
    INTO best_distance
  FROM public.admin_locations al
  JOIN public.user_roles ur
    ON ur.user_id = al.admin_user_id
   AND ur.role = 'super_admin'
  WHERE al.timestamp > now() - interval '10 minutes';

  IF best_distance IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN best_distance <= r_radius;
END;
$$;

-- 5) Proximity details RPC for UI
CREATE OR REPLACE FUNCTION public.super_admin_proximity_to_reservoir(_reservoir_id UUID)
RETURNS TABLE (
  is_within BOOLEAN,
  distance_m DOUBLE PRECISION,
  last_seen TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH r AS (
    SELECT latitude, longitude, geofence_radius
    FROM public.reservoirs
    WHERE id = _reservoir_id
  ),
  candidates AS (
    SELECT
      al.timestamp,
      public.haversine_meters(al.latitude, al.longitude, r.latitude, r.longitude) AS distance_m,
      r.geofence_radius AS radius_m
    FROM public.admin_locations al
    JOIN public.user_roles ur
      ON ur.user_id = al.admin_user_id
     AND ur.role = 'super_admin'
    CROSS JOIN r
    WHERE al.timestamp > now() - interval '10 minutes'
  ),
  best AS (
    SELECT *
    FROM candidates
    ORDER BY distance_m ASC, timestamp DESC
    LIMIT 1
  )
  SELECT
    COALESCE(best.distance_m <= best.radius_m, FALSE) AS is_within,
    best.distance_m,
    best.timestamp
  FROM best
  RIGHT JOIN r ON TRUE;
END;
$$;

-- 6) Allow fisheries associations to view active employees (to select field officer)
-- Existing policies: "Users can view own employee record", "Admins can view all employees"
DROP POLICY IF EXISTS "Associations can view active employees" ON public.employees;
CREATE POLICY "Associations can view active employees"
  ON public.employees
  FOR SELECT
  USING (
    status = 'active'
    AND public.has_role(auth.uid(), 'fisheries_association')
  );

-- 7) Association bills table
CREATE TABLE IF NOT EXISTS public.association_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  association_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  field_officer_employee_id UUID REFERENCES public.employees(id) ON DELETE RESTRICT NOT NULL,
  reservoir_id UUID REFERENCES public.reservoirs(id) ON DELETE RESTRICT NOT NULL,
  bill_no TEXT NOT NULL,
  bill_date DATE NOT NULL,
  supplier_name TEXT NOT NULL,
  supplier_tel TEXT,
  supplier_email TEXT,
  supplier_address TEXT,
  purchaser_name TEXT,
  remarks TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total NUMERIC NOT NULL,
  invoice_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.association_bills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Associations can view own bills" ON public.association_bills;
CREATE POLICY "Associations can view own bills"
  ON public.association_bills
  FOR SELECT
  USING (
    association_user_id = auth.uid()
    AND public.has_role(auth.uid(), 'fisheries_association')
  );

DROP POLICY IF EXISTS "Admins can view all association bills" ON public.association_bills;
CREATE POLICY "Admins can view all association bills"
  ON public.association_bills
  FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Associations can insert bills when super admin is in zone" ON public.association_bills;
CREATE POLICY "Associations can insert bills when super admin is in zone"
  ON public.association_bills
  FOR INSERT
  WITH CHECK (
    association_user_id = auth.uid()
    AND public.has_role(auth.uid(), 'fisheries_association')
    AND reservoir_id = ANY(
      COALESCE(
        (SELECT assigned_reservoirs FROM public.employees WHERE id = field_officer_employee_id),
        '{}'::uuid[]
      )
    )
    AND public.is_super_admin_within_reservoir_geofence(reservoir_id)
  );

CREATE INDEX IF NOT EXISTS idx_association_bills_association_user_id ON public.association_bills(association_user_id);
CREATE INDEX IF NOT EXISTS idx_association_bills_created_at ON public.association_bills(created_at DESC);


