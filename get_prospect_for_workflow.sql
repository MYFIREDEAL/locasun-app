-- Récupérer un prospect pour tester Workflow V2
SELECT 
  id,
  name,
  email,
  tags
FROM prospects
WHERE tags IS NOT NULL
  AND array_length(tags, 1) > 0
ORDER BY created_at DESC
LIMIT 3;
