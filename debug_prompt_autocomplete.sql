-- Debug: Vérifier pourquoi le prompt n'est pas trouvé pour l'auto-complete

-- 0. Voir la structure de client_form_panels
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'client_form_panels'
ORDER BY ordinal_position;

-- 1. Voir les client_form_panels pour joeblackyes (sans prompt_id pour l'instant)
SELECT *
FROM client_form_panels
WHERE prospect_id = '77a38933-2e4e-4930-b4c0-991131a06569'
ORDER BY created_at DESC;

-- 2. Voir tous les prompts disponibles
SELECT 
  id,
  name,
  project_id,
  steps_config
FROM prompts
ORDER BY created_at DESC;

-- 3. Vérifier si le prompt a autoCompleteStep activé
SELECT 
  id,
  name,
  project_id,
  jsonb_pretty(steps_config) as steps_config_pretty
FROM prompts
WHERE project_id = 'autonome';

-- 4. Chercher un prompt qui matche form-1764378326229
SELECT 
  p.id,
  p.name,
  p.project_id,
  jsonb_pretty(p.steps_config) as config
FROM prompts p
WHERE p.steps_config::text LIKE '%form-1764378326229%';
