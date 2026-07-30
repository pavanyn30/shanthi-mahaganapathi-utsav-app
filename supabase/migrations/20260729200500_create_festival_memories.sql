-- Create festival_memories table for yearly animated timeline gallery

CREATE TABLE public.festival_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year int NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  cover_image_url text NOT NULL,
  photos text[] NOT NULL DEFAULT '{}',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Grants
GRANT SELECT ON public.festival_memories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.festival_memories TO authenticated;
GRANT ALL ON public.festival_memories TO service_role;

-- RLS Policies
ALTER TABLE public.festival_memories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "memories_public_read" ON public.festival_memories;
DROP POLICY IF EXISTS "memories_staff_all" ON public.festival_memories;

CREATE POLICY "memories_public_read" ON public.festival_memories FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "memories_staff_all" ON public.festival_memories FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

-- Sample Yearly Memories Data
INSERT INTO public.festival_memories (year, title, description, cover_image_url, photos, sort_order) VALUES
(2025, 'Silver Jubilee Celebrations 2025', 'A landmark 25th year with record-breaking 50,000+ devotees, grand 12-ft eco-friendly idol, 108 Maha Aarti lamps, and spectacular Visarjan procession.', 'https://images.unsplash.com/photo-1631169920665-3b8b0e5a7ede?w=1200', ARRAY['https://images.unsplash.com/photo-1567591370504-c1b1a3f66c6a?w=1200', 'https://images.unsplash.com/photo-1604608672516-f1b9b1a0a1d9?w=1200', 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200'], 1),
(2024, 'Eco-Friendly Heritage Utsav 2024', 'Focused on clay idol craftsmanship, plastic-free mandap, traditional Dhol Tasha troupe performance, and cultural stage contests for 500+ youth.', 'https://images.unsplash.com/photo-1604608672516-f1b9b1a0a1d9?w=1200', ARRAY['https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200', 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=1200'], 2),
(2023, 'Community Annadana & Devotion 2023', 'Over 20,000 meals served during daily Mahaprasada. Featuring grand floral illumination and inter-mandal sports championship.', 'https://images.unsplash.com/photo-1567591370504-c1b1a3f66c6a?w=1200', ARRAY['https://images.unsplash.com/photo-1631169920665-3b8b0e5a7ede?w=1200', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200'], 3);
