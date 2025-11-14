-- Vérifier les steps actuels pour Baby GIRL projet ACC

SELECT 
  p.name as prospect_name,
  pss.project_type,
  pss.steps,
  pss.updated_at
FROM project_steps_status pss
JOIN prospects p ON p.id = pss.prospect_id
WHERE p.name LIKE '%Baby%' 
  AND pss.project_type = 'ACC';
