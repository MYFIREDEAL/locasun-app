-- Activer la réplication real-time pour la table prospects
ALTER PUBLICATION supabase_realtime ADD TABLE public.prospects;

-- Vérifier que c'est activé
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
