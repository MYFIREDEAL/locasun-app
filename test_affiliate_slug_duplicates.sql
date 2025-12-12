-- ============================================================================
-- TEST: Gestion des doublons de slugs d'affiliation
-- ============================================================================
-- OBJECTIF: Vérifier que le système génère automatiquement des slugs uniques
--           même si plusieurs commerciaux ont le même prénom
-- ============================================================================

-- 📋 COMMENT ÇA FONCTIONNE ?
-- Le trigger `generate_affiliate_slug()` dans schema.sql (lignes 159-188) :
-- 1. Génère un slug de base : "Charly Dupont" → "charly-dupont"
-- 2. Vérifie si le slug existe déjà
-- 3. Si doublon → Ajoute un suffixe numérique : "charly-dupont-2", "charly-dupont-3", etc.
-- 4. Continue jusqu'à trouver un slug unique

-- ============================================================================
-- 1️⃣ VÉRIFIER LES SLUGS EXISTANTS POUR UN PRÉNOM DONNÉ
-- ============================================================================

-- Exemple : Tous les "Charly"
SELECT 
  id,
  name,
  email,
  role,
  affiliate_slug,
  affiliate_link,
  created_at
FROM public.users
WHERE 
  LOWER(name) LIKE '%charly%'
  AND role IN ('Commercial', 'Manager', 'Global Admin')
ORDER BY created_at;

-- Résultat attendu :
-- name             | affiliate_slug  | affiliate_link
-- -----------------+-----------------+----------------------------------------
-- Charly Dupont    | charly-dupont   | https://evatime.fr/inscription/charly-dupont
-- Charly Martin    | charly-martin   | https://evatime.fr/inscription/charly-martin
-- Charly Dupont    | charly-dupont-2 | https://evatime.fr/inscription/charly-dupont-2

-- ============================================================================
-- 2️⃣ SIMULER LA CRÉATION DE DOUBLONS (TEST EN DEV UNIQUEMENT)
-- ============================================================================

-- ⚠️ NE PAS EXÉCUTER EN PRODUCTION - TEST UNIQUEMENT

-- Créer un premier "Jean Martin"
-- INSERT INTO public.users (user_id, name, email, role)
-- VALUES (
--   gen_random_uuid(),
--   'Jean Martin',
--   'jean.martin@test.com',
--   'Commercial'
-- );
-- → slug généré : jean-martin

-- Créer un deuxième "Jean Martin"
-- INSERT INTO public.users (user_id, name, email, role)
-- VALUES (
--   gen_random_uuid(),
--   'Jean Martin',
--   'jean.martin2@test.com',
--   'Commercial'
-- );
-- → slug généré : jean-martin-2

-- Créer un troisième "Jean Martin"
-- INSERT INTO public.users (user_id, name, email, role)
-- VALUES (
--   gen_random_uuid(),
--   'Jean Martin',
--   'jean.martin3@test.com',
--   'Commercial'
-- );
-- → slug généré : jean-martin-3

-- ============================================================================
-- 3️⃣ VÉRIFIER QU'IL N'Y A AUCUN DOUBLON DE SLUG
-- ============================================================================

SELECT 
  affiliate_slug,
  COUNT(*) as occurrences
FROM public.users
WHERE 
  affiliate_slug IS NOT NULL
  AND role IN ('Commercial', 'Manager', 'Global Admin')
GROUP BY affiliate_slug
HAVING COUNT(*) > 1;

-- ✅ Résultat attendu : AUCUNE LIGNE (0 rows)
-- Si des lignes apparaissent, il y a un problème avec le trigger

-- ============================================================================
-- 4️⃣ LISTER TOUS LES SLUGS D'AFFILIATION
-- ============================================================================

SELECT 
  name,
  email,
  role,
  affiliate_slug,
  created_at
FROM public.users
WHERE 
  role IN ('Commercial', 'Manager', 'Global Admin')
  AND affiliate_slug IS NOT NULL
ORDER BY affiliate_slug;

-- ============================================================================
-- 5️⃣ RECHERCHER UN SLUG SPÉCIFIQUE (comme le fait RegistrationPage.jsx)
-- ============================================================================

-- Tester si le slug "charly-dupont-2" existe
SELECT 
  id,
  name,
  email,
  affiliate_slug,
  affiliate_link
FROM public.users
WHERE affiliate_slug = 'charly-dupont-2';

-- Si résultat → Le slug existe et pointe vers un commercial spécifique
-- Si vide → Le slug n'existe pas (erreur 404 sur /inscription/charly-dupont-2)

-- ============================================================================
-- 6️⃣ STATISTIQUES SUR LES DOUBLONS
-- ============================================================================

WITH slug_stats AS (
  SELECT 
    REGEXP_REPLACE(affiliate_slug, '-[0-9]+$', '') as base_slug,
    affiliate_slug,
    name,
    email
  FROM public.users
  WHERE 
    affiliate_slug IS NOT NULL
    AND role IN ('Commercial', 'Manager', 'Global Admin')
)
SELECT 
  base_slug,
  COUNT(*) as total_variants,
  ARRAY_AGG(affiliate_slug ORDER BY affiliate_slug) as all_slugs,
  ARRAY_AGG(name ORDER BY affiliate_slug) as all_names
FROM slug_stats
GROUP BY base_slug
HAVING COUNT(*) > 1
ORDER BY total_variants DESC;

-- Résultat attendu :
-- base_slug      | total_variants | all_slugs                                      | all_names
-- ---------------+----------------+------------------------------------------------+----------------------------------
-- charly-dupont  | 2              | {charly-dupont, charly-dupont-2}              | {Charly Dupont, Charly Dupont}
-- jean-martin    | 3              | {jean-martin, jean-martin-2, jean-martin-3}   | {Jean Martin, Jean Martin, Jean Martin}

-- ============================================================================
-- 7️⃣ AFFICHER LE LIEN D'AFFILIATION POUR UN USER DONNÉ
-- ============================================================================

-- Remplacer 'jack.luc@example.com' par l'email du commercial
SELECT 
  name,
  email,
  affiliate_slug,
  affiliate_link,
  CASE 
    WHEN affiliate_slug ~ '-[0-9]+$' THEN '⚠️ Slug avec suffixe numérique (doublon résolu)'
    ELSE '✅ Slug unique'
  END as slug_status
FROM public.users
WHERE email = 'jack.luc@example.com';

-- ============================================================================
-- 💡 CONCLUSION
-- ============================================================================

-- ✅ Le système gère AUTOMATIQUEMENT les doublons de prénoms
-- ✅ Chaque commercial a un slug UNIQUE même si plusieurs ont le même nom
-- ✅ Format : "prenom-nom", "prenom-nom-2", "prenom-nom-3", etc.
-- ✅ Le trigger s'exécute AVANT INSERT/UPDATE donc toujours synchronisé
-- ✅ L'unicité est garantie par la contrainte UNIQUE sur affiliate_slug

-- 📌 EXEMPLE RÉEL :
-- - User 1 : "Charly Rosca" → slug = "charly-rosca"
-- - User 2 : "Charly Dupont" → slug = "charly-dupont" (nom de famille différent)
-- - User 3 : "Charly Rosca" (homonyme) → slug = "charly-rosca-2"
-- - User 4 : "Charly Rosca" (homonyme) → slug = "charly-rosca-3"

-- 🔗 LIENS GÉNÉRÉS :
-- - https://evatime.fr/inscription/charly-rosca
-- - https://evatime.fr/inscription/charly-dupont
-- - https://evatime.fr/inscription/charly-rosca-2
-- - https://evatime.fr/inscription/charly-rosca-3
