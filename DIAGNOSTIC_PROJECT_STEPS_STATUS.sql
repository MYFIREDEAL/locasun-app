-- =====================================================
-- DIAGNOSTIC COMPLET - PROJECT STEPS STATUS
-- =====================================================
-- Date: 14 novembre 2025
-- Objectif: Voir EXACTEMENT ce qui existe dans project_steps_status

-- =====================================================
-- 1. VOIR TOUTES LES DONNÉES
-- =====================================================
SELECT 
  id,
  prospect_id,
  project_type,
  jsonb_array_length(steps) as nb_steps,
  created_at,
  updated_at
FROM public.project_steps_status
ORDER BY created_at DESC;

-- =====================================================
-- 2. COMPTER LES LIGNES PAR PROJET
-- =====================================================
SELECT 
  project_type,
  COUNT(*) as nb_prospects_avec_ce_projet
FROM public.project_steps_status
GROUP BY project_type
ORDER BY nb_prospects_avec_ce_projet DESC;

-- =====================================================
-- 3. VÉRIFIER LES POLICIES RLS
-- =====================================================
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'project_steps_status'
ORDER BY cmd;

-- =====================================================
-- 4. VÉRIFIER SI LE REAL-TIME EST ACTIVÉ
-- =====================================================
SELECT 
  tablename,
  'Real-time activé ✅' as status
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' 
  AND tablename = 'project_steps_status';

-- =====================================================
-- 5. VOIR LA STRUCTURE DES STEPS (premier exemple)
-- =====================================================
SELECT 
  prospect_id,
  project_type,
  jsonb_pretty(steps) as steps_structure
FROM public.project_steps_status
LIMIT 1;

-- =====================================================
-- 6. VÉRIFIER LES INDEX
-- =====================================================
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'project_steps_status';

-- =====================================================
-- RÉSUMÉ : Copier les résultats ci-dessus
-- =====================================================
