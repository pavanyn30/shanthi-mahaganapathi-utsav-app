-- END-TO-END SECURITY HARDENING MIGRATION
-- Enforces Row Level Security, Admin Privilege Verification, and Input Validation Triggers

-- 1. Enforce Row Level Security on all core tables
ALTER TABLE IF EXISTS public.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.festival_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.festival_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.splash_screens ENABLE ROW LEVEL SECURITY;

-- 2. User Roles Table Protection (Only full admins can mutate roles)
DROP POLICY IF EXISTS "roles_read_own_or_staff" ON public.user_roles;
DROP POLICY IF EXISTS "roles_admin_manage" ON public.user_roles;

CREATE POLICY "roles_read_own_or_staff" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE POLICY "roles_admin_manage" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.is_full_admin(auth.uid()))
  WITH CHECK (public.is_full_admin(auth.uid()));

-- 3. Donation Status Change Protection Trigger
CREATE OR REPLACE FUNCTION public.check_donation_update_security()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF (OLD.status IS DISTINCT FROM NEW.status OR OLD.verified_at IS DISTINCT FROM NEW.verified_at OR OLD.verified_by IS DISTINCT FROM NEW.verified_by) THEN
    IF NOT public.is_staff(auth.uid()) THEN
      RAISE EXCEPTION 'Unauthorized: Only staff members can verify or change donation status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_donation_update_security ON public.donations;
CREATE TRIGGER trg_check_donation_update_security
  BEFORE UPDATE ON public.donations
  FOR EACH ROW
  EXECUTE FUNCTION public.check_donation_update_security();

-- 4. Push Subscriptions RLS Protection
DROP POLICY IF EXISTS "push_sub_insert" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_sub_read_staff" ON public.push_subscriptions;

CREATE POLICY "push_sub_insert" ON public.push_subscriptions
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "push_sub_read_staff" ON public.push_subscriptions
  FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

-- 5. Notifications Table Protection
DROP POLICY IF EXISTS "notif_public_read" ON public.notifications;
DROP POLICY IF EXISTS "notif_staff_write" ON public.notifications;

CREATE POLICY "notif_public_read" ON public.notifications
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "notif_staff_write" ON public.notifications
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));
