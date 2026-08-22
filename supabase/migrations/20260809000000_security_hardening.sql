-- SECURITY HARDENING MIGRATION
-- Enhances RLS Policies & Verification Checks to prevent unauthorized status changes & exploits

-- 1. Ensure RLS is active on all core tables
ALTER TABLE IF EXISTS public.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.festival_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.festival_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;

-- 2. Restrict non-staff updates on donations (Prevent users from marking their own donation as 'received' or 'approved')
CREATE OR REPLACE FUNCTION public.check_donation_update_security()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If status, verified_at, or verified_by is being changed, require staff privileges
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

-- 3. Push Subscriptions Protection (Users can only read/manage their own push subscription)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'push_subscriptions') THEN
    EXECUTE 'ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE ON public.push_subscriptions TO anon';
    EXECUTE 'DROP POLICY IF EXISTS "push_sub_all" ON public.push_subscriptions';
    EXECUTE 'CREATE POLICY "push_sub_insert" ON public.push_subscriptions FOR INSERT TO anon, authenticated WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "push_sub_read_staff" ON public.push_subscriptions FOR SELECT TO authenticated USING (public.is_staff(auth.uid()))';
  END IF;
END $$;

-- 4. Notification History Protection (Only staff can send/broadcast notifications)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.notifications TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.notifications TO authenticated;

DROP POLICY IF EXISTS "notif_public_read" ON public.notifications;
DROP POLICY IF EXISTS "notif_staff_write" ON public.notifications;

CREATE POLICY "notif_public_read" ON public.notifications FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "notif_staff_write" ON public.notifications FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

