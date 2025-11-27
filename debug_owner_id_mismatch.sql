-- Diagnostic : Pourquoi owner_id ne matche pas ?

-- 1. Vérifier le contact problématique
SELECT 
  id,
  name,
  email,
  owner_id,
  created_at
FROM prospects 
WHERE id = '59ce74d7-801c-4250-b519-d74ebaf42254';

-- 2. Vérifier l'utilisateur Charly
SELECT 
  id,
  user_id,
  name,
  email,
  role
FROM users 
WHERE name = 'charly' OR email LIKE '%charly%';

-- 3. Comparaison directe
SELECT 
  p.name AS prospect_name,
  p.owner_id AS prospect_owner_id,
  u.user_id AS charly_user_id,
  CASE 
    WHEN p.owner_id = u.user_id THEN '✅ MATCH'
    ELSE '❌ DIFFÉRENT'
  END AS comparison
FROM prospects p
CROSS JOIN (SELECT user_id FROM users WHERE name = 'charly') u
WHERE p.id = '59ce74d7-801c-4250-b519-d74ebaf42254';
