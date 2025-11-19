-- =====================================================
-- SUPPRIMER project_activity
-- =====================================================

-- 1. Désactiver realtime (si activé)
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.project_activity;

-- 2. Supprimer la table
DROP TABLE IF EXISTS public.project_activity CASCADE;

-- 3. Vérifier que c'est bien supprimé
SELECT 
  'TABLE project_activity EXISTS' as check_type,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'project_activity'
  ) as result;
