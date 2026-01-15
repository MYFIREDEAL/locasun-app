-- =====================================================
-- TEST AUTO-MAPPING POUR EVA
-- Vérifier que le formulaire form-1768488893344 existe
-- et voir sa structure pour comprendre l'auto-mapping
-- =====================================================

-- Query #1: Vérifier si le formulaire existe dans la table forms
SELECT 
  form_id,
  name,
  jsonb_array_length(fields) as nb_champs,
  fields,
  project_ids,
  created_at
FROM public.forms
WHERE form_id = 'form-1768488893344';

-- Query #2: Extraire les labels des champs du formulaire
SELECT 
  form_id,
  name,
  jsonb_array_elements(fields) as field
FROM public.forms
WHERE form_id = 'form-1768488893344';

-- Query #3: Voir les données form_data d'Eva pour ce formulaire
SELECT 
  id,
  name,
  email,
  form_data->'ACC'->'form-1768488893344' as eva_form_data,
  jsonb_object_keys(form_data->'ACC'->'form-1768488893344') as field_keys
FROM public.prospects
WHERE email = 'eva.ongoriaz@yopmail.com';

-- Query #4: Liste de TOUS les champs présents dans form_data d'Eva
WITH eva_data AS (
  SELECT 
    id,
    name,
    email,
    form_data->'ACC'->'form-1768488893344' as form_fields
  FROM public.prospects
  WHERE email = 'eva.ongoriaz@yopmail.com'
)
SELECT 
  key as field_id,
  value as field_value
FROM eva_data, jsonb_each_text(form_fields)
ORDER BY key;

-- Query #5: Vérifier la config du workflow "LOCATION DE TOITURE"
SELECT 
  id,
  name,
  steps_config
FROM public.prompts
WHERE name = 'LOCATION DE TOITURE';

-- Query #6: Extraire l'action start_signature du workflow
WITH workflow_steps AS (
  SELECT 
    id,
    name,
    jsonb_array_elements(steps_config) as step
  FROM public.prompts
  WHERE name = 'LOCATION DE TOITURE'
)
SELECT 
  name,
  step->'stepName' as step_name,
  jsonb_array_elements(step->'actions') as action
FROM workflow_steps
WHERE step->'actions' IS NOT NULL;
