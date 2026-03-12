-- ================================================
-- DIAGNOSTIC: État réel des triggers de notification
-- À exécuter dans Supabase SQL Editor
-- ================================================

-- 1️⃣ Lister TOUS les triggers sur chat_messages
SELECT 
  tgname as trigger_name,
  tgenabled as enabled,
  pg_get_triggerdef(t.oid) as definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'chat_messages'
  AND NOT tgisinternal
ORDER BY tgname;

-- 2️⃣ Lister TOUS les triggers sur client_form_panels
SELECT 
  tgname as trigger_name,
  tgenabled as enabled,
  pg_get_triggerdef(t.oid) as definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'client_form_panels'
  AND NOT tgisinternal
ORDER BY tgname;

-- 3️⃣ Colonnes réelles de la table notifications
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'notifications' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4️⃣ Colonnes réelles de la table client_notifications  
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'client_notifications' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5️⃣ Policies INSERT sur notifications
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'notifications'
ORDER BY cmd, policyname;

-- 6️⃣ Dernières notifications admin créées (toutes)
SELECT id, prospect_id, owner_id, project_type, prospect_name, project_name, count, read, created_at
FROM notifications
ORDER BY created_at DESC
LIMIT 10;

-- 7️⃣ Dernières notifications client créées
SELECT id, prospect_id, project_type, project_name, message, count, read, created_at
FROM client_notifications
ORDER BY created_at DESC
LIMIT 10;
