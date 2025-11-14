-- =====================================================
-- DIAGNOSTIC COMPLET - GESTION DES PROJETS (TEMPLATES)
-- =====================================================
-- Date: 14 novembre 2025
-- Objectif: Voir EXACTEMENT ce qui existe dans Supabase

-- =====================================================
-- 1. VOIR TOUTES LES DONNÉES DANS project_templates
-- =====================================================
SELECT 
  id,
  type,
  title,
  client_title,
  icon,
  color,
  is_public,
  jsonb_array_length(steps) as nb_steps,
  created_at
FROM public.project_templates
ORDER BY type;

-- =====================================================
-- 2. COMPTER LES LIGNES
-- =====================================================
SELECT 
  COUNT(*) as total_templates,
  COUNT(*) FILTER (WHERE is_public = true) as public_templates,
  COUNT(*) FILTER (WHERE is_public = false) as private_templates
FROM public.project_templates;

-- =====================================================
-- 3. VÉRIFIER LES POLICIES RLS
-- =====================================================
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'project_templates'
ORDER BY cmd;

-- =====================================================
-- 4. VÉRIFIER SI LE REAL-TIME EST ACTIVÉ
-- =====================================================
SELECT 
  tablename,
  'Real-time activé ✅' as status
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' 
  AND tablename = 'project_templates';

-- =====================================================
-- 5. VOIR LA STRUCTURE DES STEPS (exemple ACC)
-- =====================================================
SELECT 
  type,
  title,
  jsonb_pretty(steps) as steps_structure
FROM public.project_templates
WHERE type = 'ACC'
LIMIT 1;

-- =====================================================
-- RÉSUMÉ : Copier les résultats ci-dessus
-- =====================================================
