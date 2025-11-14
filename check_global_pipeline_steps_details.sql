-- Vérifier la table global_pipeline_steps dans Supabase

-- 1. Structure complète de la table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'global_pipeline_steps'
ORDER BY ordinal_position;

-- 2. Voir toutes les données (s'il y en a)
SELECT * FROM public.global_pipeline_steps;

-- 3. Compter les lignes
SELECT 
  COUNT(*) as total_rows,
  COUNT(DISTINCT project_name) as unique_projects
FROM public.global_pipeline_steps;

-- 4. Vérifier les index et contraintes
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'global_pipeline_steps'
  AND schemaname = 'public';

-- 5. Vérifier les policies RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'global_pipeline_steps';

-- 6. Vérifier si le real-time est activé
SELECT 
  schemaname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' 
  AND tablename = 'global_pipeline_steps';
