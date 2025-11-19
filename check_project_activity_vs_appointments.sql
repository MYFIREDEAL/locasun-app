-- =====================================================
-- VÉRIFIER project_activity vs appointments
-- =====================================================

-- 1. Vérifier si la table project_activity existe
SELECT 
  'TABLE project_activity EXISTS' as check_type,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'project_activity'
  ) as result;

-- 2. Si elle existe, voir sa structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'project_activity'
ORDER BY ordinal_position;

-- 3. Compter les données dans project_activity
SELECT 
  'project_activity COUNT' as table_name,
  COUNT(*) as total_records
FROM public.project_activity;

-- 4. Voir quelques exemples de project_activity
SELECT *
FROM public.project_activity
LIMIT 5;

-- 5. Comparer avec appointments
SELECT 
  'appointments COUNT' as table_name,
  COUNT(*) as total_records
FROM public.appointments;
