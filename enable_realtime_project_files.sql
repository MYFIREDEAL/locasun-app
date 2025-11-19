-- =====================================================
-- ACTIVER REALTIME sur project_files
-- =====================================================

-- Activer Realtime pour la table project_files
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_files;

-- Vérifier que c'est bien activé
SELECT EXISTS (
  SELECT 1 FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'project_files'
) as realtime_enabled;
