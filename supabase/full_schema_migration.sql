
-- ROLES
CREATE TYPE public.app_role AS ENUM ('admin', 'organizer', 'volunteer', 'user');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  phone text,
  city text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','organizer'))
$$;

CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_staff(auth.uid()));
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "roles_select_own" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- timestamps helper
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- auto profile + default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email, NEW.raw_user_meta_data->>'phone')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- EVENTS
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'cultural',
  event_date date NOT NULL,
  start_time time NOT NULL DEFAULT '10:00',
  end_time time,
  venue text NOT NULL DEFAULT 'Main Pandal',
  max_participants int NOT NULL DEFAULT 100,
  registration_open boolean NOT NULL DEFAULT true,
  entry_fee numeric(10,2) NOT NULL DEFAULT 0,
  rules text DEFAULT '',
  prize_details text DEFAULT '',
  age_min int,
  age_max int,
  team_size int NOT NULL DEFAULT 1,
  poster_url text,
  organizer_name text,
  organizer_phone text,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events_public_read" ON public.events FOR SELECT TO anon, authenticated USING (is_published = true);
CREATE POLICY "events_staff_all" ON public.events FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_events_updated BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- REGISTRATIONS
CREATE TABLE public.registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pass_code text UNIQUE NOT NULL DEFAULT upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)),
  full_name text NOT NULL,
  phone text NOT NULL,
  email text,
  age int,
  gender text,
  address text,
  team_name text,
  teammates text,
  emergency_contact text,
  blood_group text,
  photo_url text,
  status text NOT NULL DEFAULT 'confirmed',
  payment_status text NOT NULL DEFAULT 'not_required',
  attended boolean NOT NULL DEFAULT false,
  attended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.registrations TO authenticated;
GRANT ALL ON public.registrations TO service_role;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reg_select_own" ON public.registrations FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_staff(auth.uid()));
CREATE POLICY "reg_insert_own" ON public.registrations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reg_update_own" ON public.registrations FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_staff(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_staff(auth.uid()));
CREATE POLICY "reg_delete_own" ON public.registrations FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_staff(auth.uid()));
CREATE TRIGGER trg_reg_updated BEFORE UPDATE ON public.registrations FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ANNOUNCEMENTS
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  is_pinned boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.announcements TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ann_public_read" ON public.announcements FOR SELECT TO anon, authenticated USING (is_published = true);
CREATE POLICY "ann_staff_all" ON public.announcements FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- SPONSORS
CREATE TABLE public.sponsors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tier text NOT NULL DEFAULT 'bronze',
  logo_url text,
  website text,
  contact text,
  banner_url text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sponsors TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sponsors TO authenticated;
GRANT ALL ON public.sponsors TO service_role;
ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sponsors_public_read" ON public.sponsors FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "sponsors_staff_all" ON public.sponsors FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- GALLERY
CREATE TABLE public.gallery_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL DEFAULT 'photos',
  media_url text NOT NULL,
  media_type text NOT NULL DEFAULT 'image',
  likes int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.gallery_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gallery_items TO authenticated;
GRANT ALL ON public.gallery_items TO service_role;
ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gallery_public_read" ON public.gallery_items FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "gallery_staff_all" ON public.gallery_items FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- DONATIONS
CREATE TABLE public.donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  donor_name text NOT NULL,
  amount numeric(12,2) NOT NULL,
  message text,
  is_anonymous boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.donations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.donations TO authenticated;
GRANT ALL ON public.donations TO service_role;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "don_public_read_approved" ON public.donations FOR SELECT TO anon, authenticated USING (status = 'approved');
CREATE POLICY "don_select_own" ON public.donations FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_staff(auth.uid()));
CREATE POLICY "don_insert_own" ON public.donations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "don_staff_write" ON public.donations FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "don_staff_delete" ON public.donations FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

-- VOLUNTEERS
CREATE TABLE public.volunteers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text NOT NULL,
  skills text,
  availability text,
  duty text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteers TO authenticated;
GRANT ALL ON public.volunteers TO service_role;
ALTER TABLE public.volunteers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vol_select_own" ON public.volunteers FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_staff(auth.uid()));
CREATE POLICY "vol_insert_own" ON public.volunteers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "vol_staff_update" ON public.volunteers FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- SETTINGS
CREATE TABLE public.festival_settings (
  id int PRIMARY KEY DEFAULT 1,
  festival_name text NOT NULL DEFAULT 'Ganapathi Festival 2026',
  start_date date NOT NULL DEFAULT '2026-09-14',
  end_date date NOT NULL DEFAULT '2026-09-24',
  live_stream_url text,
  upi_id text,
  donation_goal numeric(12,2) NOT NULL DEFAULT 500000,
  contact_phone text,
  contact_email text,
  address text,
  CONSTRAINT single_row CHECK (id = 1)
);
GRANT SELECT ON public.festival_settings TO anon;
GRANT SELECT, UPDATE ON public.festival_settings TO authenticated;
GRANT ALL ON public.festival_settings TO service_role;
ALTER TABLE public.festival_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_public_read" ON public.festival_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "settings_staff_update" ON public.festival_settings FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

INSERT INTO public.festival_settings (id, live_stream_url, upi_id, contact_phone, contact_email, address)
VALUES (1, 'https://www.youtube.com/embed/videoseries?list=PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI', 'ganapathimandal@upi', '+91 98860 12345', 'info@ganapathifest.in', 'Sri Ganapathi Mandal, Main Road, Bengaluru 577501');

-- SAMPLE DATA
INSERT INTO public.events (name, slug, description, category, event_date, start_time, venue, max_participants, entry_fee, rules, prize_details, age_min, age_max, team_size, organizer_name, organizer_phone) VALUES
('Classical Dance Competition','dance','Solo and group classical & folk dance showcase on the main stage.','cultural','2026-09-15','17:00','Main Stage',60,100,'Max 5 minutes per performance. Own music track on pen drive.','1st â‚¹5000, 2nd â‚¹3000, 3rd â‚¹2000',6,25,1,'Meera Rao','+91 98860 11111'),
('Singing Competition','singing','Devotional and film songs. Karaoke allowed.','cultural','2026-09-16','18:00','Main Stage',50,100,'One song, max 4 minutes. No lyrics sheet on stage.','1st â‚¹4000, 2nd â‚¹2500, 3rd â‚¹1500',8,40,1,'Suresh K','+91 98860 22222'),
('Drawing & Colouring','drawing','Theme based drawing contest for kids in three age groups.','kids','2026-09-16','10:00','Community Hall',120,0,'Bring your own colours. Paper provided.','Trophies + certificates for all',4,15,1,'Anitha S','+91 98860 33333'),
('Rangoli Contest','rangoli','Traditional rangoli around the pandal entrance.','cultural','2026-09-17','07:00','Pandal Entrance',40,50,'Bring your own colours. 2 hour limit.','1st â‚¹3000, 2nd â‚¹2000',12,60,2,'Lakshmi B','+91 98860 44444'),
('Street Cricket Tournament','cricket','Tennis ball knockout tournament, 6 overs per side.','sports','2026-09-18','08:00','Ground No. 2',96,600,'8 players per team. Umpire decision final.','Winner â‚¹15000 + Trophy',14,35,8,'Ravi Kumar','+91 98860 55555'),
('Kabaddi Championship','kabaddi','Traditional kabaddi matches under floodlights.','sports','2026-09-19','19:00','Ground No. 1',84,500,'7 players + 3 substitutes. Standard rules.','Winner â‚¹12000, Runner Up â‚¹6000',16,40,7,'Manju Gowda','+91 98860 66666'),
('General Knowledge Quiz','quiz','Three round quiz on culture, sports and current affairs.','indoor','2026-09-19','16:00','Community Hall',60,50,'Teams of 2. No mobile phones.','1st â‚¹4000, 2nd â‚¹2000',10,30,2,'Prakash N','+91 98860 77777'),
('BGMI Tournament','bgmi','Squad mode battle royale on the big screen.','esports','2026-09-20','14:00','Gaming Zone',64,200,'Own device required. No emulators.','Winner squad â‚¹10000',14,30,4,'Karthik','+91 98860 88888'),
('Free Fire Tournament','free-fire','Clash squad tournament, best of three.','esports','2026-09-20','18:00','Gaming Zone',48,150,'No hacks. Screen recording mandatory.','Winner squad â‚¹8000',14,30,4,'Karthik','+91 98860 88888'),
('Fancy Dress','fancy-dress','Kids dress up as mythological and freedom fighter characters.','kids','2026-09-21','17:00','Main Stage',80,0,'Two minutes per child including intro.','Medals + gift hampers',3,12,1,'Deepa R','+91 98860 99999'),
('Cooking Without Fire','cooking','Creative no-fire recipes judged on taste and presentation.','indoor','2026-09-22','11:00','Community Hall',40,100,'Bring your own ingredients and utensils.','1st â‚¹3000, 2nd â‚¹1500',15,60,2,'Shobha M','+91 98860 10101'),
('Running Race','running','100m, 200m and 400m sprints across age categories.','sports','2026-09-23','06:30','Ground No. 2',150,0,'Report 30 minutes before your heat.','Medals for top 3 in each category',8,45,1,'Vinay P','+91 98860 20202');

INSERT INTO public.announcements (title, message, type, is_pinned) VALUES
('Registrations are open!','Register now for all 12 competitions. Early birds get priority slots.','info',true),
('Maha Aarti timings','Daily Maha Aarti at 7:30 PM. Prasada distribution follows immediately.','info',false),
('Parking advisory','Please use the school ground parking. Main road parking will be towed.','urgent',false),
('Volunteers needed','We need 40 more volunteers for crowd management and prasada counters.','info',false);

INSERT INTO public.sponsors (name, tier, website, contact, sort_order) VALUES
('Sri Balaji Jewellers','gold','https://example.com','+91 98800 11111',1),
('Nandini Sweets & Bakery','gold','https://example.com','+91 98800 22222',2),
('GreenLeaf Supermart','silver','https://example.com','+91 98800 33333',3),
('Vishwas Motors','silver','https://example.com','+91 98800 44444',4),
('CityCare Clinic','bronze','https://example.com','+91 98800 55555',5),
('Anand Electricals','bronze','https://example.com','+91 98800 66666',6);

INSERT INTO public.gallery_items (title, category, media_url, media_type, likes) VALUES
('Pandal decoration 2025','photos','https://images.unsplash.com/photo-1567591370504-c1b1a3f66c6a?w=1200','image',124),
('Ganesha idol unveiling','photos','https://images.unsplash.com/photo-1631169920665-3b8b0e5a7ede?w=1200','image',201),
('Evening aarti crowd','photos','https://images.unsplash.com/photo-1604608672516-f1b9b1a0a1d9?w=1200','image',88),
('Drone view of procession','drone','https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200','image',315),
('Cultural night highlights','cultural','https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200','image',176),
('Kabaddi finals','competitions','https://images.unsplash.com/photo-1517649763962-0c623066013b?w=1200','image',143);

INSERT INTO public.donations (donor_name, amount, message, status) VALUES
('Ramesh Shetty', 25000, 'Ganapathi Bappa Morya!', 'approved'),
('Anonymous Devotee', 15000, NULL, 'approved'),
('Kavya & Family', 11000, 'For the annadana seva', 'approved'),
('Sharma Traders', 51000, 'Best wishes to the mandal', 'approved'),
('Nikhil J', 5000, NULL, 'approved');

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;
-- Fix RLS Policies and Permissions for Full Admin Control

-- 1. FESTIVAL SETTINGS RLS & GRANTS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.festival_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.festival_settings TO anon;

DROP POLICY IF EXISTS "settings_public_read" ON public.festival_settings;
DROP POLICY IF EXISTS "settings_staff_update" ON public.festival_settings;
DROP POLICY IF EXISTS "settings_staff_all" ON public.festival_settings;

CREATE POLICY "settings_public_read" ON public.festival_settings
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "settings_staff_all" ON public.festival_settings
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- 2. USER ROLES GRANTS & RLS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
DROP POLICY IF EXISTS "roles_select_own" ON public.user_roles;
DROP POLICY IF EXISTS "roles_all" ON public.user_roles;

CREATE POLICY "roles_all" ON public.user_roles
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- 3. EVENTS RLS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
DROP POLICY IF EXISTS "events_public_read" ON public.events;
DROP POLICY IF EXISTS "events_staff_all" ON public.events;

CREATE POLICY "events_public_read" ON public.events
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "events_staff_all" ON public.events
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- 4. ANNOUNCEMENTS RLS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
DROP POLICY IF EXISTS "ann_public_read" ON public.announcements;
DROP POLICY IF EXISTS "ann_staff_all" ON public.announcements;

CREATE POLICY "ann_public_read" ON public.announcements
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "ann_staff_all" ON public.announcements
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- 5. SPONSORS RLS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sponsors TO authenticated;
DROP POLICY IF EXISTS "sponsors_public_read" ON public.sponsors;
DROP POLICY IF EXISTS "sponsors_staff_all" ON public.sponsors;

CREATE POLICY "sponsors_public_read" ON public.sponsors
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "sponsors_staff_all" ON public.sponsors
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- 6. GALLERY ITEMS RLS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gallery_items TO authenticated;
DROP POLICY IF EXISTS "gallery_public_read" ON public.gallery_items;
DROP POLICY IF EXISTS "gallery_staff_all" ON public.gallery_items;

CREATE POLICY "gallery_public_read" ON public.gallery_items
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "gallery_staff_all" ON public.gallery_items
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- 7. REGISTRATIONS RLS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.registrations TO authenticated;
DROP POLICY IF EXISTS "reg_select_own" ON public.registrations;
DROP POLICY IF EXISTS "reg_insert_own" ON public.registrations;
DROP POLICY IF EXISTS "reg_update_own" ON public.registrations;
DROP POLICY IF EXISTS "reg_delete_own" ON public.registrations;

CREATE POLICY "reg_all" ON public.registrations
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- 8. ENSURE DEFAULT FESTIVAL SETTINGS ROW EXISTS
INSERT INTO public.festival_settings (id, festival_name, start_date, end_date, upi_id, donation_goal)
VALUES (1, 'Ganapathi Festival 2026', '2026-09-14', '2026-09-24', 'mandal@upi', 500000)
ON CONFLICT (id) DO UPDATE SET festival_name = EXCLUDED.festival_name;
-- Update Volunteers Table Schema & RLS Policies for Volunteer Registration Management System

-- Add missing columns to public.volunteers if they don't exist
ALTER TABLE public.volunteers ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.volunteers ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.volunteers ADD COLUMN IF NOT EXISTS approved_at timestamptz;
ALTER TABLE public.volunteers ADD COLUMN IF NOT EXISTS approved_by text;

-- Ensure default status is 'pending'
ALTER TABLE public.volunteers ALTER COLUMN status SET DEFAULT 'pending';

-- Grants for public.volunteers
GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteers TO anon;

-- RLS Policies for public.volunteers
ALTER TABLE public.volunteers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vol_select_own" ON public.volunteers;
DROP POLICY IF EXISTS "vol_insert_own" ON public.volunteers;
DROP POLICY IF EXISTS "vol_staff_update" ON public.volunteers;
DROP POLICY IF EXISTS "vol_staff_all" ON public.volunteers;
DROP POLICY IF EXISTS "vol_all" ON public.volunteers;

-- Allow full access for volunteer applications to both anon and authenticated clients
CREATE POLICY "vol_all" ON public.volunteers FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);
-- Update Donations Schema & RLS Policies for Razorpay Gateway Integration

-- Add missing Razorpay columns to public.donations if they don't exist
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS payment_id text;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS order_id text;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS payment_signature text;

-- Grants for public.donations
GRANT SELECT, INSERT, UPDATE, DELETE ON public.donations TO authenticated;
GRANT SELECT, INSERT ON public.donations TO anon;

-- RLS Policies for public.donations
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "don_public_read_approved" ON public.donations;
DROP POLICY IF EXISTS "don_select_own" ON public.donations;
DROP POLICY IF EXISTS "don_insert_own" ON public.donations;
DROP POLICY IF EXISTS "don_insert_all" ON public.donations;
DROP POLICY IF EXISTS "don_staff_write" ON public.donations;
DROP POLICY IF EXISTS "don_staff_delete" ON public.donations;
DROP POLICY IF EXISTS "don_staff_all" ON public.donations;

-- Public can view approved donations (for leaderboard/wall of donors)
CREATE POLICY "don_public_read_approved" ON public.donations FOR SELECT TO anon, authenticated
  USING (status = 'approved' OR (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR public.is_staff(auth.uid()));

-- Anyone can submit a donation
CREATE POLICY "don_insert_all" ON public.donations FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Staff can update and delete all donations
CREATE POLICY "don_staff_all" ON public.donations FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));
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
-- Add Event Assignment Columns & RLS updates to Volunteers Table

ALTER TABLE public.volunteers ADD COLUMN IF NOT EXISTS assigned_event_id uuid REFERENCES public.events(id) ON DELETE SET NULL;
ALTER TABLE public.volunteers ADD COLUMN IF NOT EXISTS assigned_role text;
ALTER TABLE public.volunteers ADD COLUMN IF NOT EXISTS assigned_shift text;

-- RLS Updates
DROP POLICY IF EXISTS "vol_select_own" ON public.volunteers;

-- Users can view their own application by user_id or email
CREATE POLICY "vol_select_own" ON public.volunteers FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id 
    OR (email IS NOT NULL AND lower(email) = lower(auth.jwt()->>'email'))
    OR public.is_staff(auth.uid())
  );
-- Enable Supabase Realtime Change Streams on All Tables

BEGIN;
  -- Ensure publication exists
  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
      CREATE PUBLICATION supabase_realtime;
    END IF;
  END
  $$;

  -- Add all festival tables to publication
  ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.sponsors;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.gallery_items;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.donations;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.registrations;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.volunteers;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.festival_settings;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.festival_memories;
COMMIT;
-- Add gender column to volunteers table
ALTER TABLE public.volunteers ADD COLUMN IF NOT EXISTS gender text DEFAULT 'Male';
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
-- ==============================================================================
-- Migration: Atomic Sequential ID Counter Table & Function
-- Enables automatic formatted IDs (DON-000001, REG-000001, VOL-000001, EVT-000001, etc.)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.sequential_counters (
  prefix VARCHAR(20) PRIMARY KEY,
  last_value BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.sequential_counters ENABLE ROW LEVEL SECURITY;

-- Allow read/write access to counters
CREATE POLICY "Allow public counter access" ON public.sequential_counters
  FOR ALL USING (true) WITH CHECK (true);

-- Atomic SQL function to generate and return next formatted ID
CREATE OR REPLACE FUNCTION public.get_next_sequential_id(p_prefix TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next_val BIGINT;
  v_result TEXT;
BEGIN
  INSERT INTO public.sequential_counters (prefix, last_value, updated_at)
  VALUES (UPPER(p_prefix), 1, NOW())
  ON CONFLICT (prefix)
  DO UPDATE SET
    last_value = public.sequential_counters.last_value + 1,
    updated_at = NOW()
  RETURNING last_value INTO v_next_val;

  v_result := UPPER(p_prefix) || '-' || LPAD(v_next_val::TEXT, 6, '0');
  RETURN v_result;
END;
$$;

-- Grant execution to all users
GRANT EXECUTE ON FUNCTION public.get_next_sequential_id(TEXT) TO anon, authenticated, service_role;
-- Fix RLS Policies and Permissions for Volunteers Table
-- Allows both anon and authenticated users to submit volunteer applications without RLS check failures

GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteers TO anon;

ALTER TABLE public.volunteers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vol_select_own" ON public.volunteers;
DROP POLICY IF EXISTS "vol_insert_own" ON public.volunteers;
DROP POLICY IF EXISTS "vol_staff_update" ON public.volunteers;
DROP POLICY IF EXISTS "vol_staff_all" ON public.volunteers;
DROP POLICY IF EXISTS "vol_all" ON public.volunteers;

-- Allow full access for volunteer registrations to both anon and authenticated clients
CREATE POLICY "vol_all" ON public.volunteers FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);
-- Fix Foreign Key Constraint and Add Atomic Volunteer Registration Procedure

-- 1. Ensure Grants for profiles, user_roles, and volunteers
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteers TO authenticated, anon;

-- 2. Update Profiles RLS Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_all" ON public.profiles;

CREATE POLICY "profiles_all" ON public.profiles FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 3. Drop restrictive FK constraints referencing auth.users(id) and link volunteers to public.profiles(id)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;
ALTER TABLE public.volunteers DROP CONSTRAINT IF EXISTS volunteers_user_id_fkey;

-- Re-add foreign key on volunteers pointing to public.profiles(id)
ALTER TABLE public.volunteers
  ADD CONSTRAINT volunteers_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- 4. Create Atomic Stored Procedure to Register Volunteer
CREATE OR REPLACE FUNCTION public.register_volunteer(
  _user_id uuid,
  _full_name text,
  _phone text,
  _email text DEFAULT NULL,
  _gender text DEFAULT NULL,
  _address text DEFAULT NULL,
  _duty text DEFAULT NULL,
  _skills text DEFAULT NULL,
  _availability text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_vol_id uuid;
BEGIN
  -- Validate inputs
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User ID cannot be null');
  END IF;

  -- 1. Create or Update user profile to ensure valid foreign key record exists
  INSERT INTO public.profiles (id, full_name, email, phone)
  VALUES (_user_id, _full_name, _email, _phone)
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone);

  -- 2. Ensure default user role exists
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- 3. Insert into volunteers table in the same transaction
  INSERT INTO public.volunteers (
    user_id, full_name, phone, email, gender, address, duty, skills, availability, status
  )
  VALUES (
    _user_id, _full_name, _phone, _email, _gender, _address, _duty, _skills, _availability, 'pending'
  )
  RETURNING id INTO v_vol_id;

  RETURN jsonb_build_object('success', true, 'id', v_vol_id);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'You have already submitted a volunteer application.');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
-- FESTIVAL SCHEDULES TABLE
CREATE TABLE IF NOT EXISTS public.festival_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  schedule_date date NOT NULL,
  start_time time NOT NULL DEFAULT '08:00',
  end_time time,
  venue text NOT NULL DEFAULT 'Main Pandal',
  category text NOT NULL DEFAULT 'aarti',
  is_published boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.festival_schedules TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.festival_schedules TO authenticated;
GRANT ALL ON public.festival_schedules TO service_role;

ALTER TABLE public.festival_schedules ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'festival_schedules' AND policyname = 'festival_schedules_public_read'
  ) THEN
    CREATE POLICY "festival_schedules_public_read" ON public.festival_schedules FOR SELECT TO anon, authenticated USING (is_published = true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'festival_schedules' AND policyname = 'festival_schedules_staff_all'
  ) THEN
    CREATE POLICY "festival_schedules_staff_all" ON public.festival_schedules FOR ALL TO authenticated
      USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_festival_schedules_updated'
  ) THEN
    CREATE TRIGGER trg_festival_schedules_updated BEFORE UPDATE ON public.festival_schedules FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
  END IF;
END $$;

-- Enable Realtime
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.festival_schedules;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Seed default schedule items if empty
INSERT INTO public.festival_schedules (title, description, schedule_date, start_time, end_time, venue, category, is_published, sort_order)
VALUES
('Morning Maha Aarti & Sankalpa', 'Daily sacred morning ritual with Vedic chanting and stotram.', '2026-09-14', '07:30', '08:30', 'Main Sanctum', 'aarti', true, 1),
('Annadana Mahaprasadam Distribution', 'Grand community lunch serving hot prasadam to thousands of devotees.', '2026-09-14', '12:30', '15:00', 'Annadana Hall', 'prasadam', true, 2),
('Traditional Dhol Tasha Troupe Performance', 'High-energy drum Troupe salute by Shivmudra Dhol Tasha Pathak.', '2026-09-14', '17:30', '19:00', 'Mandal Entrance', 'cultural', true, 3),
('Evening Deepalankara & Grand Aarti', '1008 Lamps lighting ritual followed by devotional bhajan evening.', '2026-09-14', '19:30', '21:00', 'Main Sanctum', 'aarti', true, 4),
('Grand Visarjan Miravand (Final Procession)', 'Magnificent farewell procession with flowers, gulal and traditional beats.', '2026-09-24', '16:00', '22:00', 'Festival Route', 'visarjan', true, 5)
ON CONFLICT DO NOTHING;
-- Migration: Add Mini Admin Role & Configure Granular Permissions
-- Description: Adds 'mini_admin' to app_role enum, updates helper functions, and configures RLS policies
-- Permitted sections for Mini Admin: Festival Schedule, Upcoming Events, Announcements, Media Gallery

-- 1. ADD 'mini_admin' TO app_role ENUM SAFELY
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
    WHERE pg_type.typname = 'app_role' AND pg_enum.enumlabel = 'mini_admin'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'mini_admin';
  END IF;
END $$;

-- 2. HELPER FUNCTIONS FOR ROLE CHECKS (uses role::text to avoid PG 55P04 enum transaction locks)

-- Allows Admin, Organizer, or Mini Admin into the Control Center
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id 
    AND role::text IN ('admin', 'organizer', 'mini_admin')
  )
$$;

-- Check if user is Mini Admin specifically
CREATE OR REPLACE FUNCTION public.is_mini_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id 
    AND role::text = 'mini_admin'
  )
$$;

-- Check if user is Full Admin / Organizer
CREATE OR REPLACE FUNCTION public.is_full_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id 
    AND role::text IN ('admin', 'organizer')
  )
$$;

-- 3. RLS POLICIES FOR MINI ADMIN CONTENT SECTIONS

-- A. Festival Schedules (Allowed for Mini Admin & Full Admin)
ALTER TABLE public.festival_schedules ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.festival_schedules TO authenticated;
GRANT SELECT ON public.festival_schedules TO anon;

DROP POLICY IF EXISTS "schedules_public_read" ON public.festival_schedules;
DROP POLICY IF EXISTS "schedules_staff_all" ON public.festival_schedules;

CREATE POLICY "schedules_public_read" ON public.festival_schedules
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "schedules_staff_all" ON public.festival_schedules
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

-- B. Upcoming Events (Allowed for Mini Admin & Full Admin)
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT SELECT ON public.events TO anon;

DROP POLICY IF EXISTS "events_public_read" ON public.events;
DROP POLICY IF EXISTS "events_staff_all" ON public.events;

CREATE POLICY "events_public_read" ON public.events
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "events_staff_all" ON public.events
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

-- C. Announcements & Notices (Allowed for Mini Admin & Full Admin)
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT SELECT ON public.announcements TO anon;

DROP POLICY IF EXISTS "ann_public_read" ON public.announcements;
DROP POLICY IF EXISTS "ann_staff_all" ON public.announcements;

CREATE POLICY "ann_public_read" ON public.announcements
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "ann_staff_all" ON public.announcements
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

-- D. Media Gallery (Allowed for Mini Admin & Full Admin)
ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gallery_items TO authenticated;
GRANT SELECT ON public.gallery_items TO anon;

DROP POLICY IF EXISTS "gallery_public_read" ON public.gallery_items;
DROP POLICY IF EXISTS "gallery_staff_all" ON public.gallery_items;

CREATE POLICY "gallery_public_read" ON public.gallery_items
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "gallery_staff_all" ON public.gallery_items
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

-- 4. RESTRICTED RLS POLICIES (FULL ADMIN ONLY)

-- User Roles: Only Full Admin can assign or change roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;

DROP POLICY IF EXISTS "roles_select_own" ON public.user_roles;
DROP POLICY IF EXISTS "roles_all" ON public.user_roles;

CREATE POLICY "roles_read_staff" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_staff(auth.uid()));

CREATE POLICY "roles_write_full_admin" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.is_full_admin(auth.uid()))
  WITH CHECK (public.is_full_admin(auth.uid()));

-- Festival Settings: Only Full Admin can alter core site settings & bank/UPI details
ALTER TABLE public.festival_settings ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.festival_settings TO authenticated;
GRANT SELECT ON public.festival_settings TO anon;

DROP POLICY IF EXISTS "settings_public_read" ON public.festival_settings;
DROP POLICY IF EXISTS "settings_staff_all" ON public.festival_settings;

CREATE POLICY "settings_public_read" ON public.festival_settings
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "settings_write_full_admin" ON public.festival_settings
  FOR ALL TO authenticated
  USING (public.is_full_admin(auth.uid()))
  WITH CHECK (public.is_full_admin(auth.uid()));
-- MIGRATION: Manual UPI Payment System Schema Updates

-- 1. Update festival_settings for Admin UPI Management
ALTER TABLE public.festival_settings ADD COLUMN IF NOT EXISTS upi_qr_url text;
ALTER TABLE public.festival_settings ADD COLUMN IF NOT EXISTS merchant_name text DEFAULT 'Sri Ganapathi Mandal Trust';
ALTER TABLE public.festival_settings ADD COLUMN IF NOT EXISTS manual_upi_enabled boolean NOT NULL DEFAULT true;

-- Update default upi_id and merchant_name if empty
UPDATE public.festival_settings
SET upi_id = COALESCE(NULLIF(upi_id, ''), 'ganapathimandal@upi'),
    merchant_name = COALESCE(NULLIF(merchant_name, ''), 'Sri Ganapathi Mandal Trust'),
    manual_upi_enabled = true
WHERE id = 1;

-- 2. Update donations table
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS reference_no text;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS utr_number text;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS screenshot_url text;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'upi';
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS admin_notes text;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS verified_at timestamptz;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Populate reference_no for existing donations if empty
UPDATE public.donations
SET reference_no = 'DON-2026-' || LPAD(SUBSTRING(id::text FROM 1 FOR 6), 6, '0')
WHERE reference_no IS NULL;

-- Make reference_no unique where set
CREATE UNIQUE INDEX IF NOT EXISTS idx_donations_reference_no ON public.donations(reference_no) WHERE reference_no IS NOT NULL;

-- Create partial unique index on utr_number to prevent duplicate pending/received submissions
CREATE UNIQUE INDEX IF NOT EXISTS idx_donations_utr_unique ON public.donations(UPPER(TRIM(utr_number))) 
WHERE utr_number IS NOT NULL AND status != 'rejected';

-- 3. Update registrations table
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS reference_no text;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'free';
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS utr_number text;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS screenshot_url text;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'completed';
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS admin_notes text;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS verified_at timestamptz;

-- Populate reference_no for existing registrations if empty
UPDATE public.registrations
SET reference_no = 'REG-2026-' || LPAD(SUBSTRING(id::text FROM 1 FOR 6), 6, '0')
WHERE reference_no IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_registrations_reference_no ON public.registrations(reference_no) WHERE reference_no IS NOT NULL;

-- 4. RLS & Permissions for Donations
GRANT SELECT, INSERT, UPDATE, DELETE ON public.donations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.donations TO anon;

ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "don_public_read_approved" ON public.donations;
DROP POLICY IF EXISTS "don_select_own" ON public.donations;
DROP POLICY IF EXISTS "don_insert_all" ON public.donations;
DROP POLICY IF EXISTS "don_staff_all" ON public.donations;
DROP POLICY IF EXISTS "don_update_own" ON public.donations;

-- Anyone can read approved/received donations or their own donations
CREATE POLICY "don_read_policy" ON public.donations FOR SELECT TO anon, authenticated
  USING (
    status IN ('approved', 'received') 
    OR (auth.uid() IS NOT NULL AND auth.uid() = user_id) 
    OR public.is_staff(auth.uid())
  );

-- Anyone can insert a donation (guest or authenticated)
CREATE POLICY "don_insert_policy" ON public.donations FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Donors can update their own donation to resubmit UTR if rejected
CREATE POLICY "don_update_own_policy" ON public.donations FOR UPDATE TO anon, authenticated
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id) 
    OR public.is_staff(auth.uid())
  )
  WITH CHECK (true);

-- Staff full access on donations
CREATE POLICY "don_staff_all_policy" ON public.donations FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

-- 5. Storage Bucket for Payment Screenshots & QR Code Uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-proofs',
  'payment-proofs',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage bucket policies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'payment_proofs_public_read'
  ) THEN
    CREATE POLICY "payment_proofs_public_read" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'payment-proofs');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'payment_proofs_public_insert'
  ) THEN
    CREATE POLICY "payment_proofs_public_insert" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'payment-proofs');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'payment_proofs_staff_all'
  ) THEN
    CREATE POLICY "payment_proofs_staff_all" ON storage.objects FOR ALL TO authenticated
      USING (bucket_id = 'payment-proofs' AND public.is_staff(auth.uid()))
      WITH CHECK (bucket_id = 'payment-proofs' AND public.is_staff(auth.uid()));
  END IF;
END $$;
-- ============================================================================
-- FULL SUPABASE REALTIME CONFIGURATION SCRIPT
-- Enables Realtime (CDC - Change Data Capture) for all tables with REPLICA IDENTITY FULL
-- ============================================================================

BEGIN;

  -- 1. Create supabase_realtime publication if it doesn't already exist
  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
      CREATE PUBLICATION supabase_realtime;
    END IF;
  END
  $$;

  -- 2. Set REPLICA IDENTITY to FULL for all application tables
  -- (Ensures INSERT, UPDATE, and DELETE real-time payloads include all row data)
  ALTER TABLE public.announcements REPLICA IDENTITY FULL;
  ALTER TABLE public.donations REPLICA IDENTITY FULL;
  ALTER TABLE public.events REPLICA IDENTITY FULL;
  ALTER TABLE public.festival_memories REPLICA IDENTITY FULL;
  ALTER TABLE public.festival_settings REPLICA IDENTITY FULL;
  ALTER TABLE public.gallery_items REPLICA IDENTITY FULL;
  ALTER TABLE public.profiles REPLICA IDENTITY FULL;
  ALTER TABLE public.registrations REPLICA IDENTITY FULL;
  ALTER TABLE public.sponsors REPLICA IDENTITY FULL;
  ALTER TABLE public.user_roles REPLICA IDENTITY FULL;
  ALTER TABLE public.volunteers REPLICA IDENTITY FULL;

  -- 3. Safely add tables to publication if they are not already in supabase_realtime
  DO $$
  DECLARE
    tbl text;
    tbls text[] := ARRAY[
      'announcements',
      'donations',
      'events',
      'festival_memories',
      'festival_settings',
      'gallery_items',
      'profiles',
      'registrations',
      'sponsors',
      'user_roles',
      'volunteers'
    ];
  BEGIN
    FOREACH tbl IN ARRAY tbls LOOP
      IF EXISTS (
        SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl
      ) THEN
        IF NOT EXISTS (
          SELECT 1 
          FROM pg_publication_tables 
          WHERE pubname = 'supabase_realtime' 
            AND schemaname = 'public' 
            AND tablename = tbl
        ) THEN
          EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl);
        END IF;
      END IF;
    END LOOP;
  END
  $$;

COMMIT;

-- 4. Verification query: Run this to confirm which tables are enabled for Realtime
SELECT pubname, schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
-- Create Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    url TEXT DEFAULT 'https://shanthiganapthi-2026.web.app',
    icon TEXT DEFAULT 'https://shanthiganapthi-2026.web.app/favicon.png',
    sent_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    sent_count INTEGER DEFAULT 0
);

-- Create User Notification Reads Table (Tracks read status per user)
CREATE TABLE IF NOT EXISTS public.user_notification_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    read_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT user_notification_reads_unique UNIQUE (notification_id, user_id)
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notification_reads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflict
DROP POLICY IF EXISTS "Anyone can view notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users can update notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users can delete notifications" ON public.notifications;
DROP POLICY IF EXISTS "Full access to notifications" ON public.notifications;

DROP POLICY IF EXISTS "Users can view read statuses" ON public.user_notification_reads;
DROP POLICY IF EXISTS "Users can mark notifications as read" ON public.user_notification_reads;
DROP POLICY IF EXISTS "Users can delete read statuses" ON public.user_notification_reads;
DROP POLICY IF EXISTS "Full access to notification reads" ON public.user_notification_reads;

-- Create Policies
CREATE POLICY "Anyone can view notifications"
    ON public.notifications
    FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can insert notifications"
    ON public.notifications
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update notifications"
    ON public.notifications
    FOR UPDATE
    USING (true);

CREATE POLICY "Authenticated users can delete notifications"
    ON public.notifications
    FOR DELETE
    USING (true);

CREATE POLICY "Users can view read statuses"
    ON public.user_notification_reads
    FOR SELECT
    USING (true);

CREATE POLICY "Users can mark notifications as read"
    ON public.user_notification_reads
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can update read statuses"
    ON public.user_notification_reads
    FOR UPDATE
    USING (true);

CREATE POLICY "Users can delete read statuses"
    ON public.user_notification_reads
    FOR DELETE
    USING (true);

-- Add to Realtime Publication if not already added
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
-- Create storage buckets for app assets if they don't exist
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('avatars', 'avatars', true),
    ('gallery', 'gallery', true),
    ('payment-proofs', 'payment-proofs', true),
    ('posters', 'posters', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage security policies
-- 1. Avatars
CREATE POLICY "Public Read Avatars" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated Upload Avatars" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "User Update Avatars" ON storage.objects
    FOR UPDATE USING (bucket_id = 'avatars');

-- 2. Gallery
CREATE POLICY "Public Read Gallery" ON storage.objects
    FOR SELECT USING (bucket_id = 'gallery');

CREATE POLICY "Admin Upload Gallery" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'gallery');

-- 3. Payment Proofs
CREATE POLICY "Public Read Payment Proofs" ON storage.objects
    FOR SELECT USING (bucket_id = 'payment-proofs');

CREATE POLICY "Anyone Upload Payment Proofs" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'payment-proofs');

-- 4. Posters
CREATE POLICY "Public Read Posters" ON storage.objects
    FOR SELECT USING (bucket_id = 'posters');

CREATE POLICY "Admin Upload Posters" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'posters');
-- Update handle_new_user trigger to populate profiles and assign default roles (including admin for main admin email)
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone')
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    updated_at = now();

  -- Automatically grant admin role to primary admin email
  IF LOWER(COALESCE(NEW.email, '')) = 'pavandimpu30@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END; $$;

-- Re-attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- Clear all sample/demo seed data from the production database
TRUNCATE TABLE public.events CASCADE;
TRUNCATE TABLE public.announcements CASCADE;
TRUNCATE TABLE public.sponsors CASCADE;
TRUNCATE TABLE public.gallery_items CASCADE;
TRUNCATE TABLE public.donations CASCADE;
TRUNCATE TABLE public.registrations CASCADE;
TRUNCATE TABLE public.volunteers CASCADE;
TRUNCATE TABLE public.festival_memories CASCADE;
TRUNCATE TABLE public.festival_schedules CASCADE;
TRUNCATE TABLE public.notifications CASCADE;
TRUNCATE TABLE public.user_notification_reads CASCADE;

-- Reset festival_settings to clean initial state for Admin customization
UPDATE public.festival_settings
SET 
  festival_name = 'SHANTHI MAHA GANAPATHI 2026',
  start_date = '2026-09-14',
  end_date = '2026-09-24',
  live_stream_url = NULL,
  upi_id = NULL,
  donation_goal = 500000,
  contact_phone = NULL,
  contact_email = NULL,
  address = NULL
WHERE id = 1;
-- Safely ensure all 12 public tables are in the supabase_realtime publication
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'events', 'announcements', 'sponsors', 'gallery_items', 
    'donations', 'registrations', 'volunteers', 'festival_memories', 
    'festival_schedules', 'festival_settings', 'notifications', 'user_notification_reads'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl);
    EXCEPTION WHEN duplicate_object THEN
      -- Table is already in publication, ignore
      NULL;
    END;
  END LOOP;
END $$;
-- Clear all notification records and user read tracking from the production database
TRUNCATE TABLE public.notifications CASCADE;
TRUNCATE TABLE public.user_notification_reads CASCADE;
