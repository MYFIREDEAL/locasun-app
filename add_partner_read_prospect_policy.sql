-- =====================================================
-- POLICY: Partenaires peuvent lire les prospects liés à leurs missions
-- Date: 20 fév 2026
-- Problème: RLS sur prospects bloque le partenaire → boutons Appel/Mail/GPS vides
-- Solution: Policy SELECT qui permet au partenaire de lire les infos du prospect
--           uniquement si ce prospect est lié à une mission assignée au partenaire
-- =====================================================

-- Ajouter la politique (sans toucher à la politique admin existante)
DROP POLICY IF EXISTS "partners_can_read_mission_prospects" ON public.prospects;

CREATE POLICY "partners_can_read_mission_prospects"
  ON public.prospects
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 
      FROM public.missions m
      JOIN public.partners p ON p.id = m.partner_id
      WHERE p.user_id = auth.uid()
        AND m.prospect_id = prospects.id
    )
  );

-- Vérification
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'prospects';
