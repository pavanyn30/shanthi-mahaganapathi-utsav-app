-- MIGRATION: Manual UPI Payment System Schema Updates

-- 1. Update festival_settings for Admin UPI Management
ALTER TABLE public.festival_settings ADD COLUMN IF NOT EXISTS upi_qr_url text;
ALTER TABLE public.festival_settings ADD COLUMN IF NOT EXISTS merchant_name text DEFAULT 'Sri Ganapathi Mandal Trust';
ALTER TABLE public.festival_settings ADD COLUMN IF NOT EXISTS manual_upi_enabled boolean NOT NULL DEFAULT true;

-- Update default upi_id and merchant_name if empty
UPDATE public.festival_settings
SET upi_id = COALESCE(NULLIF(upi_id, ''), 'ganapathimandal@upi'),
    merchant_name = COALESCE(NULLIF(merchant_name, ''), 'Sri Ganapathi Mandal Trust'),
    manual_upi_enabled = true
WHERE id = 1;

-- 2. Update donations table
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS reference_no text;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS utr_number text;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS screenshot_url text;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'upi';
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS admin_notes text;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS verified_at timestamptz;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Populate reference_no for existing donations if empty
UPDATE public.donations
SET reference_no = 'DON-2026-' || LPAD(SUBSTRING(id::text FROM 1 FOR 6), 6, '0')
WHERE reference_no IS NULL;

-- Make reference_no unique where set
CREATE UNIQUE INDEX IF NOT EXISTS idx_donations_reference_no ON public.donations(reference_no) WHERE reference_no IS NOT NULL;

-- Create partial unique index on utr_number to prevent duplicate pending/received submissions
CREATE UNIQUE INDEX IF NOT EXISTS idx_donations_utr_unique ON public.donations(UPPER(TRIM(utr_number))) 
WHERE utr_number IS NOT NULL AND status != 'rejected';

-- 3. Update registrations table
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS reference_no text;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'free';
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS utr_number text;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS screenshot_url text;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'completed';
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS admin_notes text;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS verified_at timestamptz;

-- Populate reference_no for existing registrations if empty
UPDATE public.registrations
SET reference_no = 'REG-2026-' || LPAD(SUBSTRING(id::text FROM 1 FOR 6), 6, '0')
WHERE reference_no IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_registrations_reference_no ON public.registrations(reference_no) WHERE reference_no IS NOT NULL;

-- 4. RLS & Permissions for Donations
GRANT SELECT, INSERT, UPDATE, DELETE ON public.donations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.donations TO anon;

ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "don_public_read_approved" ON public.donations;
DROP POLICY IF EXISTS "don_select_own" ON public.donations;
DROP POLICY IF EXISTS "don_insert_all" ON public.donations;
DROP POLICY IF EXISTS "don_staff_all" ON public.donations;
DROP POLICY IF EXISTS "don_update_own" ON public.donations;

-- Anyone can read approved/received donations or their own donations
CREATE POLICY "don_read_policy" ON public.donations FOR SELECT TO anon, authenticated
  USING (
    status IN ('approved', 'received') 
    OR (auth.uid() IS NOT NULL AND auth.uid() = user_id) 
    OR public.is_staff(auth.uid())
  );

-- Anyone can insert a donation (guest or authenticated)
CREATE POLICY "don_insert_policy" ON public.donations FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Donors can update their own donation to resubmit UTR if rejected
CREATE POLICY "don_update_own_policy" ON public.donations FOR UPDATE TO anon, authenticated
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id) 
    OR public.is_staff(auth.uid())
  )
  WITH CHECK (true);

-- Staff full access on donations
CREATE POLICY "don_staff_all_policy" ON public.donations FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

-- 5. Storage Bucket for Payment Screenshots & QR Code Uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-proofs',
  'payment-proofs',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage bucket policies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'payment_proofs_public_read'
  ) THEN
    CREATE POLICY "payment_proofs_public_read" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'payment-proofs');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'payment_proofs_public_insert'
  ) THEN
    CREATE POLICY "payment_proofs_public_insert" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'payment-proofs');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'payment_proofs_staff_all'
  ) THEN
    CREATE POLICY "payment_proofs_staff_all" ON storage.objects FOR ALL TO authenticated
      USING (bucket_id = 'payment-proofs' AND public.is_staff(auth.uid()))
      WITH CHECK (bucket_id = 'payment-proofs' AND public.is_staff(auth.uid()));
  END IF;
END $$;
