-- Create storage buckets for app assets if they don't exist
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('avatars', 'avatars', true),
    ('gallery', 'gallery', true),
    ('payment-proofs', 'payment-proofs', true),
    ('posters', 'posters', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage security policies
-- 1. Avatars
CREATE POLICY "Public Read Avatars" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated Upload Avatars" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "User Update Avatars" ON storage.objects
    FOR UPDATE USING (bucket_id = 'avatars');

-- 2. Gallery
CREATE POLICY "Public Read Gallery" ON storage.objects
    FOR SELECT USING (bucket_id = 'gallery');

CREATE POLICY "Admin Upload Gallery" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'gallery');

-- 3. Payment Proofs
CREATE POLICY "Public Read Payment Proofs" ON storage.objects
    FOR SELECT USING (bucket_id = 'payment-proofs');

CREATE POLICY "Anyone Upload Payment Proofs" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'payment-proofs');

-- 4. Posters
CREATE POLICY "Public Read Posters" ON storage.objects
    FOR SELECT USING (bucket_id = 'posters');

CREATE POLICY "Admin Upload Posters" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'posters');
