-- 🚨 RESTAURER LA CONTRAINTE UNIQUE SUR user_id

-- On remet la contrainte qu'on a supprimée
ALTER TABLE prospects 
ADD CONSTRAINT prospects_user_id_key UNIQUE (user_id);

-- Vérifier que c'est bien remis
SELECT 
  con.conname as "Contrainte",
  pg_get_constraintdef(con.oid) as "Définition"
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'prospects'
  AND con.contype = 'u';
