-- Ajouter policy SELECT pour que les admins puissent lire les client_notifications

DROP POLICY IF EXISTS "admins_select_client_notifications" ON client_notifications;

CREATE POLICY "admins_select_client_notifications" 
ON client_notifications
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM prospects
    WHERE prospects.id = client_notifications.prospect_id
    AND prospects.owner_id = auth.uid()
  )
);

-- Vérifier que la policy est créée
SELECT 
  policyname,
  cmd,
  roles,
  qual as "USING"
FROM pg_policies
WHERE tablename = 'client_notifications'
AND cmd = 'SELECT'
ORDER BY policyname;
