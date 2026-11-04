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

-- Create Vavuniya Center location
INSERT INTO public.locations (name, latitude, longitude)
VALUES ('Vavuniya Center', 8.7514, 80.4971)
ON CONFLICT (name) DO UPDATE SET
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude;

-- Get the ID of Vavuniya Center and upsert reservoirs
DO $$
DECLARE
    vavuniya_id UUID;
BEGIN
    SELECT id INTO vavuniya_id FROM public.locations WHERE name = 'Vavuniya Center' LIMIT 1;

    -- Upsert reservoirs and link them to Vavuniya Center
    INSERT INTO public.reservoirs (name, location_id, latitude, longitude, geofence_radius, status)
    VALUES
    ('Iranaimadu', vavuniya_id, 9.30038, 80.45131, 100, 'active'),
    ('Akkarayan', vavuniya_id, 9.28864, 80.33341, 100, 'active'),
    ('Puthumurippu', vavuniya_id, 9.3587, 80.3552, 100, 'active'),
    ('Udayarkattu', vavuniya_id, 9.3093, 80.5814, 100, 'active'),
    ('Sapumalwewa', vavuniya_id, 8.9486, 80.7417, 100, 'active'),
    ('Mulathiv Kalmadu', vavuniya_id, 9.3094, 80.6389, 100, 'active'),
    ('Janakapura', vavuniya_id, 9.0019, 80.8856, 100, 'active'),
    ('Kiriibbanwewa', vavuniya_id, 8.9712, 80.9161, 100, 'active'),
    ('Mahadiul Wewa', vavuniya_id, 8.5278, 80.7011, 100, 'active'),
    ('Vilachchiya', vavuniya_id, 8.3861, 80.1983, 100, 'active')
    ON CONFLICT (name) DO UPDATE SET
      location_id = EXCLUDED.location_id,
      latitude = EXCLUDED.latitude,
      longitude = EXCLUDED.longitude;
END $$;
