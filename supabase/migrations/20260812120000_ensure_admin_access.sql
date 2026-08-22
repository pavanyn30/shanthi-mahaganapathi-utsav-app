-- Migration: Ensure full admin access for pavandimpu30@gmail.com
DO $$
DECLARE
  target_user_id uuid;
BEGIN
  -- 1. Insert admin role for any existing user with email pavandimpu30@gmail.com in auth.users
  SELECT id INTO target_user_id FROM auth.users WHERE LOWER(email) = 'pavandimpu30@gmail.com' LIMIT 1;
  
  IF target_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Ensure profile exists
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (target_user_id, 'pavandimpu30@gmail.com', 'Pavan (Admin)')
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  END IF;
END $$;

-- 2. Trigger fallback to auto-grant admin role whenever pavandimpu30@gmail.com registers or signs in
CREATE OR REPLACE FUNCTION public.grant_admin_on_login() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF LOWER(COALESCE(NEW.email, '')) = 'pavandimpu30@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_admin_user_created ON auth.users;
CREATE TRIGGER on_admin_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.grant_admin_on_login();
