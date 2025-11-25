-- 🔥 SUPPRIMER LA COLONNE user_id OBSOLÈTE DE prospects

-- Cette colonne ne devrait plus exister !
-- On utilise maintenant owner_id uniquement

-- 1. Vérifier les colonnes actuelles
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'prospects'
  AND column_name IN ('user_id', 'owner_id')
ORDER BY column_name;

-- 2. Supprimer la colonne user_id et sa contrainte
ALTER TABLE prospects 
DROP COLUMN IF EXISTS user_id CASCADE;

-- 3. Re-vérifier qu'il ne reste que owner_id
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'prospects'
  AND column_name IN ('user_id', 'owner_id')
ORDER BY column_name;
