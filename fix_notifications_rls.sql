-- Fix RLS policies pour permettre la création de notifications

-- ========== NOTIFICATIONS ADMIN ==========
-- Les admins peuvent créer des notifications pour leurs prospects
DROP POLICY IF EXISTS "admins_insert_own_notifications" ON notifications;
CREATE POLICY "admins_insert_own_notifications" ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM prospects
      WHERE prospects.id = notifications.prospect_id
      AND prospects.owner_id = auth.uid()
    )
  );

-- Les admins peuvent mettre à jour leurs notifications
DROP POLICY IF EXISTS "admins_update_own_notifications" ON notifications;
CREATE POLICY "admins_update_own_notifications" ON notifications
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM prospects
      WHERE prospects.id = notifications.prospect_id
      AND prospects.owner_id = auth.uid()
    )
  );

-- ========== NOTIFICATIONS CLIENT ==========
-- Les admins peuvent créer des notifications pour leurs prospects (clients)
DROP POLICY IF EXISTS "admins_insert_client_notifications" ON client_notifications;
CREATE POLICY "admins_insert_client_notifications" ON client_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM prospects
      WHERE prospects.id = client_notifications.prospect_id
      AND prospects.owner_id = auth.uid()
    )
  );

-- Les clients peuvent créer leurs propres notifications (quand ils envoient un message)
DROP POLICY IF EXISTS "clients_insert_own_notifications" ON client_notifications;
CREATE POLICY "clients_insert_own_notifications" ON client_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM prospects
      WHERE prospects.id = client_notifications.prospect_id
      AND prospects.user_id = auth.uid()
    )
  );

-- Les admins peuvent mettre à jour les notifications de leurs prospects
DROP POLICY IF EXISTS "admins_update_client_notifications" ON client_notifications;
CREATE POLICY "admins_update_client_notifications" ON client_notifications
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM prospects
      WHERE prospects.id = client_notifications.prospect_id
      AND prospects.owner_id = auth.uid()
    )
  );

-- Les clients peuvent mettre à jour leurs propres notifications (marquer comme lu)
DROP POLICY IF EXISTS "clients_update_own_notifications" ON client_notifications;
CREATE POLICY "clients_update_own_notifications" ON client_notifications
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM prospects
      WHERE prospects.id = client_notifications.prospect_id
      AND prospects.user_id = auth.uid()
    )
  );

-- Vérifier les policies
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('notifications', 'client_notifications')
ORDER BY tablename, policyname;
