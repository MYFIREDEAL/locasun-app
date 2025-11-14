-- Fix RLS policies pour project_steps_status
-- Problème: Erreur 403 lors de l'upsert par les admins

-- 1. Vérifier les policies actuelles
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'project_steps_status';

-- 2. Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Admins can view all project steps" ON project_steps_status;
DROP POLICY IF EXISTS "Admins can insert project steps" ON project_steps_status;
DROP POLICY IF EXISTS "Admins can update project steps" ON project_steps_status;
DROP POLICY IF EXISTS "Clients can view their own project steps" ON project_steps_status;

-- 3. Créer les nouvelles policies correctes

-- ✅ SELECT: Admins voient tout, Clients voient uniquement leurs projets
CREATE POLICY "Admins and clients can view project steps"
  ON project_steps_status
  FOR SELECT
  USING (
    -- Admin user peut voir tous les steps
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()
    )
    OR
    -- Client peut voir uniquement ses propres steps
    prospect_id IN (
      SELECT id FROM prospects 
      WHERE prospects.user_id = auth.uid()
    )
  );

-- ✅ INSERT: Admins et system peuvent insérer
CREATE POLICY "Admins can insert project steps"
  ON project_steps_status
  FOR INSERT
  WITH CHECK (
    -- Admin user peut insérer
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()
    )
  );

-- ✅ UPDATE: Admins et system peuvent modifier
CREATE POLICY "Admins can update project steps"
  ON project_steps_status
  FOR UPDATE
  USING (
    -- Admin user peut modifier
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()
    )
  )
  WITH CHECK (
    -- Admin user peut modifier
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()
    )
  );

-- ✅ DELETE: Admins peuvent supprimer
CREATE POLICY "Admins can delete project steps"
  ON project_steps_status
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()
    )
  );

-- 4. Vérifier que RLS est activé
ALTER TABLE project_steps_status ENABLE ROW LEVEL SECURITY;

-- 5. Vérifier les nouvelles policies
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'project_steps_status'
ORDER BY cmd;
