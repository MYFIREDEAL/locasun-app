-- Debug : Pourquoi "Non assigné" s'affiche pour Charly Rosca

-- 1. Vérifier le contact Charly Rosca
SELECT 
  'PROSPECT' AS source,
  p.id,
  p.name,
  p.owner_id,
  p.owner_id::text AS owner_id_as_text
FROM prospects p
WHERE p.name ILIKE '%charly%rosca%';

-- 2. Vérifier Jack Luc dans la table users
SELECT 
  'USER' AS source,
  u.id,
  u.user_id,
  u.name,
  u.email,
  u.user_id::text AS user_id_as_text
FROM users u
WHERE u.name ILIKE '%jack%luc%' OR u.email ILIKE '%jack%';

-- 3. Vérifier si owner_id correspond à user_id ou id
SELECT 
  'MATCH CHECK' AS source,
  p.name AS prospect_name,
  p.owner_id,
  u.id AS user_id_column_id,
  u.user_id AS user_id_column_user_id,
  u.name AS user_name,
  CASE 
    WHEN p.owner_id = u.id THEN '✅ Match avec users.id'
    WHEN p.owner_id = u.user_id THEN '✅ Match avec users.user_id'
    ELSE '❌ Pas de match'
  END AS match_status
FROM prospects p
CROSS JOIN users u
WHERE p.name ILIKE '%charly%rosca%'
  AND (u.name ILIKE '%jack%luc%' OR u.email ILIKE '%jack%');
