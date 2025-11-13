-- =====================================================
-- FIX: Ajouter policy pour permettre l'insertion d'utilisateurs
-- =====================================================
-- Date: 13 novembre 2025
-- Issue: Les Global Admin ne peuvent pas créer de nouveaux utilisateurs
--
-- Solution: Ajouter une policy INSERT pour les Global Admin
-- =====================================================

-- Vérifier les policies existantes
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'users';

-- Ajouter la policy INSERT pour les Global Admin
CREATE POLICY "Global Admin can insert users"
  ON public.users
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE user_id = auth.uid() AND role = 'Global Admin'
    )
  );

-- Vérifier que la policy a été créée
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'users' AND cmd = 'INSERT';
