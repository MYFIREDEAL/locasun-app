-- =====================================================
-- RECHERCHE : À qui appartiennent les prospects ?
-- =====================================================

-- 1. Voir les prospects avec leur owner_id
SELECT 
  id,
  name,
  owner_id,
  tags,
  created_at
FROM public.prospects
ORDER BY created_at DESC
LIMIT 20;

-- 2. Voir les utilisateurs disponibles avec leur user_id
SELECT 
  id,
  user_id,
  name,
  email,
  role
FROM public.users
ORDER BY name;

-- 3. JOIN pour voir les prospects avec le nom du propriétaire
SELECT 
  p.id as prospect_id,
  p.name as prospect_name,
  p.owner_id,
  u.user_id as owner_user_id,
  u.name as owner_name,
  u.role as owner_role
FROM public.prospects p
LEFT JOIN public.users u ON p.owner_id = u.user_id
ORDER BY p.created_at DESC
LIMIT 20;

-- 4. Identifier les prospects SANS propriétaire valide
SELECT 
  p.id,
  p.name,
  p.owner_id as prospect_owner_id,
  CASE 
    WHEN u.user_id IS NULL THEN '❌ ORPHELIN (owner_id invalide)'
    ELSE '✅ OK'
  END as status
FROM public.prospects p
LEFT JOIN public.users u ON p.owner_id = u.user_id
WHERE u.user_id IS NULL;

-- 5. Compter les prospects par propriétaire
SELECT 
  u.name as proprietaire,
  u.user_id,
  COUNT(p.id) as nombre_prospects
FROM public.users u
LEFT JOIN public.prospects p ON p.owner_id = u.user_id
GROUP BY u.name, u.user_id
ORDER BY nombre_prospects DESC;
