-- =====================================================
-- DIAGNOSTIC COMPLET - GESTION DES PIPELINES GLOBALES
-- =====================================================
-- Date: 14 novembre 2025
-- Objectif: Voir EXACTEMENT ce qui existe dans Supabase

-- =====================================================
-- 1. VÉRIFIER SI LA TABLE global_pipeline_steps EXISTE
-- =====================================================
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'global_pipeline_steps';

-- =====================================================
-- 2. STRUCTURE COMPLÈTE DE LA TABLE (si elle existe)
-- =====================================================
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

-- =====================================================
-- 3. VOIR TOUTES LES DONNÉES DANS global_pipeline_steps
-- =====================================================
SELECT 
  id,
  step_id,
  label,
  color,
  position,
  created_at,
  updated_at
FROM public.global_pipeline_steps
ORDER BY position;

-- =====================================================
-- 4. COMPTER LES LIGNES
-- =====================================================
SELECT 
  COUNT(*) as total_rows,
  COUNT(DISTINCT label) as unique_labels,
  MIN(position) as min_position,
  MAX(position) as max_position
FROM public.global_pipeline_steps;

-- =====================================================
-- 5. VÉRIFIER LES INDEX
-- =====================================================
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'global_pipeline_steps'
  AND schemaname = 'public';

-- =====================================================
-- 6. VÉRIFIER LES CONTRAINTES
-- =====================================================
SELECT
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.global_pipeline_steps'::regclass;

-- =====================================================
-- 7. VÉRIFIER LES POLICIES RLS
-- =====================================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'global_pipeline_steps';

-- =====================================================
-- 8. VÉRIFIER SI LE REAL-TIME EST ACTIVÉ
-- =====================================================
SELECT 
  schemaname,
  tablename,
  'Real-time activé' as status
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' 
  AND tablename = 'global_pipeline_steps';

-- =====================================================
-- 9. ALTERNATIVE: VÉRIFIER company_settings.settings.global_pipeline_steps
-- =====================================================
SELECT 
  id,
  company_name,
  settings->'global_pipeline_steps' as global_pipeline_steps_jsonb,
  jsonb_array_length(settings->'global_pipeline_steps') as nombre_steps,
  created_at,
  updated_at
FROM public.company_settings;

-- =====================================================
-- 10. DÉTAIL DES PIPELINES DANS company_settings (si présents)
-- =====================================================
SELECT 
  id,
  company_name,
  jsonb_pretty(settings->'global_pipeline_steps') as pipelines_formatted
FROM public.company_settings
WHERE settings ? 'global_pipeline_steps';

-- =====================================================
-- 11. VÉRIFIER LES TRIGGERS SUR global_pipeline_steps
-- =====================================================
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'global_pipeline_steps'
  AND event_object_schema = 'public';

-- =====================================================
-- 12. VOIR SI D'AUTRES TABLES RÉFÉRENCENT global_pipeline_steps
-- =====================================================
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND (ccu.table_name = 'global_pipeline_steps' OR tc.table_name = 'global_pipeline_steps');

-- =====================================================
-- RÉSUMÉ FINAL
-- =====================================================
-- Copier les résultats ci-dessus et envoyer à l'assistant pour analyse
