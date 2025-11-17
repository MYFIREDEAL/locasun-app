-- Activer le real-time sur la table chat_messages
-- Ce script permet la synchronisation en temps réel des messages chat entre admin et client

-- 1. Activer le real-time sur la table
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- 2. Vérifier que le real-time est activé
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'chat_messages';

-- Note: Les RLS policies existantes garantissent que:
-- - Les admins voient seulement les messages de leurs prospects (via prospects.owner_id)
-- - Les clients voient seulement leurs propres messages (via auth.uid() = prospect_id)
-- - Le real-time respecte automatiquement ces policies
