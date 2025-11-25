-- 🔍 RE-VÉRIFIER que la contrainte UNIQUE a bien été supprimée

SELECT 
  con.conname as "Contrainte",
  pg_get_constraintdef(con.oid) as "Définition"
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'prospects'
  AND (con.contype = 'u' OR con.conname LIKE '%user_id%');

-- Vérifier aussi les index UNIQUE
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'prospects'
  AND indexdef LIKE '%UNIQUE%';
