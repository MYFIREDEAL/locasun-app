-- 🔍 COMPRENDRE POURQUOI JACK FONCTIONNE MAIS PAS CHARLY

-- 1. Voir la valeur de user_id pour les prospects de Jack
SELECT 
  name,
  owner_id as "owner_id (bon)",
  user_id as "user_id (ancien?)",
  created_at
FROM prospects
WHERE owner_id = '82be903d-9600-4c53-9cd4-113bfaaac12e'
ORDER BY created_at DESC
LIMIT 5;

-- 2. Voir s'il y a DÉJÀ un prospect avec le user_id de Charly
SELECT 
  'Prospect avec user_id de Charly?' as "Check",
  COUNT(*) as "Nombre",
  MAX(name) as "Nom du prospect"
FROM prospects
WHERE user_id = 'e85ff206-87a2-4d63-9f1d-4d97f1842159';

-- 3. Comparer la structure exacte des 2 UUID
SELECT 
  'Jack LUC' as "User",
  '82be903d-9600-4c53-9cd4-113bfaaac12e' as "user_id (AUTH)"
UNION ALL
SELECT 
  'Charly',
  'e85ff206-87a2-4d63-9f1d-4d97f1842159';

-- 4. Vérifier si la contrainte UNIQUE est revenue sur user_id
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'prospects'
  AND (indexdef LIKE '%user_id%' OR indexname LIKE '%user_id%');
