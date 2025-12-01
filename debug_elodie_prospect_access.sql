-- Diagnostic : Elodie Vinet ne voit pas les fiches détails des prospects dans le Pipeline
-- Elle voit les contacts dans le module Contacts mais pas les détails ni les cards Pipeline

-- 1. Vérifier l'utilisateur Elodie
SELECT 
  id,
  user_id,
  name,
  email,
  role,
  manager_id,
  access_rights
FROM public.users
WHERE name ILIKE '%elodie%' OR name ILIKE '%vinet%';

-- 2. Vérifier les prospects de Jack LUC (qu'Elodie devrait voir)
SELECT 
  id,
  name,
  email,
  phone,
  owner_id,
  user_id,
  tags,
  step,
  created_at
FROM public.prospects
WHERE owner_id = (SELECT user_id FROM public.users WHERE name = 'Jack LUC')
ORDER BY created_at DESC
LIMIT 10;

-- 3. Vérifier si Elodie a Jack LUC dans ses access_rights.users
SELECT 
  name,
  role,
  access_rights->'users' as authorized_users,
  access_rights->'modules' as authorized_modules
FROM public.users
WHERE name ILIKE '%elodie%' OR name ILIKE '%vinet%';

-- 4. Vérifier le user_id de Jack LUC (pour comparer avec access_rights)
SELECT 
  id as pk_id,
  user_id as auth_uuid,
  name
FROM public.users
WHERE name = 'Jack LUC';

-- 5. Vérifier toutes les policies RLS sur la table prospects
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'prospects'
ORDER BY policyname;

-- 6. Test : Est-ce qu'Elodie devrait voir les prospects de Jack LUC ?
-- (à exécuter en tant qu'Elodie si possible)
-- Si access_rights contient le user_id de Jack, elle devrait les voir

-- HYPOTHÈSE : Le problème vient probablement de :
-- Option A : access_rights.users contient users.id au lieu de users.user_id
-- Option B : La policy RLS utilise user_id mais access_rights contient id (ou inverse)
-- Option C : Elodie n'a pas Jack LUC dans son access_rights.users
