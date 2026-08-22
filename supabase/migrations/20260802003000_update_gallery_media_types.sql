-- Migration: Update gallery_items table to support Image and Video formats seamlessly

-- 1. Ensure columns for video, thumbnails, aspect ratio, and features exist
ALTER TABLE public.gallery_items
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS thumbnail_url text,
  ADD COLUMN IF NOT EXISTS aspect_ratio text DEFAULT '16/9',
  ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;

-- 2. Add constraint for valid media_type
ALTER TABLE public.gallery_items
  DROP CONSTRAINT IF EXISTS check_media_type;

ALTER TABLE public.gallery_items
  ADD CONSTRAINT check_media_type CHECK (media_type IN ('image', 'video'));

-- 3. Insert rich sample data with both HD Images and HD Festival Videos
INSERT INTO public.gallery_items (title, category, media_url, video_url, thumbnail_url, media_type, likes, is_featured) VALUES
('Grand Ganapathi Sthapana & First Aarti', 'aarti', 'https://images.unsplash.com/photo-1631169920665-3b8b0e5a7ede?w=1200', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', 'https://images.unsplash.com/photo-1631169920665-3b8b0e5a7ede?w=1200', 'video', 342, true),
('Eco-Friendly Clay Idol Craftsmanship', 'photos', 'https://images.unsplash.com/photo-1604608672516-f1b9b1a0a1d9?w=1200', NULL, NULL, 'image', 189, false),
('Dhol Tasha Pathak Energetic Performance', 'cultural', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200', 'video', 512, true),
('108 Lamp Maha Deepotsav Aarti', 'aarti', 'https://images.unsplash.com/photo-1567591370504-c1b1a3f66c6a?w=1200', NULL, NULL, 'image', 276, false),
('Annual Children Rangoli & Drawing Contest', 'cultural', 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=1200', NULL, NULL, 'image', 145, false),
('Grand Visarjan Miravand Procession Highlights', 'visarjan', 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200', 'video', 630, true)
ON CONFLICT DO NOTHING;
