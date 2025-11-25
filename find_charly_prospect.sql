-- 🔍 Vérifier où est le prospect créé par Charly

-- 1. Lister TOUS les prospects créés dans les dernières minutes
SELECT 
  id,
  name,
  email,
  owner_id,
  created_at,
  CASE 
    WHEN owner_id = 'e85ff206-87a2-4d63-9f1d-4d97f1842159' THEN '✅ CHARLY'
    WHEN owner_id = '82be903d-9600-4c53-9cd4-113bfaaac12e' THEN '✅ JACK LUC'
    ELSE '⚠️ Autre'
  END as owner_name
FROM public.prospects
WHERE created_at > NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC;

-- 2. Compter les prospects par owner
SELECT 
  owner_id,
  u.name as owner_name,
  COUNT(*) as nb_prospects
FROM public.prospects p
LEFT JOIN public.users u ON u.user_id = p.owner_id
GROUP BY owner_id, u.name
ORDER BY nb_prospects DESC;

-- 3. Chercher spécifiquement le prospect "test45@yopmail.com"
SELECT 
  id,
  name,
  email,
  phone,
  owner_id,
  created_at,
  tags,
  status
FROM public.prospects
WHERE email = 'test45@yopmail.com';
