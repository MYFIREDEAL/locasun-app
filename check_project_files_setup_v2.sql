-- =====================================================
-- AUDIT COMPLET: project_files (version JSON unique)
-- =====================================================

SELECT jsonb_build_object(
  'table_exists', (
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'project_files'
    )
  ),
  'rls_enabled', (
    SELECT relrowsecurity
    FROM pg_class
    WHERE relname = 'project_files' AND relnamespace = 'public'::regnamespace
  ),
  'rls_policies_count', (
    SELECT COUNT(*)
    FROM pg_policies
    WHERE tablename = 'project_files'
  ),
  'rls_policies', (
    SELECT jsonb_agg(
      jsonb_build_object(
        'name', policyname,
        'cmd', cmd,
        'roles', roles
      )
    )
    FROM pg_policies
    WHERE tablename = 'project_files'
  ),
  'storage_bucket_exists', (
    SELECT EXISTS (
      SELECT 1 FROM storage.buckets
      WHERE id = 'project-files' OR name = 'project-files'
    )
  ),
  'storage_bucket_info', (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', id,
        'name', name,
        'public', public
      )
    )
    FROM storage.buckets
    WHERE id = 'project-files' OR name = 'project-files'
  ),
  'storage_policies_count', (
    SELECT COUNT(*)
    FROM pg_policies
    WHERE schemaname = 'storage' 
      AND tablename = 'objects'
      AND qual LIKE '%project-files%'
  ),
  'realtime_enabled', (
    SELECT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'project_files'
    )
  ),
  'files_count', (
    SELECT COUNT(*) FROM public.project_files
  )
) as audit_result;
