-- Ensure we have a unique constraint on name for locations
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'locations_name_key'
    ) THEN
        ALTER TABLE public.locations ADD CONSTRAINT locations_name_key UNIQUE (name);
    END IF;
END $$;

-- Ensure we have a unique constraint on name for reservoirs
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'reservoirs_name_key'
    ) THEN
        ALTER TABLE public.reservoirs ADD CONSTRAINT reservoirs_name_key UNIQUE (name);
    END IF;
END $$;

-- Create Ampara Center location
INSERT INTO public.locations (name, latitude, longitude)
VALUES ('Ampara Center', 7.2975, 81.6820)
ON CONFLICT (name) DO UPDATE SET
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude;

-- Get the ID of Ampara Center and upsert reservoirs
DO $$
DECLARE
    ampara_id UUID;
BEGIN
    SELECT id INTO ampara_id FROM public.locations WHERE name = 'Ampara Center' LIMIT 1;

    -- Upsert reservoirs and link them to Ampara Center
    INSERT INTO public.reservoirs (name, location_id, latitude, longitude, geofence_radius, status)
    VALUES
    ('Samanalawewa', ampara_id, 6.6638, 80.7753, 100, 'active'),
    ('Mahagalwewa', ampara_id, 6.3833, 81.2167, 100, 'active'),
    ('Hadapanagala', ampara_id, 6.6664, 81.1519, 100, 'active'),
    ('Udawalawa', ampara_id, 6.4339, 80.8542, 100, 'active'),
    ('Thelawilla', ampara_id, 8.0, 79.8, 100, 'active')
    ON CONFLICT (name) DO UPDATE SET
      location_id = EXCLUDED.location_id,
      latitude = EXCLUDED.latitude,
      longitude = EXCLUDED.longitude;
END $$;
