-- =====================================================
-- DEBUG: Vérifier ce que retourne get_accessible_users
-- =====================================================

-- 1. Appeler la fonction RPC comme le fait le hook
SELECT * FROM get_accessible_users();

-- 2. Vérifier la structure de la réponse
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- 3. Vérifier la définition de la fonction
SELECT 
  proname as "Nom fonction",
  pg_get_functiondef(oid) as "Définition complète"
FROM pg_proc
WHERE proname = 'get_accessible_users';
