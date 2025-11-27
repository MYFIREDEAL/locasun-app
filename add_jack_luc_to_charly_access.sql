-- Qui est l'utilisateur dans access_rights de Charly ?

SELECT 
  id,
  user_id,
  name,
  email,
  role
FROM users
WHERE user_id = '82be903d-9600-4c53-9cd4-113bfaaac12e';

-- Ajouter Jack Luc aux access_rights de Charly
UPDATE users
SET access_rights = jsonb_set(
  access_rights,
  '{users}',
  (access_rights->'users') || '["4beccce8-448a-48b7-b014-fc280e665d26"]'::jsonb
)
WHERE name = 'charly';

-- Vérifier que c'est bien appliqué
SELECT 
  name,
  access_rights
FROM users
WHERE name = 'charly';
