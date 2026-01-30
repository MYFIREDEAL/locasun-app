-- Debug: Vérifier ce que retourne la requête du hook useSupabaseForms
-- Simule exactement la requête du hook

-- 1. Voir tous les formulaires avec leurs fields
SELECT 
  form_id,
  name,
  fields,
  jsonb_array_length(fields) as nb_fields,
  organization_id,
  audience,
  created_at
FROM forms
ORDER BY created_at DESC;

-- 2. Simuler la requête du hook avec un organization_id fictif
-- (remplace 'YOUR_ORG_ID' par ton organization_id réel depuis la console)
-- SELECT *
-- FROM forms
-- WHERE organization_id = 'YOUR_ORG_ID' OR organization_id IS NULL
-- ORDER BY created_at DESC;

-- 3. Vérifier la structure d'un champ spécifique
SELECT 
  name,
  jsonb_pretty(fields) as fields_pretty
FROM forms
WHERE name = 'test';

-- 4. Vérifier si fields est bien un array JSONB
SELECT 
  name,
  pg_typeof(fields) as fields_type,
  jsonb_typeof(fields) as jsonb_type,
  fields
FROM forms
WHERE name = 'test';
