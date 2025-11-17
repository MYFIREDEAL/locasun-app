-- Désactiver temporairement les triggers pour revenir au système React
DROP TRIGGER IF EXISTS on_client_message_notify_admin ON chat_messages;
DROP TRIGGER IF EXISTS on_admin_message_notify_client ON chat_messages;

-- Vérifier que les triggers sont bien supprimés
SELECT 
  tgname as trigger_name,
  tgenabled as enabled
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'chat_messages'
  AND tgname IN ('on_client_message_notify_admin', 'on_admin_message_notify_client');

-- Si aucun résultat, c'est bon !
SELECT 'Triggers désactivés avec succès' as status;
