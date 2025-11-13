-- Fix: Corriger la policy INSERT pour vérifier l'ID correct

DROP POLICY IF EXISTS "Users can insert prospects" ON public.prospects;

CREATE POLICY "Users can insert prospects"
  ON public.prospects
  FOR INSERT
  WITH CHECK (
    -- Le owner_id doit correspondre à l'id (PK) du user dans public.users
    -- où user_id (FK vers auth.users) = auth.uid()
    owner_id IN (
      SELECT id FROM public.users WHERE user_id = auth.uid()
    )
    OR owner_id IS NULL -- Ou vide (sera auto-assigné par trigger)
  );
