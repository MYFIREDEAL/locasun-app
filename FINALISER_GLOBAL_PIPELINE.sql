-- =====================================================
-- FINALISER LA CONFIG - GESTION DES PIPELINES GLOBALES
-- =====================================================
-- Ce qui manque basé sur le diagnostic du 14 nov 2025

-- =====================================================
-- 1. ACTIVER LE REAL-TIME sur global_pipeline_steps
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.global_pipeline_steps;

-- =====================================================
-- 2. AJOUTER POLICY LECTURE pour tous les users PRO
-- =====================================================
-- Actuellement seul Global Admin peut accéder (policy ALL)
-- Il faut que Commercial/Manager puissent VOIR les colonnes du pipeline

CREATE POLICY "All users can view pipeline steps"
  ON public.global_pipeline_steps
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- 3. VÉRIFICATION - Tout est OK maintenant ?
-- =====================================================

-- 3.1. Vérifier real-time activé
SELECT 
  tablename,
  'Real-time activé ✅' as status
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' 
  AND tablename = 'global_pipeline_steps';

-- 3.2. Vérifier les 2 policies (ALL + SELECT)
SELECT 
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'global_pipeline_steps'
ORDER BY cmd;

-- 3.3. Voir les données
SELECT 
  step_id,
  label,
  color,
  position
FROM public.global_pipeline_steps
ORDER BY position;

-- =====================================================
-- ✅ APRÈS AVOIR EXÉCUTÉ CE SQL :
-- =====================================================
-- 1. Real-time activé → sync multi-admins en temps réel
-- 2. Policy SELECT → Commercial/Manager peuvent voir les colonnes
-- 3. Policy ALL → Seul Global Admin peut modifier/créer/supprimer
-- 
-- PROCHAINE ÉTAPE : Créer le hook React useSupabaseGlobalPipeline.js
