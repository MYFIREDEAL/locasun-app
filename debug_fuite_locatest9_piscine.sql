-- =====================================================
-- INVESTIGATION FUITE MULTI-TENANT : locatest9 piscine
-- Date : 15 février 2026
-- Problème : Sur isabelle.evatime.fr, on voit le projet "piscine"
--            qui appartient à Rosca Finance (autre org)
-- =====================================================

-- 1️⃣ Vérifier tous les prospects locatest9
SELECT 
  id,
  email,
  name,
  user_id,
  organization_id,
  tags,
  created_at
FROM prospects
WHERE email = 'locatest9@yopmail.com'
ORDER BY created_at;

-- 2️⃣ Identifier l'organization_id d'Isabelle Market
SELECT 
  id as org_id,
  name as org_name,
  slug
FROM organizations
WHERE name ILIKE '%isabelle%' OR slug ILIKE '%isabelle%';

-- 3️⃣ Identifier l'organization_id de Rosca Finance
SELECT 
  id as org_id,
  name as org_name,
  slug
FROM organizations
WHERE name ILIKE '%rosca%' OR slug ILIKE '%rosca%';

-- 4️⃣ Vérifier quel prospect a le tag "piscine"
SELECT 
  p.id,
  p.email,
  p.organization_id,
  p.tags,
  o.name as org_name,
  o.slug as org_slug
FROM prospects p
JOIN organizations o ON o.id = p.organization_id
WHERE p.email = 'locatest9@yopmail.com'
  AND 'piscine' = ANY(p.tags);

-- 5️⃣ Vérifier les project_steps_status pour "piscine"
SELECT 
  pss.id,
  pss.prospect_id,
  pss.project_type,
  pss.organization_id,
  p.email,
  o.name as org_name
FROM project_steps_status pss
JOIN prospects p ON p.id = pss.prospect_id
LEFT JOIN organizations o ON o.id = pss.organization_id
WHERE p.email = 'locatest9@yopmail.com'
  AND pss.project_type = 'piscine';

-- 6️⃣ CRITIQUE : Vérifier les RLS policies sur prospects
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'prospects'
ORDER BY policyname;

-- 7️⃣ Tester : Est-ce que l'admin Isabelle voit des prospects d'autres orgs ?
-- (Remplacer UUID par celui de l'admin Isabelle)
-- SELECT COUNT(*) FROM prospects WHERE organization_id != 'isabelle-org-id';

-- =====================================================
-- RÉSULTATS ATTENDUS SI FUITE MULTI-TENANT
-- =====================================================
-- Requête #4 : 
--   - prospect avec piscine a organization_id = Rosca
--   - Mais visible sur isabelle.evatime.fr
--
-- Requête #5 :
--   - project_steps_status.organization_id != prospect.organization_id
--   - OU project_steps_status.organization_id = NULL (DANGER)
--
-- Requête #6 :
--   - RLS policy manquante ou mal configurée (fallback NULL)
-- =====================================================
