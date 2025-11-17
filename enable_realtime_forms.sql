-- Activer le real-time pour la table forms
ALTER PUBLICATION supabase_realtime ADD TABLE forms;

-- Vérifier que c'est activé
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
