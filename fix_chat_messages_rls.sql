-- =====================================================
-- FIX: Chat Messages RLS Policies
-- Date: 15 novembre 2025
-- Problème: Erreur 403 lors de l'envoi de messages par les admins
-- Cause: Policy "Admins can manage chat" trop restrictive (owner_id uniquement)
-- Solution: Permettre à TOUS les admins d'envoyer des messages
-- =====================================================

-- 1. Supprimer l'ancienne policy restrictive
DROP POLICY IF EXISTS "Admins can manage chat" ON public.chat_messages;

-- 2. Créer une policy pour que les admins puissent VOIR tous les messages
CREATE POLICY "Admins can view all chat messages"
  ON public.chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE user_id = auth.uid() 
      AND role IN ('Global Admin', 'Manager', 'Commercial')
    )
  );

-- 3. Créer une policy pour que les admins puissent ENVOYER des messages
CREATE POLICY "Admins can send chat messages"
  ON public.chat_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE user_id = auth.uid() 
      AND role IN ('Global Admin', 'Manager', 'Commercial')
    ) AND
    sender IN ('admin', 'pro')
  );

-- 4. Créer une policy pour que les admins puissent MODIFIER des messages (marquer comme lu)
CREATE POLICY "Admins can update chat messages"
  ON public.chat_messages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE user_id = auth.uid() 
      AND role IN ('Global Admin', 'Manager', 'Commercial')
    )
  );

-- 5. Vérifier que les policies clients sont toujours là
-- (Ne pas supprimer, juste vérifier)

-- Policy client SELECT (déjà existante - ne pas modifier)
-- CREATE POLICY "Clients can view their own chat"
--   ON public.chat_messages FOR SELECT
--   USING (prospect_id IN (SELECT id FROM public.prospects WHERE user_id = auth.uid()));

-- Policy client INSERT (déjà existante - ne pas modifier)
-- CREATE POLICY "Clients can send messages"
--   ON public.chat_messages FOR INSERT
--   WITH CHECK (prospect_id IN (SELECT id FROM public.prospects WHERE user_id = auth.uid()) AND sender = 'client');

-- 6. Activer RLS (au cas où)
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- VÉRIFICATION
-- =====================================================

-- Lister toutes les policies sur chat_messages
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'chat_messages'
ORDER BY policyname;

-- =====================================================
-- RÉSULTAT ATTENDU
-- =====================================================
-- 5 policies au total :
-- 1. "Admins can view all chat messages" (SELECT) ✅
-- 2. "Admins can send chat messages" (INSERT) ✅
-- 3. "Admins can update chat messages" (UPDATE) ✅
-- 4. "Clients can view their own chat" (SELECT) ✅
-- 5. "Clients can send messages" (INSERT) ✅
-- =====================================================
