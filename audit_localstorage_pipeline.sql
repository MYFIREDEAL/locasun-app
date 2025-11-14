-- Audit complet des localStorage à migrer vers Supabase

-- 1. Vérifier la table project_steps_status (pour les étapes par projet/prospect)
SELECT 
  'project_steps_status' as table_name,
  COUNT(*) as total_rows,
  COUNT(DISTINCT prospect_id) as unique_prospects,
  COUNT(DISTINCT project_type) as unique_project_types
FROM public.project_steps_status;

-- 2. Voir un exemple de données
SELECT 
  prospect_id,
  project_type,
  steps,
  created_at,
  updated_at
FROM public.project_steps_status
LIMIT 3;

-- 3. Vérifier s'il existe une table pour les pipelines globaux
SELECT 
  table_name,
  table_schema
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE '%pipeline%'
ORDER BY table_name;

-- 4. Vérifier le champ settings de company_settings
SELECT 
  id,
  company_name,
  settings,
  jsonb_pretty(settings) as settings_formatted,
  CASE 
    WHEN settings ? 'form_contact_config' THEN '✅ form_contact_config présent'
    ELSE '❌ form_contact_config manquant'
  END as form_status,
  CASE 
    WHEN settings ? 'global_pipeline_steps' THEN '✅ global_pipeline_steps présent'
    ELSE '❌ global_pipeline_steps manquant'
  END as pipeline_status
FROM public.company_settings;

-- 5. Structure attendue pour les pipelines globaux dans settings:
-- {
--   "form_contact_config": [...],
--   "global_pipeline_steps": [
--     {
--       "id": "uuid",
--       "name": "Nom du projet",
--       "steps": [
--         {"id": "uuid", "name": "Étape 1", "status": "in-progress", ...}
--       ]
--     }
--   ]
-- }
