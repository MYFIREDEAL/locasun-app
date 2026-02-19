-- Vérifier que la mission a bien form_ids
SELECT 
  id,
  title,
  form_ids,
  created_at
FROM missions
WHERE title ILIKE '%mike%'
ORDER BY created_at DESC
LIMIT 1;

-- Vérifier que le form_panel a été créé
SELECT 
  panel_id,
  prospect_id,
  project_type,
  form_id,
  status,
  created_at
FROM client_form_panels
WHERE prospect_id = 'dfce4b95-fb61-4c2b-8596-8fdf9b67a9d6'
ORDER BY created_at DESC
LIMIT 3;
