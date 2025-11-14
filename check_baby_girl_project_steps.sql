-- Vérifier si Baby GIRL a des steps dans project_steps_status
SELECT 
  pss.prospect_id,
  p.name as prospect_name,
  pss.project_type,
  pss.steps,
  pss.updated_at
FROM project_steps_status pss
LEFT JOIN prospects p ON p.id = pss.prospect_id
WHERE p.name = 'Baby GIRL'
ORDER BY pss.updated_at DESC;

-- Compter le nombre de steps par projet
SELECT 
  project_type,
  COUNT(*) as count
FROM project_steps_status
GROUP BY project_type;
