-- =====================================================
-- AUDIT COMPLET: project_files
-- =====================================================

-- 1. Vérifier que la table existe
SELECT 'TABLE EXISTS' as check_type, 
       EXISTS (
         SELECT 1 FROM information_schema.tables 
         WHERE table_schema = 'public' 
         AND table_name = 'project_files'
       ) as result;

-- 2. Vérifier RLS activé
SELECT 'RLS ENABLED' as check_type,
       relrowsecurity as result
FROM pg_class
WHERE relname = 'project_files' AND relnamespace = 'public'::regnamespace;

-- 3. Lister toutes les RLS policies sur project_files
SELECT 'RLS POLICIES' as check_type,
       schemaname,
       tablename,
       policyname,
       permissive,
       roles,
       cmd,
       qual,
       with_check
FROM pg_policies
WHERE tablename = 'project_files'
ORDER BY policyname;

-- 4. Vérifier si le bucket Storage existe
SELECT 'STORAGE BUCKET' as check_type,
       id,
       name,
       public
FROM storage.buckets
WHERE id = 'project-files' OR name = 'project-files';

-- 5. Lister les policies Storage sur project-files (via pg_policies)
SELECT 'STORAGE POLICIES' as check_type,
       policyname,
       cmd,
       qual
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND qual LIKE '%project-files%'
ORDER BY policyname;

-- 6. Vérifier Realtime activé
SELECT 'REALTIME ENABLED' as check_type,
       EXISTS (
         SELECT 1 FROM pg_publication_tables
         WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'project_files'
       ) as result;

-- 7. Compter les fichiers existants
SELECT 'FILES COUNT' as check_type,
       COUNT(*) as result
FROM public.project_files;
