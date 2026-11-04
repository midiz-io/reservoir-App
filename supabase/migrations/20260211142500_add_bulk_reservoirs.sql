-- Ensure we have a unique constraint on name to allow for clean bulk inserts/updates
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'reservoirs_name_key'
    ) THEN
        ALTER TABLE public.reservoirs ADD CONSTRAINT reservoirs_name_key UNIQUE (name);
    END IF;
END $$;

-- Bulk insert reservoirs with coordinates
INSERT INTO public.reservoirs (name, latitude, longitude, geofence_radius, status)
VALUES
('Akkarayan', 9.303, 80.334, 100, 'active'),
('Puthumurippu', 9.3743, 80.3538, 100, 'active'),
('Udayarkattu', 9.3093, 80.5814, 100, 'active'),
('Sapumalwewa', 8.95, 80.85, 100, 'active'),
('Mulathiv Kalmadu', 9.30, 80.49, 100, 'active'),
('Janakapura', 9.0179, 80.8431, 100, 'active'),
('Kiriibbanwewa', 8.9962, 80.8262, 100, 'active'),
('Mahadiul Wewa', 8.3718, 80.2459, 100, 'active'),
('Vilachchiya', 8.4936, 80.1922, 100, 'active'),
('Samanalawewa', 6.6638, 80.7753, 100, 'active'),
('Mahagalwewa', 6.3786, 81.0486, 100, 'active'),
('Hadapanagala', 6.772, 81.117, 100, 'active'),
('Udawalawa', 6.4185, 80.8239, 100, 'active'),
('Thelawilla', 8.0, 79.8, 100, 'active'),
('Manankattiya', 8.2, 80.65, 100, 'active'),
('Giritale', 7.983, 80.914, 100, 'active'),
('Minneriya', 8.033, 80.883, 100, 'active'),
('Kanthale (Vendrasan Wewa)', 8.3512, 81.007, 100, 'active'),
('Anuradhapura-Kumara(Nachchaduwa)', 8.233, 80.517, 100, 'active'),
('Siyabalangamuwa', 7.5519, 80.2069, 100, 'active'),
('Ismail', 8.35, 80.4, 100, 'active'),
('Udaya (Kurunegala)', 7.48, 80.36, 100, 'active'),
('Elagamuwa', 7.93, 80.56, 100, 'active'),
('Moragahakanda', 7.712, 80.751, 100, 'active'),
('Kaudulla', 8.167, 80.917, 100, 'active'),
('Hurula', 8.133, 80.75, 100, 'active'),
('Palitha', 8.1, 80.7, 100, 'active'),
('Indika', 8.1, 80.75, 100, 'active'),
('Kalankattiya', 8.1, 80.1, 100, 'active'),
('Wahalkada', 8.74, 80.73, 100, 'active'),
('Wawala', 7.5, 80.5, 100, 'active'),
('Peramaduwa', 8.5, 80.5, 100, 'active'),
('Henanigala', 7.6, 81.1, 100, 'active'),
('Rathkida', 7.53, 81.08, 100, 'active'),
('Sorabora Wewa', 7.46, 80.99, 100, 'active'),
('Ranasinghe', 7.5, 81.0, 100, 'active'),
('Elle wewa', 8.0, 80.0, 100, 'active'),
('Usgala', 7.8, 80.2, 100, 'active'),
('Usgala Siyabalangamuwa', 7.85, 80.25, 100, 'active'),
('Kalaoya', 8.15, 79.85, 100, 'active'),
('Ambakolawewa', 7.6, 80.1, 100, 'active'),
('Manodas', 7.65, 80.15, 100, 'active'),
('Galgamuwa', 8.03, 80.28, 100, 'active'),
('Kathnoruwa', 8.05, 80.3, 100, 'active'),
('Giribawa', 7.98, 80.25, 100, 'active'),
('Walioya Ahatugas Wewa', 9.11, 80.8, 100, 'active'),
('Yan Oya', 8.6, 80.8, 100, 'active'),
('Nimal - wahalkada', 8.75, 80.75, 100, 'active'),
('Kumara', 8.25, 80.55, 100, 'active'),
('Ishtavira', 8.2, 80.5, 100, 'active'),
('Dewahuwwa', 7.8, 80.6, 100, 'active'),
('Wa Madilla', 7.7, 80.7, 100, 'active')
ON CONFLICT (name) DO UPDATE SET
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude;

