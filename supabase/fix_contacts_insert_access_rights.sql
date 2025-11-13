-- Fix: Permettre aux users avec access_rights.modules=['Contacts'] de créer des prospects

-- Supprimer l'ancienne policy INSERT
DROP POLICY IF EXISTS "Users can insert prospects" ON public.prospects;

-- Recréer avec support des access_rights
CREATE POLICY "Users can insert prospects"
  ON public.prospects
  FOR INSERT
  WITH CHECK (
    -- Le owner_id doit être le user qui crée OU vide (sera auto-assigné par trigger)
    (owner_id = auth.uid() OR owner_id IS NULL) AND
    -- S'assurer que c'est bien un user PRO/Manager/Admin (pas un client)
    EXISTS (
      SELECT 1 FROM public.users
      WHERE user_id = auth.uid() 
      AND (
        role IN ('Commercial', 'Manager', 'Global Admin')
        OR 
        -- OU le user a accès au module Contacts via access_rights
        access_rights->'modules' @> '["Contacts"]'::jsonb
      )
    )
  );
