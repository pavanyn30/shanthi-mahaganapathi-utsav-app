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
