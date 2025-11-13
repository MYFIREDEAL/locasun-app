-- Vérifier le role et access_rights de Charly
SELECT 
  id,
  user_id,
  name,
  email,
  role,
  access_rights
FROM public.users
WHERE name ILIKE '%charly%';
