-- Update Donations Schema & RLS Policies for Razorpay Gateway Integration

-- Add missing Razorpay columns to public.donations if they don't exist
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS payment_id text;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS order_id text;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS payment_signature text;

-- Grants for public.donations
GRANT SELECT, INSERT, UPDATE, DELETE ON public.donations TO authenticated;
GRANT SELECT, INSERT ON public.donations TO anon;

-- RLS Policies for public.donations
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "don_public_read_approved" ON public.donations;
DROP POLICY IF EXISTS "don_select_own" ON public.donations;
DROP POLICY IF EXISTS "don_insert_own" ON public.donations;
DROP POLICY IF EXISTS "don_insert_all" ON public.donations;
DROP POLICY IF EXISTS "don_staff_write" ON public.donations;
DROP POLICY IF EXISTS "don_staff_delete" ON public.donations;
DROP POLICY IF EXISTS "don_staff_all" ON public.donations;

-- Public can view approved donations (for leaderboard/wall of donors)
CREATE POLICY "don_public_read_approved" ON public.donations FOR SELECT TO anon, authenticated
  USING (status = 'approved' OR (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR public.is_staff(auth.uid()));

-- Anyone can submit a donation
CREATE POLICY "don_insert_all" ON public.donations FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Staff can update and delete all donations
CREATE POLICY "don_staff_all" ON public.donations FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));
