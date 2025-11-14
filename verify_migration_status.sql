-- Vérifier que la migration a bien fonctionné
SELECT 
  p.id,
  p.name as prospect_name,
  p.status as status_uuid,
  gps.label as status_label,
  gps.position as status_position
FROM prospects p
LEFT JOIN global_pipeline_steps gps ON gps.id = p.status::uuid
ORDER BY p.created_at DESC
LIMIT 20;

-- Vérifier les steps disponibles dans global_pipeline_steps
SELECT 
  id,
  step_id,
  label,
  color,
  position
FROM global_pipeline_steps
ORDER BY position;
