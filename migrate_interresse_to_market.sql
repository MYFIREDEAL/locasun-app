-- =====================================================
-- MIGRATION DES PROSPECTS "Intéressé" VERS MARKET
-- =====================================================
-- Date: 1 décembre 2025
-- Objectif: Corriger les prospects avec status "Intéressé" qui ne s'affichent pas

-- 1. Vérifier les colonnes actuelles du pipeline
SELECT 
  step_id,
  label,
  position
FROM public.global_pipeline_steps
ORDER BY position;

-- 2. Voir les prospects avec status "Intéressé"
SELECT 
  id,
  name,
  email,
  status,
  tags,
  created_at
FROM public.prospects
WHERE status = 'Intéressé'
ORDER BY created_at DESC;

-- 3. MIGRATION : Déplacer tous les prospects "Intéressé" vers MARKET
-- Récupère automatiquement le step_id de la première colonne (position = 0)
UPDATE public.prospects
SET 
  status = (
    SELECT step_id 
    FROM public.global_pipeline_steps 
    WHERE position = 0 
    LIMIT 1
  ),
  updated_at = NOW()
WHERE status = 'Intéressé';

-- 4. Vérifier que la migration a fonctionné
SELECT 
  id,
  name,
  email,
  status,
  tags,
  created_at
FROM public.prospects
WHERE id IN (
  '8cf99bc6-4424-4e3c-a24c-d02f4ddaabe9', -- fef
  'c9181ca9-3da6-473a-b794-fd338c507576', -- dd
  'cdabc176-9882-4388-bcef-b5c3b47a096c', -- dff
  'd251a242-3362-4db5-a2eb-5d1b0d69f42d', -- basta
  '05030449-b382-4922-acb5-43f8f2e03662'  -- jackouille
)
ORDER BY created_at DESC;

-- 5. Compter les prospects par colonne du pipeline
SELECT 
  gps.label as "Colonne",
  COUNT(p.id) as "Nombre de prospects"
FROM public.global_pipeline_steps gps
LEFT JOIN public.prospects p ON p.status = gps.step_id
GROUP BY gps.label, gps.position
ORDER BY gps.position;

-- 6. Vérifier qu'il ne reste plus de status "Intéressé"
SELECT COUNT(*) as "Prospects avec status Intéressé (doit être 0)"
FROM public.prospects
WHERE status = 'Intéressé';
