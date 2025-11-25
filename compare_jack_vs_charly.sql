-- 🔍 COMPARER JACK LUC (✅ FONCTIONNE) VS CHARLY (❌ ERREUR 409)

-- 1. Comparer la structure complète des 2 users
SELECT 
  name as "Nom",
  email as "Email",
  role as "Rôle",
  id as "users.id (PK)",
  user_id as "users.user_id (AUTH UUID)",
  access_rights as "Droits d'accès",
  created_at as "Créé le"
FROM users
WHERE email IN ('jack.luc@icloud.com', 'charly@myfiredeal.com')
   OR name IN ('Jack LUC', 'Charly');

-- 2. Vérifier si user_id existe dans auth.users pour les 2
SELECT 
  u.name as "Nom",
  u.user_id as "user_id dans public.users",
  CASE 
    WHEN EXISTS (SELECT 1 FROM auth.users WHERE id = u.user_id) 
    THEN '✅ Existe dans auth.users'
    ELSE '❌ N''EXISTE PAS dans auth.users'
  END as "Validation Auth"
FROM users u
WHERE u.email IN ('jack.luc@icloud.com', 'charly@myfiredeal.com')
   OR u.name IN ('Jack LUC', 'Charly');

-- 3. Compter les prospects de chacun
SELECT 
  u.name as "User",
  u.user_id as "user_id",
  COUNT(p.id) as "Nombre de prospects"
FROM users u
LEFT JOIN prospects p ON p.owner_id = u.user_id
WHERE u.email IN ('jack.luc@icloud.com', 'charly@myfiredeal.com')
   OR u.name IN ('Jack LUC', 'Charly')
GROUP BY u.name, u.user_id;

-- 4. Vérifier les RLS policies qui s'appliquent
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual as "Condition"
FROM pg_policies
WHERE tablename = 'prospects'
  AND cmd = 'INSERT';

-- 5. Vérifier si Charly a un UUID NULL ou invalide
SELECT 
  name,
  email,
  user_id,
  CASE 
    WHEN user_id IS NULL THEN '❌ user_id est NULL'
    WHEN user_id::text = '' THEN '❌ user_id est vide'
    WHEN LENGTH(user_id::text) != 36 THEN '❌ user_id n''a pas 36 caractères (UUID invalide)'
    ELSE '✅ user_id semble valide'
  END as "Validation user_id"
FROM users
WHERE email IN ('jack.luc@icloud.com', 'charly@myfiredeal.com')
   OR name IN ('Jack LUC', 'Charly');
