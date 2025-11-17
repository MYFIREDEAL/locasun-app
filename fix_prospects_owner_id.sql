-- Corriger les owner_id des prospects pour utiliser le user_id au lieu de l'id
-- Le problème: La FK prospects_owner_id_fkey pointe vers users.id au lieu de users.user_id

-- 1. Supprimer l'ancienne contrainte de clé étrangère
ALTER TABLE prospects 
DROP CONSTRAINT IF EXISTS prospects_owner_id_fkey;

-- 2. Corriger les owner_id AVANT de créer la nouvelle contrainte
UPDATE prospects
SET owner_id = users.user_id
FROM users
WHERE prospects.owner_id = users.id;

-- 3. Créer la nouvelle contrainte qui pointe vers users.user_id
ALTER TABLE prospects
ADD CONSTRAINT prospects_owner_id_fkey 
FOREIGN KEY (owner_id) 
REFERENCES users(user_id)
ON DELETE SET NULL;

-- 4. Vérifier le problème actuel
SELECT 
  p.name as prospect_name,
  p.owner_id as current_owner_id,
  u.id as users_id,
  u.user_id as users_user_id,
  u.name as owner_name,
  CASE 
    WHEN p.owner_id = u.id THEN '❌ WRONG (uses users.id)'
    WHEN p.owner_id = u.user_id THEN '✅ CORRECT (uses users.user_id)'
    ELSE '⚠️ UNKNOWN'
  END as status
FROM prospects p
LEFT JOIN users u ON p.owner_id = u.id OR p.owner_id = u.user_id
ORDER BY p.name;

-- 2. Corriger tous les prospects qui ont owner_id = users.id
-- Remplacer par users.user_id correspondant
UPDATE prospects
SET owner_id = users.user_id
FROM users
WHERE prospects.owner_id = users.id
  AND prospects.owner_id != users.user_id;

-- 3. Vérifier que la correction a fonctionné
SELECT 
  p.name as prospect_name,
  p.owner_id,
  u.user_id as jack_user_id,
  u.name as owner_name,
  CASE 
    WHEN p.owner_id = u.user_id THEN '✅ CORRECT'
    ELSE '❌ STILL WRONG'
  END as status
FROM prospects p
LEFT JOIN users u ON p.owner_id = u.user_id
WHERE u.name = 'Jack LUC'
ORDER BY p.name;
