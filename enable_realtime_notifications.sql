-- Activer le real-time sur les tables notifications
-- Ce script permet la synchronisation en temps réel des notifications entre admin et client

-- 1. Activer le real-time sur la table notifications (admin)
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- 2. Activer le real-time sur la table client_notifications (client)
ALTER PUBLICATION supabase_realtime ADD TABLE client_notifications;

-- 3. Vérifier que le real-time est activé
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename IN ('notifications', 'client_notifications');

-- Note: Les RLS policies existantes garantissent que:
-- - Les admins voient seulement les notifications de leurs prospects (via prospects.owner_id)
-- - Les clients voient seulement leurs propres notifications (via auth.uid() = prospect_id)
-- - Le real-time respecte automatiquement ces policies
