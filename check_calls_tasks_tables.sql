-- =====================================================
-- VÉRIFIER tables calls et tasks
-- =====================================================

-- 1. Vérifier si la table calls existe
SELECT 
  'TABLE calls EXISTS' as check_type,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'calls'
  ) as result;

-- 2. Vérifier si la table tasks existe
SELECT 
  'TABLE tasks EXISTS' as check_type,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'tasks'
  ) as result;

-- 3. Compter les données dans calls
SELECT 
  'calls COUNT' as table_name,
  COUNT(*) as total_records
FROM public.calls;

-- 4. Compter les données dans tasks
SELECT 
  'tasks COUNT' as table_name,
  COUNT(*) as total_records
FROM public.tasks;

-- 5. Voir quelques exemples de calls
SELECT *
FROM public.calls
LIMIT 5;

-- 6. Voir quelques exemples de tasks
SELECT *
FROM public.tasks
LIMIT 5;

-- 7. Comparer avec appointments filtrés par type
SELECT 
  type,
  COUNT(*) as count
FROM public.appointments
GROUP BY type
ORDER BY type;

-- 8. Voir quelques appointments de type call ou task
SELECT *
FROM public.appointments
WHERE type IN ('call', 'task')
LIMIT 5;
