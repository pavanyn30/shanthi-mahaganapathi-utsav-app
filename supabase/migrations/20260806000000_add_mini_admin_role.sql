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
