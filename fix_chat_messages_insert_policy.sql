-- Supprimer et recréer la policy INSERT pour chat_messages
-- (pour fixer l'erreur "column user_id does not exist")

-- Supprimer l'ancienne policy qui pourrait être cassée
DROP POLICY IF EXISTS "Clients can send messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Anyone can insert chat" ON chat_messages;

-- Recréer la policy INSERT pour les clients
CREATE POLICY "Clients can send messages"
  ON chat_messages
  FOR INSERT
  WITH CHECK (
    -- Client doit être le propriétaire du prospect
    prospect_id IN (
      SELECT id FROM prospects WHERE prospects.user_id = auth.uid()
    )
    AND sender = 'client'
  );

-- Recréer la policy INSERT pour les admins
CREATE POLICY "Admins can send messages"
  ON chat_messages
  FOR INSERT
  WITH CHECK (
    -- Admin doit être le owner du prospect
    prospect_id IN (
      SELECT id FROM prospects WHERE prospects.owner_id = auth.uid()
    )
    AND sender IN ('admin', 'pro')
    AND EXISTS (SELECT 1 FROM users WHERE users.user_id = auth.uid())
  );

-- Vérifier que les policies sont créées
SELECT 
  policyname,
  cmd,
  pg_get_expr(polwithcheck, polrelid) as with_check_clause
FROM pg_policy pol
JOIN pg_class cls ON pol.polrelid = cls.oid
WHERE cls.relname = 'chat_messages'
  AND cmd = 'INSERT'
ORDER BY policyname;
