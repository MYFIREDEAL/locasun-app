-- =====================================================
-- CONFIGURER REALTIME pour DELETE sur project_files
-- =====================================================

-- 1. D'abord, retirer la table de la publication (ignore l'erreur si elle n'existe pas)
DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE public.project_files;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 2. Configurer la table pour répliquer TOUS les événements (INSERT, UPDATE, DELETE)
-- En ajoutant REPLICA IDENTITY FULL, PostgreSQL inclura toutes les colonnes dans les événements DELETE
ALTER TABLE public.project_files REPLICA IDENTITY FULL;

-- 3. Ré-ajouter la table à la publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_files;

-- 4. Vérifier la configuration
SELECT 
  schemaname,
  tablename,
  'REPLICA IDENTITY: ' || relreplident::text as config
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_publication_tables pt ON pt.tablename = c.relname
WHERE c.relname = 'project_files' 
  AND n.nspname = 'public'
  AND pt.pubname = 'supabase_realtime';

-- Légende pour relreplident:
-- 'd' = default (seulement la clé primaire)
-- 'f' = full (toutes les colonnes) <- Ce qu'on veut!
-- 'i' = index
-- 'n' = nothing
