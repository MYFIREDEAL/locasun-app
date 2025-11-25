-- 🔍 VÉRIFIER SI CHARLY PEUT SE CONNECTER ET CRÉER DES PROSPECTS

-- 1. Vérifier que le user_id de Charly existe bien dans auth.users
SELECT 
  'Charly dans auth.users' as "Check",
  au.id as "Auth UUID",
  au.email as "Email Auth",
  u.user_id as "user_id dans public.users",
  u.email as "Email dans public.users",
  CASE 
    WHEN au.id = u.user_id THEN '✅ MATCH PARFAIT'
    ELSE '❌ PAS DE MATCH'
  END as "Validation"
FROM auth.users au
FULL OUTER JOIN users u ON au.id = u.user_id
WHERE au.email LIKE '%charly%' OR u.email LIKE '%charly%';

-- 2. Tester la RLS policy pour Charly (simuler un INSERT)
-- Vérifier si son user_id respecte la policy
SELECT 
  'Test RLS pour Charly' as "Test",
  'e85ff206-87a2-4d63-9f1d-4d97f1842159' as "user_id de Charly",
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM users 
      WHERE user_id = 'e85ff206-87a2-4d63-9f1d-4d97f1842159'
        AND role IN ('Commercial', 'Manager', 'Global Admin')
    ) THEN '✅ RLS devrait AUTORISER'
    ELSE '❌ RLS va BLOQUER'
  END as "Résultat RLS";

-- 3. Vérifier s'il y a des duplicates d'email dans prospects
SELECT 
  email,
  COUNT(*) as "Nombre"
FROM prospects
WHERE email = 'test409@yopmail.com'
GROUP BY email;

-- 4. Vérifier toutes les contraintes UNIQUE sur prospects
SELECT 
  con.conname as "Contrainte",
  pg_get_constraintdef(con.oid) as "Définition"
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'prospects'
  AND con.contype = 'u';
