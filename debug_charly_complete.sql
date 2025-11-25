-- 🔍 DIAGNOSTIC COMPLET CHARLY

-- 1️⃣ Vérifier l'utilisateur Charly dans la table users
SELECT 
  id as internal_id,
  user_id as auth_uuid,
  name,
  email,
  role,
  access_rights
FROM public.users
WHERE name ILIKE '%charly%';

-- 2️⃣ Vérifier les prospects de Charly (par owner_id = user_id UUID)
SELECT 
  id,
  name,
  email,
  owner_id,
  status,
  tags,
  created_at
FROM public.prospects
WHERE owner_id = 'e85ff206-87a2-4d63-9f1d-4d97f1842159'
ORDER BY created_at DESC;

-- 3️⃣ Vérifier si Charly est bien authentifié (auth.users)
SELECT 
  id,
  email,
  raw_user_meta_data,
  created_at,
  last_sign_in_at
FROM auth.users
WHERE id = 'e85ff206-87a2-4d63-9f1d-4d97f1842159';

-- 4️⃣ Compter les prospects de Charly
SELECT COUNT(*) as total_prospects_charly
FROM public.prospects
WHERE owner_id = 'e85ff206-87a2-4d63-9f1d-4d97f1842159';

-- 5️⃣ Vérifier tous les prospects (pour comparaison)
SELECT 
  p.name as prospect_name,
  p.owner_id,
  u.name as owner_name,
  p.status,
  p.tags
FROM public.prospects p
LEFT JOIN public.users u ON p.owner_id = u.user_id
ORDER BY u.name, p.name;
