-- Vérifier si Jack LUC existe dans la table users
SELECT 
  id,
  name,
  email,
  role
FROM public.users
WHERE id = '82be903d-9600-4c53-9cd4-113bfaaac12e';

-- Lister tous les utilisateurs
SELECT 
  id,
  name,
  email,
  role
FROM public.users
ORDER BY name;

-- Vérifier quel owner_id a le prospect Fabrice
SELECT 
  id,
  name,
  owner_id
FROM public.prospects
WHERE name ILIKE '%Fabrice%'
LIMIT 5;
