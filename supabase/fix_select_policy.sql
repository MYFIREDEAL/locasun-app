-- Fix: Ajouter une policy SELECT explicite pour Global Admin
-- Actuellement, la policy "FOR ALL" n'est pas suffisante pour le .select() après UPDATE

-- D'abord, supprimer TOUTES les anciennes policies Global Admin
DROP POLICY IF EXISTS "Global Admin can manage all users" ON public.users;
DROP POLICY IF EXISTS "Global Admin can select all users" ON public.users;
DROP POLICY IF EXISTS "Global Admin can insert users" ON public.users;
DROP POLICY IF EXISTS "Global Admin can update all users" ON public.users;
DROP POLICY IF EXISTS "Global Admin can delete users" ON public.users;

-- Recréer avec des policies séparées pour plus de clarté
CREATE POLICY "Global Admin can select all users"
  ON public.users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE user_id = auth.uid() AND role = 'Global Admin'
    )
  );

CREATE POLICY "Global Admin can insert users"
  ON public.users
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE user_id = auth.uid() AND role = 'Global Admin'
    )
  );

CREATE POLICY "Global Admin can update all users"
  ON public.users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE user_id = auth.uid() AND role = 'Global Admin'
    )
  );

CREATE POLICY "Global Admin can delete users"
  ON public.users
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE user_id = auth.uid() AND role = 'Global Admin'
    )
  );
