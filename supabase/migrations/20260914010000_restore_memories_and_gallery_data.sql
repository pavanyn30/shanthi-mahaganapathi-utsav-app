-- Migration: Restore Memories and Gallery Data Only

-- 1. Restore Festival Memories
DELETE FROM public.festival_memories;

INSERT INTO public.festival_memories (year, title, description, cover_image_url, photos, sort_order) VALUES
(2025, 'Silver Jubilee Celebrations 2025', 'A landmark 25th year with record-breaking 50,000+ devotees, grand 12-ft eco-friendly idol, 108 Maha Aarti lamps, and spectacular Visarjan procession.', 'https://images.unsplash.com/photo-1631169920665-3b8b0e5a7ede?w=1200', ARRAY['https://images.unsplash.com/photo-1567591370504-c1b1a3f66c6a?w=1200', 'https://images.unsplash.com/photo-1604608672516-f1b9b1a0a1d9?w=1200', 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200'], 1),
(2024, 'Eco-Friendly Heritage Utsav 2024', 'Focused on clay idol craftsmanship, plastic-free mandap, traditional Dhol Tasha troupe performance, and cultural stage contests for 500+ youth.', 'https://images.unsplash.com/photo-1604608672516-f1b9b1a0a1d9?w=1200', ARRAY['https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200', 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=1200'], 2),
(2023, 'Community Annadana & Devotion 2023', 'Over 20,000 meals served during daily Mahaprasada. Featuring grand floral illumination and inter-mandal sports championship.', 'https://images.unsplash.com/photo-1567591370504-c1b1a3f66c6a?w=1200', ARRAY['https://images.unsplash.com/photo-1631169920665-3b8b0e5a7ede?w=1200', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200'], 3);

-- 2. Restore Media Gallery Items
DELETE FROM public.gallery_items;

INSERT INTO public.gallery_items (title, category, media_url, video_url, thumbnail_url, media_type, likes, is_featured) VALUES
('Grand Ganapathi Sthapana & First Aarti', 'aarti', 'https://images.unsplash.com/photo-1631169920665-3b8b0e5a7ede?w=1200', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', 'https://images.unsplash.com/photo-1631169920665-3b8b0e5a7ede?w=1200', 'video', 342, true),
('Eco-Friendly Clay Idol Craftsmanship', 'photos', 'https://images.unsplash.com/photo-1604608672516-f1b9b1a0a1d9?w=1200', NULL, NULL, 'image', 189, false),
('Dhol Tasha Pathak Energetic Performance', 'cultural', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200', 'video', 512, true),
('108 Lamp Maha Deepotsav Aarti', 'aarti', 'https://images.unsplash.com/photo-1567591370504-c1b1a3f66c6a?w=1200', NULL, NULL, 'image', 276, false),
('Annual Children Rangoli & Drawing Contest', 'cultural', 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=1200', NULL, NULL, 'image', 145, false),
('Grand Visarjan Miravand Procession Highlights', 'visarjan', 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200', 'video', 630, true);
