-- =====================================================
-- DEBUG : Charly ne voit pas les contacts de Jack LUC
-- =====================================================

-- 1. Vérifier l'utilisateur Charly
SELECT user_id, name, email, role, access_rights 
FROM public.users 
WHERE name ILIKE '%charly%';

-- 2. Vérifier l'utilisateur Jack LUC
SELECT user_id, name, email, role 
FROM public.users 
WHERE name ILIKE '%jack%';

-- 3. Vérifier les prospects de Jack LUC
SELECT id, name, email, owner_id, tags, phone
FROM public.prospects
WHERE owner_id IN (
  SELECT user_id FROM public.users WHERE name ILIKE '%jack%'
)
LIMIT 5;

-- 4. TEST : Simuler la connexion de Charly
-- Remplacer 'CHARLY_UUID' par l'UUID réel de Charly
/*
SET LOCAL jwt.claims.sub = 'CHARLY_UUID';
SELECT * FROM prospects WHERE owner_id IN (
  SELECT user_id FROM public.users WHERE name ILIKE '%jack%'
);
*/

-- =====================================================
-- 5. Vérifier les politiques RLS sur prospects
-- =====================================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'prospects'
ORDER BY policyname;

-- =====================================================
-- HYPOTHÈSE : La politique RLS sur prospects ne prend pas
-- en compte les access_rights pour les Commerciaux
-- =====================================================

-- Solution potentielle : Modifier la politique SELECT sur prospects
-- pour inclure les users accessibles via access_rights
