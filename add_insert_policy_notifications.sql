-- ================================================
-- FIX: Permettre aux CLIENTS de créer des notifications pour les ADMINS
-- Description: Quand un client envoie un message, il doit pouvoir créer une notification pour son admin
-- Date : 12 janvier 2026
-- ================================================

-- Policy INSERT pour notifications : Clients peuvent créer des notifications pour leur admin
CREATE POLICY "Clients can create notifications for their admin"
  ON public.notifications
  FOR INSERT
  WITH CHECK (
    -- Le client doit être le propriétaire du prospect
    prospect_id IN (
      SELECT id FROM public.prospects WHERE user_id = auth.uid()
    )
  );

-- Vérification
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'notifications'
ORDER BY policyname;
