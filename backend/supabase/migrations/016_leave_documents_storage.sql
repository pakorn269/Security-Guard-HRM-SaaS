-- ============================================================
-- Security Guard HRM SaaS - Leave Documents Storage Setup
-- Version: 1.0.0
-- Purpose: Add specific bucket and RLS policies for leave documents
-- ============================================================

-- ============================================================
-- CREATE LEAVE DOCUMENTS BUCKET
-- ============================================================

-- Leave documents bucket (private - medical certs, leave supporting docs)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'leave-documents',
    'leave-documents',
    false,
    5242880, -- 5MB limit
    ARRAY['application/pdf', 'image/jpeg', 'image/png']
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- STORAGE POLICIES - Leave Documents (Company Isolated)
-- ============================================================

-- Users can upload leave documents for their company only
-- Path format: {companyId}/{leaveRequestId}/{filename}
CREATE POLICY "Users can upload own company leave documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'leave-documents'
    AND (storage.foldername(name))[1] = (auth.jwt() -> 'company_id')::text
);

-- Users can view leave documents from their company only
CREATE POLICY "Users can view own company leave documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'leave-documents'
    AND (storage.foldername(name))[1] = (auth.jwt() -> 'company_id')::text
);

-- Users can update leave documents from their company only
CREATE POLICY "Users can update own company leave documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'leave-documents'
    AND (storage.foldername(name))[1] = (auth.jwt() -> 'company_id')::text
);

-- Users can delete leave documents from their company only
-- Additional check: Only managers/admins can delete (enforced in application layer)
CREATE POLICY "Users can delete own company leave documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'leave-documents'
    AND (storage.foldername(name))[1] = (auth.jwt() -> 'company_id')::text
);

-- ============================================================
-- SUCCESS MESSAGE
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Leave documents storage bucket created successfully!';
    RAISE NOTICE 'Bucket: leave-documents';
    RAISE NOTICE 'File size limit: 5MB';
    RAISE NOTICE 'Allowed types: PDF, JPG, PNG';
    RAISE NOTICE 'RLS policies: Company-isolated access';
END $$;
