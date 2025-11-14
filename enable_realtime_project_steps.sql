-- Vérifier et activer le real-time pour project_steps_status

-- 1. Vérifier si le real-time est activé
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'project_steps_status';

-- 2. Activer la réplication (publication) pour le real-time
-- Ceci permet à Supabase d'écouter les changements en temps réel
ALTER PUBLICATION supabase_realtime ADD TABLE project_steps_status;

-- 3. Vérifier que la table est dans la publication
SELECT 
  schemaname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename = 'project_steps_status';
