-- =====================================================
-- DIAGNOSTIQUER l'erreur 409 sur prospects
-- =====================================================

-- 1. Vérifier les contraintes UNIQUE sur prospects
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.prospects'::regclass
  AND contype IN ('u', 'p'); -- UNIQUE et PRIMARY KEY

-- 2. Vérifier les index UNIQUE
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'prospects'
  AND indexdef LIKE '%UNIQUE%';

-- 3. Chercher des doublons potentiels sur email
SELECT 
  email,
  COUNT(*) as count
FROM public.prospects
WHERE email IS NOT NULL
GROUP BY email
HAVING COUNT(*) > 1;

-- 4. Chercher des doublons potentiels sur phone
SELECT 
  phone,
  COUNT(*) as count
FROM public.prospects
WHERE phone IS NOT NULL
GROUP BY phone
HAVING COUNT(*) > 1;

-- 5. Chercher des doublons sur user_id (si contrainte UNIQUE)
SELECT 
  user_id,
  COUNT(*) as count
FROM public.prospects
WHERE user_id IS NOT NULL
GROUP BY user_id
HAVING COUNT(*) > 1;

-- 6. Voir la structure complète de la table prospects
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'prospects'
ORDER BY ordinal_position;
