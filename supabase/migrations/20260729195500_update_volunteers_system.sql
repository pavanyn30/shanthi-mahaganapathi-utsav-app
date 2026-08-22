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
