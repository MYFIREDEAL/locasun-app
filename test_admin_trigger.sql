-- ================================================
-- TEST: Vérifier que le trigger admin fonctionne
-- À exécuter dans Supabase SQL Editor APRÈS avoir fait un test client→admin
-- ================================================

-- 1️⃣ Vérifier que le trigger existe
SELECT tgname, tgenabled
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'chat_messages'
  AND tgname = 'on_client_message_notify_admin';

-- 2️⃣ Voir les 5 derniers messages CLIENTS dans chat_messages
SELECT id, prospect_id, project_type, sender, channel, LEFT(text, 50) as text_preview, created_at
FROM chat_messages
WHERE sender = 'client'
ORDER BY created_at DESC
LIMIT 5;

-- 3️⃣ Voir les 5 dernières notifications admin
SELECT id, prospect_id, owner_id, project_type, prospect_name, project_name, count, read, created_at
FROM notifications
ORDER BY created_at DESC
LIMIT 5;

-- 4️⃣ Vérifier la fonction du trigger
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'notify_admin_on_client_message';
