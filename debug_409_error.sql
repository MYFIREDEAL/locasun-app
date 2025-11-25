-- 🔍 DIAGNOSTIC ERREUR 409 (CONFLICT) - CRÉATION PROSPECT

-- 1. Vérifier les contraintes UNIQUE sur la table prospects
SELECT 
  tc.constraint_name,
  kcu.column_name,
  tc.constraint_type
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'prospects' 
  AND tc.constraint_type = 'UNIQUE';

-- 2. Vérifier les index UNIQUE
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'prospects'
  AND indexdef LIKE '%UNIQUE%';

-- 3. Vérifier s'il y a des prospects récents qui pourraient causer un conflit
SELECT 
  id,
  name,
  email,
  phone,
  owner_id,
  created_at,
  u.name as "Owner"
FROM prospects p
LEFT JOIN users u ON p.owner_id = u.user_id
ORDER BY created_at DESC
LIMIT 10;

-- 4. Vérifier si Charly a déjà des prospects
SELECT 
  COUNT(*) as "Nombre de prospects de Charly",
  u.name,
  u.user_id
FROM prospects p
JOIN users u ON p.owner_id = u.user_id
WHERE u.email LIKE '%charly%'
GROUP BY u.name, u.user_id;
