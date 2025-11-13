-- ROLLBACK: Restaurer la policy "FOR ALL" qui marchait avant

-- Supprimer les policies séparées
DROP POLICY IF EXISTS "Global Admin can select all users" ON public.users;
DROP POLICY IF EXISTS "Global Admin can insert users" ON public.users;
DROP POLICY IF EXISTS "Global Admin can update all users" ON public.users;
DROP POLICY IF EXISTS "Global Admin can delete users" ON public.users;

-- Recréer la policy "FOR ALL" originale
CREATE POLICY "Global Admin can manage all users"
  ON public.users
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE user_id = auth.uid() AND role = 'Global Admin'
    )
  );
