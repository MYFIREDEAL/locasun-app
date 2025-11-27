-- =====================================================
-- Diagnostiquer l'erreur 409 sur UPDATE users
-- =====================================================

-- 1. Vérifier la structure de la table users
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'users'
ORDER BY ordinal_position;

-- 2. Vérifier les contraintes (UNIQUE, PRIMARY KEY, FOREIGN KEY)
SELECT
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.users'::regclass
ORDER BY contype, conname;

-- 3. Vérifier l'utilisateur problématique
SELECT 
  id,
  user_id,
  name,
  email,
  role,
  manager_id
FROM users
WHERE user_id = '72501e6b-5438-48be-8c27-0e753db44b16';

-- 4. Test UPDATE simple
-- UPDATE users 
-- SET role = 'Manager' 
-- WHERE id = (SELECT id FROM users WHERE user_id = '72501e6b-5438-48be-8c27-0e753db44b16');
