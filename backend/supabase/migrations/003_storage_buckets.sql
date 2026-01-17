-- ============================================================
-- Security Guard HRM SaaS - Storage Buckets Setup
-- Version: 1.0.1 (Fixed to use public schema functions)
-- Run this AFTER 002_rls_policies.sql
-- ============================================================

-- ============================================================
-- CREATE STORAGE BUCKETS
-- ============================================================

-- Profile images bucket (public for display)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'profile-images',
    'profile-images',
    true,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Company logos bucket (public for display)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'company-logos',
    'company-logos',
    true,
    2097152, -- 2MB limit
    ARRAY['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Documents bucket (private - certifications, leave docs)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'documents',
    'documents',
    false,
    10485760, -- 10MB limit
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- STORAGE POLICIES - Profile Images
-- ============================================================

-- Anyone can view profile images (public bucket)
CREATE POLICY "Public profile images are viewable by everyone"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-images');

-- Authenticated users can upload profile images
CREATE POLICY "Users can upload profile image"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile-images');

-- Users can update profile images
CREATE POLICY "Users can update profile image"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'profile-images');

-- Users can delete profile images
CREATE POLICY "Users can delete profile image"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'profile-images');

-- ============================================================
-- STORAGE POLICIES - Company Logos
-- ============================================================

-- Anyone can view company logos (public bucket)
CREATE POLICY "Public company logos are viewable by everyone"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-logos');

-- Authenticated users can upload company logo
CREATE POLICY "Users can upload company logo"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'company-logos');

-- Authenticated users can update company logo
CREATE POLICY "Users can update company logo"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'company-logos');

-- ============================================================
-- STORAGE POLICIES - Documents (Private)
-- ============================================================

-- Authenticated users can view documents
CREATE POLICY "Users can view documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents');

-- Authenticated users can upload documents
CREATE POLICY "Users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Authenticated users can update documents
CREATE POLICY "Users can update documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'documents');

-- Authenticated users can delete documents
CREATE POLICY "Users can delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents');

-- ============================================================
-- SUCCESS MESSAGE
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Storage buckets created successfully!';
    RAISE NOTICE 'Buckets: profile-images, company-logos, documents';
END $$;
