-- 🔍 DÉBUGGER L'ERREUR 409 EN DÉTAIL

-- 1. Vérifier combien de prospects Charly a déjà
SELECT 
  COUNT(*) as "Nombre de prospects de Charly",
  'e85ff206-87a2-4d63-9f1d-4d97f1842159' as "UUID de Charly"
FROM prospects
WHERE owner_id = 'e85ff206-87a2-4d63-9f1d-4d97f1842159';

-- 2. Lister tous les prospects de Charly
SELECT 
  name,
  email,
  phone,
  owner_id,
  created_at
FROM prospects
WHERE owner_id = 'e85ff206-87a2-4d63-9f1d-4d97f1842159'
ORDER BY created_at DESC;

-- 3. Vérifier s'il y a un trigger ou une règle qui bloque
SELECT 
  tgname as "Trigger Name",
  tgtype as "Type",
  tgenabled as "Enabled"
FROM pg_trigger
WHERE tgrelid = 'prospects'::regclass;

-- 4. Afficher TOUTES les contraintes (pas seulement UNIQUE)
SELECT 
  con.conname as "Contrainte",
  con.contype as "Type",
  pg_get_constraintdef(con.oid) as "Définition"
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'prospects'
ORDER BY con.contype;
