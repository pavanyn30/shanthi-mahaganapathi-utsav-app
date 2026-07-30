
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
VALUES (1, 'https://www.youtube.com/embed/videoseries?list=PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI', 'ganapathimandal@upi', '+91 98860 12345', 'info@ganapathifest.in', 'Sri Ganapathi Mandal, Main Road, Bengaluru 560001');

-- SAMPLE DATA
INSERT INTO public.events (name, slug, description, category, event_date, start_time, venue, max_participants, entry_fee, rules, prize_details, age_min, age_max, team_size, organizer_name, organizer_phone) VALUES
('Classical Dance Competition','dance','Solo and group classical & folk dance showcase on the main stage.','cultural','2026-09-15','17:00','Main Stage',60,100,'Max 5 minutes per performance. Own music track on pen drive.','1st ₹5000, 2nd ₹3000, 3rd ₹2000',6,25,1,'Meera Rao','+91 98860 11111'),
('Singing Competition','singing','Devotional and film songs. Karaoke allowed.','cultural','2026-09-16','18:00','Main Stage',50,100,'One song, max 4 minutes. No lyrics sheet on stage.','1st ₹4000, 2nd ₹2500, 3rd ₹1500',8,40,1,'Suresh K','+91 98860 22222'),
('Drawing & Colouring','drawing','Theme based drawing contest for kids in three age groups.','kids','2026-09-16','10:00','Community Hall',120,0,'Bring your own colours. Paper provided.','Trophies + certificates for all',4,15,1,'Anitha S','+91 98860 33333'),
('Rangoli Contest','rangoli','Traditional rangoli around the pandal entrance.','cultural','2026-09-17','07:00','Pandal Entrance',40,50,'Bring your own colours. 2 hour limit.','1st ₹3000, 2nd ₹2000',12,60,2,'Lakshmi B','+91 98860 44444'),
('Street Cricket Tournament','cricket','Tennis ball knockout tournament, 6 overs per side.','sports','2026-09-18','08:00','Ground No. 2',96,600,'8 players per team. Umpire decision final.','Winner ₹15000 + Trophy',14,35,8,'Ravi Kumar','+91 98860 55555'),
('Kabaddi Championship','kabaddi','Traditional kabaddi matches under floodlights.','sports','2026-09-19','19:00','Ground No. 1',84,500,'7 players + 3 substitutes. Standard rules.','Winner ₹12000, Runner Up ₹6000',16,40,7,'Manju Gowda','+91 98860 66666'),
('General Knowledge Quiz','quiz','Three round quiz on culture, sports and current affairs.','indoor','2026-09-19','16:00','Community Hall',60,50,'Teams of 2. No mobile phones.','1st ₹4000, 2nd ₹2000',10,30,2,'Prakash N','+91 98860 77777'),
('BGMI Tournament','bgmi','Squad mode battle royale on the big screen.','esports','2026-09-20','14:00','Gaming Zone',64,200,'Own device required. No emulators.','Winner squad ₹10000',14,30,4,'Karthik','+91 98860 88888'),
('Free Fire Tournament','free-fire','Clash squad tournament, best of three.','esports','2026-09-20','18:00','Gaming Zone',48,150,'No hacks. Screen recording mandatory.','Winner squad ₹8000',14,30,4,'Karthik','+91 98860 88888'),
('Fancy Dress','fancy-dress','Kids dress up as mythological and freedom fighter characters.','kids','2026-09-21','17:00','Main Stage',80,0,'Two minutes per child including intro.','Medals + gift hampers',3,12,1,'Deepa R','+91 98860 99999'),
('Cooking Without Fire','cooking','Creative no-fire recipes judged on taste and presentation.','indoor','2026-09-22','11:00','Community Hall',40,100,'Bring your own ingredients and utensils.','1st ₹3000, 2nd ₹1500',15,60,2,'Shobha M','+91 98860 10101'),
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
