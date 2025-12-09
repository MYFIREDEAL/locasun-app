-- =====================================================
-- TEST SYSTÈME D'AFFILIATION PRO
-- =====================================================
-- Ce script teste que les liens d'affiliation fonctionnent correctement
-- en attribuant automatiquement les prospects au bon commercial

-- =====================================================
-- ÉTAPE 1: Vérifier que les users ont bien un affiliate_slug
-- =====================================================
SELECT 
  id,
  name,
  email,
  role,
  affiliate_slug,
  affiliate_link
FROM public.users
WHERE role IN ('Commercial', 'Manager', 'Global Admin')
ORDER BY name;

-- =====================================================
-- ÉTAPE 2: Tester la recherche par affiliate_slug
-- =====================================================
-- Simule ce que fait RegistrationPage.jsx ligne 54-62

-- Test avec Jack Luc (exemple)
SELECT id, name, affiliate_slug
FROM public.users
WHERE affiliate_slug = 'jack-luc';  -- Remplacer par votre slug

-- =====================================================
-- ÉTAPE 3: Vérifier les prospects créés via affiliation
-- =====================================================
-- Liste tous les prospects avec leur commercial et le nom d'affiliation

SELECT 
  p.id,
  p.name AS prospect_name,
  p.email,
  p.affiliate_name,
  u.name AS owner_name,
  u.affiliate_slug AS owner_slug,
  p.created_at
FROM public.prospects p
LEFT JOIN public.users u ON p.owner_id = u.id
WHERE p.affiliate_name IS NOT NULL
ORDER BY p.created_at DESC
LIMIT 20;

-- =====================================================
-- ÉTAPE 4: Tester la création d'un prospect via lien d'affiliation
-- =====================================================
-- ⚠️ Ce test doit être fait depuis l'application frontend
-- car il nécessite l'envoi du Magic Link Supabase Auth

-- URL de test (remplacer {slug} par un slug réel) :
-- https://evatime.fr/inscription/{slug}
-- Exemple : https://evatime.fr/inscription/jack-luc

-- Après inscription, vérifier que le prospect a bien :
-- - owner_id = ID du commercial avec ce slug
-- - affiliate_name = Nom du commercial

-- =====================================================
-- ÉTAPE 5: Compter les prospects par commercial (attribution)
-- =====================================================
SELECT 
  u.name AS commercial,
  u.affiliate_slug,
  COUNT(p.id) AS nb_prospects,
  COUNT(CASE WHEN p.affiliate_name IS NOT NULL THEN 1 END) AS nb_via_affiliation,
  COUNT(CASE WHEN p.created_at > NOW() - INTERVAL '7 days' THEN 1 END) AS nb_last_7_days
FROM public.users u
LEFT JOIN public.prospects p ON p.owner_id = u.id
WHERE u.role IN ('Commercial', 'Manager', 'Global Admin')
GROUP BY u.id, u.name, u.affiliate_slug
ORDER BY nb_prospects DESC;

-- =====================================================
-- RÉSULTATS ATTENDUS
-- =====================================================
-- ✅ ÉTAPE 1 : Tous les users PRO doivent avoir un affiliate_slug et affiliate_link
-- ✅ ÉTAPE 2 : La recherche par slug doit retourner exactement 1 user
-- ✅ ÉTAPE 3 : Les prospects créés via affiliation doivent avoir :
--    - owner_id = ID du commercial
--    - affiliate_name = Nom du commercial
-- ✅ ÉTAPE 5 : Les statistiques doivent montrer l'attribution correcte
