-- 🔍 Vérifier si une tâche de vérification existe pour testjo
SELECT 
  a.id,
  a.type,
  a.title,
  a.contact_id,
  p.name as prospect_name,
  a.project_id,
  a.step,
  a.status,
  a.created_at,
  a.assigned_user_id,
  u.full_name as assigned_to
FROM appointments a
LEFT JOIN prospects p ON a.contact_id = p.id
LEFT JOIN users u ON a.assigned_user_id = u.user_id
WHERE a.type = 'task'
  AND a.title LIKE '%Vérifier le formulaire%'
  AND a.created_at > NOW() - INTERVAL '2 hours'
ORDER BY a.created_at DESC;

-- Vérifier les panels de formulaires pour testjo
SELECT 
  panel_id,
  prospect_id,
  project_type,
  form_id,
  step_name,
  status,
  created_at,
  updated_at
FROM client_form_panels
WHERE prospect_id = (SELECT id FROM prospects WHERE name = 'testjo' LIMIT 1)
ORDER BY created_at DESC;
