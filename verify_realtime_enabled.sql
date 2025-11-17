-- Vérifier si le real-time est activé sur les tables notifications
SELECT 
  schemaname,
  tablename,
  'Real-time ACTIVÉ ✅' as status
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('notifications', 'client_notifications')
ORDER BY tablename;

-- Si les tables n'apparaissent PAS, exécute enable_realtime_notifications.sql
