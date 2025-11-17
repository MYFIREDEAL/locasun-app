-- ================================================
-- RESTAURER LES POLICIES CHAT_MESSAGES ORIGINALES
-- ================================================

-- 1. SUPPRIMER TOUTES LES POLICIES EXISTANTES
DROP POLICY IF EXISTS "Clients can send messages" ON chat_messages;
DROP POLICY IF EXISTS "Admins can send messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Anyone can insert chat" ON chat_messages;
DROP POLICY IF EXISTS "Users can view their prospects chat" ON chat_messages;
DROP POLICY IF EXISTS "Clients can view their own chat" ON chat_messages;

-- 2. RECRÉER LES POLICIES ORIGINALES DU SCHEMA.SQL

-- USERS PRO peuvent voir et modifier les messages de leurs prospects
CREATE POLICY "Users can view their prospects chat"
  ON public.chat_messages
  FOR ALL
  USING (
    prospect_id IN (
      SELECT id FROM public.prospects WHERE owner_id = auth.uid()
    ) AND
    EXISTS (SELECT 1 FROM public.users WHERE user_id = auth.uid())
  );

-- CLIENTS peuvent voir leurs propres messages
CREATE POLICY "Clients can view their own chat"
  ON public.chat_messages
  FOR SELECT
  USING (
    prospect_id IN (
      SELECT id FROM public.prospects WHERE user_id = auth.uid()
    )
  );

-- CLIENTS peuvent envoyer des messages
CREATE POLICY "Clients can send messages"
  ON public.chat_messages
  FOR INSERT
  WITH CHECK (
    prospect_id IN (
      SELECT id FROM public.prospects WHERE user_id = auth.uid()
    ) AND
    sender = 'client'
  );

-- ================================================
-- VÉRIFICATION
-- ================================================

-- Lister toutes les policies sur chat_messages
SELECT 
  policyname,
  cmd as "Operation",
  CASE 
    WHEN cmd = 'ALL' THEN 'SELECT + INSERT + UPDATE + DELETE'
    ELSE cmd
  END as "Permissions"
FROM pg_policies
WHERE tablename = 'chat_messages'
ORDER BY policyname;

-- Compter les policies
SELECT 'Total policies' as info, COUNT(*) as count
FROM pg_policies
WHERE tablename = 'chat_messages';
