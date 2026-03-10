-- ============================================================================
-- Supabase RLS Policies for work_attachments Bucket
-- ============================================================================
-- 
-- HOW TO USE:
-- 1. Go to Supabase Dashboard → SQL Editor
-- 2. Click "New Query"
-- 3. Copy ALL the SQL below and paste it into the editor
-- 4. Click "Run" button
-- 5. You should see "Success" messages for each policy
--
-- ============================================================================

-- Policy 1: Allow authenticated users to INSERT (upload files)
CREATE POLICY "authenticated_users_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'work_attachments'
);

-- Policy 2: Allow authenticated users to SELECT (view/download files)
CREATE POLICY "authenticated_users_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'work_attachments'
);

-- Policy 3: Allow authenticated users to DELETE files
CREATE POLICY "authenticated_users_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'work_attachments'
);

-- ============================================================================
-- VERIFICATION (Optional - run after policies are created)
-- ============================================================================
-- To verify the policies were created, run this query:
-- SELECT * FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects';

-- ============================================================================
-- TROUBLESHOOTING
-- ============================================================================
--
-- If you get an error like "policy already exists", it means the policy
-- was already created. You can either:
--
-- 1. Drop and recreate:
--    DROP POLICY "authenticated_users_insert" ON storage.objects;
--    DROP POLICY "authenticated_users_select" ON storage.objects;
--    DROP POLICY "authenticated_users_delete" ON storage.objects;
--    -- Then re-run the CREATE POLICY statements above
--
-- 2. Or just verify in UI that the policies exist:
--    - Go to Storage → work_attachments bucket → Policies tab
--    - You should see 3 policies listed
--
-- ============================================================================
