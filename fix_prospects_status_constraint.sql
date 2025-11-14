-- =====================================================
-- FIX: Remove obsolete status CHECK constraint
-- =====================================================
-- Le champ "status" contient maintenant des UUIDs de global_pipeline_steps,
-- pas les anciennes valeurs ('Intéressé', 'Lead', etc.)

-- 1. Supprimer l'ancienne contrainte CHECK
ALTER TABLE prospects 
DROP CONSTRAINT IF EXISTS prospects_status_check;

-- 2. Trouver le premier step de chaque pipeline (pour mapper les anciennes valeurs)
DO $$
DECLARE
  first_step_id UUID;
BEGIN
  -- Récupérer le premier step (position=1) du premier pipeline
  SELECT id INTO first_step_id 
  FROM global_pipeline_steps 
  WHERE position = 1 
  LIMIT 1;
  
  -- Migrer toutes les anciennes valeurs texte vers le premier step
  UPDATE prospects 
  SET status = first_step_id::text
  WHERE status IN ('Intéressé', 'Lead', 'Qualified', 'Opportunity', 'Won', 'Lost')
     OR status NOT SIMILAR TO '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
  
  RAISE NOTICE 'Migration terminée: % prospects mis à jour', (
    SELECT COUNT(*) FROM prospects WHERE status = first_step_id::text
  );
END $$;

-- 3. Vérifier les données actuelles
SELECT 
  id,
  name,
  status,
  (SELECT name FROM global_pipeline_steps WHERE id = prospects.status::uuid) as status_name
FROM prospects
ORDER BY created_at DESC
LIMIT 20;
