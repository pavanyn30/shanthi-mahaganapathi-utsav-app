-- Ensure gallery, payment-proofs, and posters storage buckets exist and allow fast public uploads
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('gallery', 'gallery', true),
    ('payment-proofs', 'payment-proofs', true),
    ('posters', 'posters', true),
    ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop old storage policies if existing
DROP POLICY IF EXISTS "Public Read Gallery" ON storage.objects;
DROP POLICY IF EXISTS "Public Insert Gallery" ON storage.objects;
DROP POLICY IF EXISTS "Public Update Gallery" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete Gallery" ON storage.objects;

-- Create permissive storage policies for fast media CDN uploads
CREATE POLICY "Public Read Gallery" ON storage.objects
    FOR SELECT USING (bucket_id = 'gallery');

CREATE POLICY "Public Insert Gallery" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'gallery');

CREATE POLICY "Public Update Gallery" ON storage.objects
    FOR UPDATE USING (bucket_id = 'gallery');

CREATE POLICY "Public Delete Gallery" ON storage.objects
    FOR DELETE USING (bucket_id = 'gallery');
