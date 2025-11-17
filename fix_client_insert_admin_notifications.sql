-- ================================================
-- FIX: Permettre aux clients de créer des notifications admin
-- ================================================

-- Les clients peuvent créer des notifications pour leur admin (quand ils envoient un message)
DROP POLICY IF EXISTS "clients_insert_admin_notifications" ON notifications;

CREATE POLICY "clients_insert_admin_notifications" 
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Le client peut créer une notification pour le prospect dont il est propriétaire
    EXISTS (
      SELECT 1 FROM prospects
      WHERE prospects.id = notifications.prospect_id
      AND prospects.user_id = auth.uid()
    )
  );

-- Vérifier que la policy est créée
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'notifications'
AND cmd = 'INSERT'
ORDER BY policyname;

-- Test: Compter les policies INSERT sur notifications
SELECT 
  'Policies INSERT sur notifications' as info,
  COUNT(*) as count
FROM pg_policies
WHERE tablename = 'notifications'
AND cmd = 'INSERT';
