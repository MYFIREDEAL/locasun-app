-- Nettoyage des policies en doublon pour project_steps_status

-- Supprimer les anciennes policies en doublon
DROP POLICY IF EXISTS "Users can manage their prospects steps" ON project_steps_status;
DROP POLICY IF EXISTS "Clients can view their own steps" ON project_steps_status;

-- Vérifier le résultat final (doit rester 4 policies)
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'SELECT' THEN 'Lecture'
    WHEN cmd = 'INSERT' THEN 'Création'
    WHEN cmd = 'UPDATE' THEN 'Modification'
    WHEN cmd = 'DELETE' THEN 'Suppression'
    ELSE cmd
  END as action
FROM pg_policies 
WHERE tablename = 'project_steps_status'
ORDER BY cmd;
