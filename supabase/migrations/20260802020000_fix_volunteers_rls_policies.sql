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
