-- =====================================================
-- MIGRATION: Ajout channel + sender 'partner' à chat_messages
-- Date: 20 fév 2026
-- Objectif: Séparer les flux de chat (client ↔ admin VS partner ↔ admin)
--           Multi-tenant strict avec organization_id
-- =====================================================

-- ═══════════════════════════════════════════════════════════════
-- 1️⃣ AJOUTER 'partner' dans la CHECK constraint de sender
-- ═══════════════════════════════════════════════════════════════

-- Supprimer l'ancienne CHECK
ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_sender_check;

-- Recréer avec 'partner' ajouté
ALTER TABLE public.chat_messages 
  ADD CONSTRAINT chat_messages_sender_check 
  CHECK (sender IN ('client', 'admin', 'pro', 'partner'));

-- ═══════════════════════════════════════════════════════════════
-- 2️⃣ AJOUTER colonne channel
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.chat_messages 
  ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'client';

-- CHECK constraint sur channel
ALTER TABLE public.chat_messages 
  ADD CONSTRAINT chat_messages_channel_check 
  CHECK (channel IN ('client', 'partner', 'internal'));

-- 3️⃣ Backfill: tous les messages existants → channel = 'client'
UPDATE public.chat_messages SET channel = 'client' WHERE channel IS NULL;

-- NOT NULL après backfill
ALTER TABLE public.chat_messages ALTER COLUMN channel SET NOT NULL;

-- Index performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_channel 
  ON public.chat_messages(channel);

-- Index composite pour les requêtes fréquentes (prospect + project_type + channel)
CREATE INDEX IF NOT EXISTS idx_chat_messages_prospect_project_channel 
  ON public.chat_messages(prospect_id, project_type, channel);

-- ═══════════════════════════════════════════════════════════════
-- 4️⃣ RLS: Partner peut lire/écrire ses messages (channel='partner')
--         Multi-tenant: organization_id doit matcher
-- ═══════════════════════════════════════════════════════════════

-- Policy SELECT: Partner voit les messages partner de ses missions
DROP POLICY IF EXISTS "partner_read_chat_messages" ON public.chat_messages;
CREATE POLICY "partner_read_chat_messages"
  ON public.chat_messages
  FOR SELECT
  TO authenticated
  USING (
    channel = 'partner'
    AND EXISTS (
      SELECT 1 
      FROM public.missions m
      JOIN public.partners p ON p.id = m.partner_id
      WHERE p.user_id = auth.uid()
        AND m.prospect_id = chat_messages.prospect_id
        AND m.project_type = chat_messages.project_type
        AND p.organization_id = chat_messages.organization_id
    )
  );

-- Policy INSERT: Partner peut envoyer des messages partner
DROP POLICY IF EXISTS "partner_insert_chat_messages" ON public.chat_messages;
CREATE POLICY "partner_insert_chat_messages"
  ON public.chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    channel = 'partner'
    AND sender = 'partner'
    AND EXISTS (
      SELECT 1 
      FROM public.missions m
      JOIN public.partners p ON p.id = m.partner_id
      WHERE p.user_id = auth.uid()
        AND m.prospect_id = chat_messages.prospect_id
        AND m.project_type = chat_messages.project_type
        AND p.organization_id = chat_messages.organization_id
    )
  );

-- Policy UPDATE: Partner peut marquer ses messages comme lus
DROP POLICY IF EXISTS "partner_update_chat_messages" ON public.chat_messages;
CREATE POLICY "partner_update_chat_messages"
  ON public.chat_messages
  FOR UPDATE
  TO authenticated
  USING (
    channel = 'partner'
    AND EXISTS (
      SELECT 1 
      FROM public.missions m
      JOIN public.partners p ON p.id = m.partner_id
      WHERE p.user_id = auth.uid()
        AND m.prospect_id = chat_messages.prospect_id
        AND m.project_type = chat_messages.project_type
        AND p.organization_id = chat_messages.organization_id
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- 5️⃣ RLS: Modifier la policy CLIENT multi-tenant
--         Ajouter AND channel = 'client' pour ne PAS voir les messages partner
-- ═══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "client_own_chat_messages_multi_tenant" ON public.chat_messages;
CREATE POLICY "client_own_chat_messages_multi_tenant"
  ON public.chat_messages
  FOR ALL
  TO authenticated
  USING (
    channel = 'client'
    AND prospect_id IN (
      SELECT id FROM public.prospects 
      WHERE user_id = auth.uid() 
        AND organization_id = chat_messages.organization_id
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- 6️⃣ RLS: Policy ADMIN reste inchangée (voit TOUT son org)
--         La policy admin_all_chat_messages_multi_tenant existante
--         n'a PAS de filtre channel → l'admin voit client + partner + internal
-- ═══════════════════════════════════════════════════════════════

-- Vérifier que la policy admin existe bien (ne pas la toucher)
-- SELECT policyname FROM pg_policies WHERE tablename = 'chat_messages';

-- ═══════════════════════════════════════════════════════════════
-- 7️⃣ Supprimer les anciennes policies non-multi-tenant (si encore présentes)
-- ═══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Users can view their prospects chat" ON public.chat_messages;
DROP POLICY IF EXISTS "Clients can view their own chat" ON public.chat_messages;
DROP POLICY IF EXISTS "Clients can send messages" ON public.chat_messages;

-- ═══════════════════════════════════════════════════════════════
-- VÉRIFICATION
-- ═══════════════════════════════════════════════════════════════

-- Lister toutes les policies actives sur chat_messages:
-- SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'chat_messages';

-- Vérifier la colonne channel:
-- SELECT column_name, data_type, column_default, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'chat_messages' AND column_name = 'channel';

-- Vérifier les CHECK constraints:
-- SELECT conname, consrc FROM pg_constraint 
-- WHERE conrelid = 'public.chat_messages'::regclass AND contype = 'c';
