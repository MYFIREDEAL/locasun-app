-- ✅ CORRECTION : Permettre aux utilisateurs authentifiés de créer leur propre prospect lors de l'inscription
-- Problème : Erreur 401 lors de l'inscription client (RegistrationPage)
-- Solution : Ajouter une policy pour permettre l'auto-inscription

-- Supprimer l'ancienne policy INSERT si elle existe
DROP POLICY IF EXISTS "prospects_self_insert" ON prospects;

-- Créer une nouvelle policy permettant l'auto-inscription
CREATE POLICY "prospects_self_insert" ON prospects
FOR INSERT
TO authenticated
WITH CHECK (
  -- Permettre l'insertion uniquement si le user_id correspond au user authentifié
  auth.uid() = user_id
  OR
  -- OU si c'est un admin qui crée le prospect (owner_id est dans la table users)
  EXISTS (
    SELECT 1 FROM users
    WHERE users.user_id = auth.uid()
  )
);

-- Vérifier les policies existantes
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
WHERE tablename = 'prospects'
ORDER BY policyname;
