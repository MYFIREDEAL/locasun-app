-- Diagnostic des étapes du projet Autonomie pour Baby GIRL

-- 1. Vérifier le prospect Baby GIRL
SELECT id, name, email, tags 
FROM prospects 
WHERE name LIKE '%Baby%' OR name LIKE '%GIRL%';

-- 2. Vérifier les étapes enregistrées dans project_steps_status
SELECT 
  pss.id,
  pss.prospect_id,
  p.name as prospect_name,
  pss.project_type,
  pss.steps,
  pss.created_at,
  pss.updated_at
FROM project_steps_status pss
JOIN prospects p ON p.id = pss.prospect_id
WHERE p.name LIKE '%Baby%' OR p.name LIKE '%GIRL%'
ORDER BY pss.updated_at DESC;

-- 3. Vérifier le template du projet Autonomie
SELECT type, client_title, steps 
FROM project_templates 
WHERE type = 'Autonomie';
