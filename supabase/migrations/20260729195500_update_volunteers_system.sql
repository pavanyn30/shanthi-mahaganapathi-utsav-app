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

-- RLS Policies for public.volunteers
ALTER TABLE public.volunteers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vol_select_own" ON public.volunteers;
DROP POLICY IF EXISTS "vol_insert_own" ON public.volunteers;
DROP POLICY IF EXISTS "vol_staff_update" ON public.volunteers;
DROP POLICY IF EXISTS "vol_staff_all" ON public.volunteers;

-- Users can view their own application, staff can view all
CREATE POLICY "vol_select_own" ON public.volunteers FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_staff(auth.uid()));

-- Users can insert their own application
CREATE POLICY "vol_insert_own" ON public.volunteers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Staff can update or delete all applications
CREATE POLICY "vol_staff_all" ON public.volunteers FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));
