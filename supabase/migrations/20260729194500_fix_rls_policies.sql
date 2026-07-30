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
