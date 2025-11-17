-- Ajouter policy SELECT pour que les clients puissent lire leurs propres notifications créées
-- (nécessaire pour .insert().select())

DROP POLICY IF EXISTS "clients_select_own_notifications" ON notifications;

CREATE POLICY "clients_select_own_notifications" 
ON notifications
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM prospects
    WHERE prospects.id = notifications.prospect_id
    AND prospects.user_id = auth.uid()
  )
);

-- Ajouter aussi pour les admins (au cas où)
DROP POLICY IF EXISTS "admins_select_notifications" ON notifications;

CREATE POLICY "admins_select_notifications" 
ON notifications
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM prospects
    WHERE prospects.id = notifications.prospect_id
    AND prospects.owner_id = auth.uid()
  )
);

-- Vérifier que les policies sont créées
SELECT 
  policyname,
  cmd,
  roles,
  qual as "USING"
FROM pg_policies
WHERE tablename = 'notifications'
AND cmd = 'SELECT'
ORDER BY policyname;
