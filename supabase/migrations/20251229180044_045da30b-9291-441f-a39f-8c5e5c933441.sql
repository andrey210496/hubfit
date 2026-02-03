-- Fix storage bucket security: Make bucket private and add company-scoped policies

-- 1. Make the 'files' bucket private
UPDATE storage.buckets SET public = false WHERE id = 'files';

-- 2. Drop existing overly permissive policies
DROP POLICY IF EXISTS "Users can view files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload files to their company folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their company files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their company files" ON storage.objects;

-- 3. Create new company-scoped SELECT policy
-- Files should be stored with company_id as the first folder: files/{company_id}/{filename}
CREATE POLICY "Users can view their company files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'files' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM profiles WHERE user_id = auth.uid()
  )
);

-- 4. Create new company-scoped INSERT policy
CREATE POLICY "Users can upload to their company folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'files' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM profiles WHERE user_id = auth.uid()
  )
);

-- 5. Create new company-scoped UPDATE policy
CREATE POLICY "Users can update their company files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'files' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM profiles WHERE user_id = auth.uid()
  )
);

-- 6. Create new company-scoped DELETE policy
CREATE POLICY "Users can delete their company files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'files' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM profiles WHERE user_id = auth.uid()
  )
);