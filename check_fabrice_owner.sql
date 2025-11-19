-- 1. Vérifier le prospect Fabrice et son owner_id
SELECT 
  id as prospect_id,
  name as prospect_name,
  owner_id,
  email,
  phone,
  created_at
FROM public.prospects
WHERE name ILIKE '%Fabrice%'
LIMIT 5;

-- 2. Vérifier si l'UUID 82be903d-9600-4c53-9cd4-113bfaaac12e existe dans users
SELECT 
  id,
  user_id,
  name,
  email,
  role
FROM public.users
WHERE id = '82be903d-9600-4c53-9cd4-113bfaaac12e';

-- 3. Lister TOUS les utilisateurs pour comparaison
SELECT 
  id,
  user_id,
  name,
  email,
  role
FROM public.users
ORDER BY name;

-- 4. Jointure pour voir le nom du propriétaire de Fabrice
SELECT 
  p.id as prospect_id,
  p.name as prospect_name,
  p.owner_id,
  u.name as owner_name,
  u.email as owner_email,
  u.role as owner_role
FROM public.prospects p
LEFT JOIN public.users u ON p.owner_id = u.id
WHERE p.name ILIKE '%Fabrice%'
LIMIT 5;
