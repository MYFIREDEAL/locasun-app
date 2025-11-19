-- =====================================================
-- NETTOYER les anciennes policies calls/tasks
-- (Ces tables n'existent plus - tout est dans appointments)
-- =====================================================

-- 1. Supprimer les policies de la table 'calls' (si elle existe)
DROP POLICY IF EXISTS "Users can view their own and authorized calls" ON public.calls;
DROP POLICY IF EXISTS "Users can manage their own calls" ON public.calls;

-- 2. Supprimer les policies de la table 'tasks' (si elle existe)
DROP POLICY IF EXISTS "Users can view their own and authorized tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can manage their own tasks" ON public.tasks;

-- 3. Supprimer les tables calls et tasks (si elles existent)
DROP TABLE IF EXISTS public.calls CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;

-- 4. Vérifier qu'il ne reste que appointments
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('appointments', 'calls', 'tasks')
ORDER BY tablename;

-- 5. Vérifier les policies sur appointments
SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'appointments'
ORDER BY policyname;
