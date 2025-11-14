-- Vérifier toutes les tables liées aux pipelines dans Supabase

-- 1. Lister TOUTES les tables qui contiennent "pipeline" ou "step"
SELECT 
  table_schema,
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (
    table_name LIKE '%pipeline%' 
    OR table_name LIKE '%step%'
  )
ORDER BY table_name;

-- 2. Voir la structure de global_pipeline_steps si elle existe
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'global_pipeline_steps'
ORDER BY ordinal_position;

-- 3. Voir les données dans global_pipeline_steps si elle existe
SELECT * FROM public.global_pipeline_steps LIMIT 5;

-- 4. Compter les lignes
SELECT COUNT(*) as total_rows FROM public.global_pipeline_steps;
