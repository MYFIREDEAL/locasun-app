-- ================================================================
-- MIGRATION: Corriger les anciens status vers les nouvelles colonnes pipeline
-- ================================================================
-- Problème: Prospects créés avant la migration Supabase ont des status
--           de l'ancien système localStorage (ex: "Intéressé", "Qualifié")
--           au lieu des nouveaux step_id de global_pipeline_steps (ex: "MARKET", "ETUDE")
--
-- Date: 3 décembre 2025
-- ================================================================

-- ════════════════════════════════════════════════════════════
-- ÉTAPE 1: DIAGNOSTIC (ne modifie rien)
-- ════════════════════════════════════════════════════════════

-- Afficher Yann Barberis et son status actuel
SELECT 
  id,
  name,
  email,
  status,
  tags,
  created_at
FROM public.prospects
WHERE LOWER(name) LIKE '%yann%' AND LOWER(name) LIKE '%barberis%';

-- Afficher toutes les colonnes du pipeline actuel
SELECT 
  step_id,
  label,
  color,
  position
FROM public.global_pipeline_steps
ORDER BY position;

-- Afficher tous les status distincts utilisés (anciens et nouveaux)
SELECT DISTINCT 
  status, 
  COUNT(*) as nb_prospects
FROM public.prospects
GROUP BY status
ORDER BY nb_prospects DESC;

-- ════════════════════════════════════════════════════════════
-- ÉTAPE 2: MIGRATION DES STATUS
-- ════════════════════════════════════════════════════════════

-- Mapping des anciens status vers les nouveaux:
-- "Intéressé"           → "default-global-pipeline-step-0" (MARKET)
-- "Qualification"       → "default-global-pipeline-step-1" (ETUDE)
-- "Qualifié"            → "default-global-pipeline-step-1" (ETUDE)
-- "Proposition"         → "default-global-pipeline-step-2" (OFFRE)
-- "Négociation"         → "default-global-pipeline-step-2" (OFFRE)
-- Autres status inconnus → "default-global-pipeline-step-0" (MARKET)

-- ⚠️ ATTENTION: Vérifier d'abord les step_id réels dans global_pipeline_steps
-- Si tu as modifié les colonnes, remplacer 'default-global-pipeline-step-X' 
-- par les vrais step_id de ta base

DO $$
DECLARE
  v_market_step_id TEXT;
  v_etude_step_id TEXT;
  v_offre_step_id TEXT;
BEGIN
  -- Récupérer les step_id des colonnes (tri par position)
  SELECT step_id INTO v_market_step_id 
  FROM public.global_pipeline_steps 
  WHERE position = 0;
  
  SELECT step_id INTO v_etude_step_id 
  FROM public.global_pipeline_steps 
  WHERE position = 1;
  
  SELECT step_id INTO v_offre_step_id 
  FROM public.global_pipeline_steps 
  WHERE position = 2;
  
  RAISE NOTICE 'Colonnes détectées:';
  RAISE NOTICE '  Position 0 (MARKET): %', v_market_step_id;
  RAISE NOTICE '  Position 1 (ETUDE): %', v_etude_step_id;
  RAISE NOTICE '  Position 2 (OFFRE): %', v_offre_step_id;
  
  -- Migration "Intéressé" → MARKET (colonne 0)
  UPDATE public.prospects
  SET status = v_market_step_id
  WHERE status = 'Intéressé' OR status LIKE '%intéressé%' OR status LIKE '%Intéresse%';
  
  RAISE NOTICE 'Prospects "Intéressé" migrés vers MARKET: %', (SELECT COUNT(*) FROM public.prospects WHERE status = v_market_step_id);
  
  -- Migration "Qualification" / "Qualifié" → ETUDE (colonne 1)
  UPDATE public.prospects
  SET status = v_etude_step_id
  WHERE status IN ('Qualification', 'Qualifié', 'En cours', 'Contacté');
  
  RAISE NOTICE 'Prospects "Qualifié" migrés vers ETUDE: %', (SELECT COUNT(*) FROM public.prospects WHERE status = v_etude_step_id);
  
  -- Migration "Proposition" / "Négociation" → OFFRE (colonne 2)
  UPDATE public.prospects
  SET status = v_offre_step_id
  WHERE status IN ('Proposition', 'Négociation', 'Devis envoyé', 'Offre');
  
  RAISE NOTICE 'Prospects "Proposition" migrés vers OFFRE: %', (SELECT COUNT(*) FROM public.prospects WHERE status = v_offre_step_id);
  
  -- Migration des status inconnus/invalides → MARKET (colonne 0, défaut)
  UPDATE public.prospects
  SET status = v_market_step_id
  WHERE status NOT IN (
    SELECT step_id FROM public.global_pipeline_steps
  );
  
  RAISE NOTICE 'Prospects avec status invalide migrés vers MARKET';
  
END $$;

-- ════════════════════════════════════════════════════════════
-- ÉTAPE 3: VÉRIFICATION POST-MIGRATION
-- ════════════════════════════════════════════════════════════

-- Vérifier que tous les prospects ont maintenant un status valide
SELECT 
  p.status,
  gps.label as colonne_pipeline,
  COUNT(*) as nb_prospects
FROM public.prospects p
LEFT JOIN public.global_pipeline_steps gps ON p.status = gps.step_id
GROUP BY p.status, gps.label
ORDER BY gps.position NULLS LAST;

-- Vérifier Yann Barberis spécifiquement
SELECT 
  p.name,
  p.email,
  p.status,
  gps.label as colonne_pipeline,
  gps.position
FROM public.prospects p
LEFT JOIN public.global_pipeline_steps gps ON p.status = gps.step_id
WHERE LOWER(p.name) LIKE '%yann%' AND LOWER(p.name) LIKE '%barberis%';

-- ════════════════════════════════════════════════════════════
-- RÉSUMÉ
-- ════════════════════════════════════════════════════════════
-- ✅ Ce script migre TOUS les anciens status localStorage vers les nouveaux step_id Supabase
-- ✅ Yann Barberis passera de "Intéressé" → "default-global-pipeline-step-0" (MARKET)
-- ✅ Tous les prospects apparaîtront dans les bonnes colonnes du pipeline
-- ✅ Safe: utilise les step_id réels de ta base (pas de hardcode)
