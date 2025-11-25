-- 🔍 VOIR TOUS LES CONTACTS DE JACK LUC

-- 1. Les UUID de Jack LUC
SELECT 
  '🔑 UUID de Jack LUC:' as "Info",
  id as "users.id (PK)",
  user_id as "users.user_id (AUTH UUID - le bon pour owner_id)"
FROM users
WHERE email LIKE '%jack%' OR name LIKE '%Jack%';

-- 2. Contacts de Jack via user_id (CORRECT)
SELECT 
  '✅ VIA user_id (MÉTHODE CORRECTE)' as "Titre",
  COUNT(*) as "Nombre de contacts"
FROM prospects
WHERE owner_id = '82be903d-9600-4c53-9cd4-113bfaaac12e';

-- 3. Liste détaillée des contacts de Jack
SELECT 
  p.name as "Nom Prospect",
  p.email as "Email",
  p.phone as "Téléphone",
  p.status as "Statut",
  p.tags as "Projets",
  p.created_at as "Créé le",
  p.owner_id as "Owner ID (doit être 82be903d...)"
FROM prospects p
WHERE p.owner_id = '82be903d-9600-4c53-9cd4-113bfaaac12e'
ORDER BY p.created_at DESC;

-- 4. Vérifier si des contacts utilisent le MAUVAIS UUID (users.id)
SELECT 
  '❌ VIA id (MÉTHODE INCORRECTE - ne devrait rien retourner)' as "Titre",
  COUNT(*) as "Nombre de contacts"
FROM prospects
WHERE owner_id = 'cd73c227-6d2d-4997-bc33-16833f19a34c';

-- 5. Liste complète avec jointure pour vérifier cohérence
SELECT 
  p.name as "Prospect",
  p.email,
  p.owner_id as "Owner UUID",
  u.name as "Owner Name",
  u.email as "Owner Email",
  CASE 
    WHEN p.owner_id = u.user_id THEN '✅ CORRECT'
    WHEN p.owner_id = u.id THEN '❌ MAUVAIS UUID'
    ELSE '⚠️ ORPHELIN'
  END as "Validation"
FROM prospects p
LEFT JOIN users u ON p.owner_id = u.user_id
WHERE u.email LIKE '%jack%' OR u.name LIKE '%Jack%' OR p.owner_id IN (
  '82be903d-9600-4c53-9cd4-113bfaaac12e',  -- Jack user_id (CORRECT)
  'cd73c227-6d2d-4997-bc33-16833f19a34c'   -- Jack id (INCORRECT)
)
ORDER BY p.created_at DESC;
