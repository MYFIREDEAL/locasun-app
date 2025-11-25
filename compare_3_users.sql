-- 🔍 COMPARER LES 3 USERS : Élodie, Charly, Jack

SELECT 
  name as "Nom",
  email as "Email",
  role as "Rôle",
  id as "users.id",
  user_id as "user_id (AUTH)",
  access_rights as "Droits",
  CASE 
    WHEN user_id IS NULL THEN '❌ user_id NULL'
    WHEN user_id = id THEN '⚠️ user_id = id (PROBLÈME)'
    ELSE '✅ user_id différent de id'
  END as "Validation",
  created_at as "Créé le"
FROM users
WHERE name IN ('Jack LUC', 'charly', 'Élodie', 'Elodie')
   OR email LIKE '%jack%'
   OR email LIKE '%charly%'
   OR email LIKE '%elodie%'
ORDER BY name;
