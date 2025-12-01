-- =====================================================
-- DEBUG: Vérifier les IDs de Jack LUC
-- =====================================================
-- Date: 1 décembre 2025
-- Problème: assignedUserId ne trouve pas l'utilisateur dans le dropdown

-- 1. Voir TOUS les champs de Jack LUC dans public.users
SELECT 
  id as "users.id (UUID PK)",
  user_id as "users.user_id (auth UUID)",
  name,
  email,
  role,
  created_at
FROM public.users
WHERE LOWER(name) LIKE '%jack%'
  OR LOWER(email) LIKE '%jack%'
ORDER BY created_at DESC;

-- 2. Voir l'utilisateur authentifié dans auth.users
SELECT 
  id as "auth.users.id",
  email,
  created_at,
  email_confirmed_at
FROM auth.users
WHERE LOWER(email) LIKE '%jack%'
ORDER BY created_at DESC;

-- 3. Vérifier la correspondance entre les deux tables
SELECT 
  au.id as "auth.users.id",
  au.email as "auth email",
  pu.id as "public.users.id (PK)",
  pu.user_id as "public.users.user_id (devrait = auth.users.id)",
  pu.name,
  CASE 
    WHEN au.id = pu.user_id THEN '✅ MATCH'
    ELSE '❌ MISMATCH'
  END as "Correspondance"
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.user_id
WHERE LOWER(au.email) LIKE '%jack%'
ORDER BY au.created_at DESC;

-- 4. Voir TOUS les utilisateurs (pour le dropdown)
SELECT 
  id as "users.id",
  user_id as "users.user_id",
  name,
  email,
  role
FROM public.users
ORDER BY name;

-- 5. Vérifier quel ID est utilisé dans useSupabaseUser
-- (Normalement devrait retourner users.id pour assignments)
SELECT 
  'cd73c227-6d2d-4997-bc33-16833f19a34c' as "ID recherché",
  CASE 
    WHEN EXISTS (SELECT 1 FROM public.users WHERE id = 'cd73c227-6d2d-4997-bc33-16833f19a34c') 
    THEN '✅ Existe dans users.id'
    ELSE '❌ N''existe PAS dans users.id'
  END as "Résultat users.id",
  CASE 
    WHEN EXISTS (SELECT 1 FROM public.users WHERE user_id = 'cd73c227-6d2d-4997-bc33-16833f19a34c') 
    THEN '✅ Existe dans users.user_id'
    ELSE '❌ N''existe PAS dans users.user_id'
  END as "Résultat users.user_id";

-- 6. Si l'ID est dans user_id, récupérer le bon users.id
SELECT 
  id as "users.id (à utiliser pour assignment)",
  user_id as "users.user_id (auth UUID)",
  name
FROM public.users
WHERE user_id = 'cd73c227-6d2d-4997-bc33-16833f19a34c'
   OR id = 'cd73c227-6d2d-4997-bc33-16833f19a34c';
