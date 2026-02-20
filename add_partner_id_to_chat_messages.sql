-- =====================================================
-- MIGRATION: Ajout partner_id à chat_messages pour isolation multi-partenaire
-- =====================================================
-- Problème: Si 2 partenaires interviennent sur le même prospect+project_type,
--           ils partagent le même canal channel='partner' → voient les messages de l'autre.
-- Solution: Ajouter partner_id pour isoler les conversations par partenaire.
-- Date: 20 février 2026
-- =====================================================

-- 1️⃣ Ajouter la colonne partner_id (nullable car seuls les messages partner l'utilisent)
ALTER TABLE public.chat_messages 
  ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL;

-- 2️⃣ Index pour les requêtes filtrées par partner_id
CREATE INDEX IF NOT EXISTS idx_chat_messages_partner_id 
  ON public.chat_messages(partner_id) 
  WHERE partner_id IS NOT NULL;

-- Index composite pour les requêtes fréquentes: prospect + project_type + channel + partner
CREATE INDEX IF NOT EXISTS idx_chat_messages_partner_channel 
  ON public.chat_messages(prospect_id, project_type, channel, partner_id) 
  WHERE channel = 'partner';

-- 3️⃣ Mettre à jour les RLS policies pour les partenaires
--    Avant : Partner voit TOUS les messages channel='partner' de ses missions
--    Après : Partner ne voit que les messages avec SON partner_id

-- SELECT: Partner ne voit que ses propres messages (partner_id match)
DROP POLICY IF EXISTS "partner_read_chat_messages" ON public.chat_messages;
CREATE POLICY "partner_read_chat_messages"
  ON public.chat_messages
  FOR SELECT
  TO authenticated
  USING (
    channel = 'partner'
    AND partner_id IS NOT NULL
    AND EXISTS (
      SELECT 1 
      FROM public.partners p
      WHERE p.user_id = auth.uid()
        AND p.id = chat_messages.partner_id
    )
  );

-- INSERT: Partner peut envoyer des messages avec son propre partner_id
DROP POLICY IF EXISTS "partner_insert_chat_messages" ON public.chat_messages;
CREATE POLICY "partner_insert_chat_messages"
  ON public.chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    channel = 'partner'
    AND sender = 'partner'
    AND partner_id IS NOT NULL
    AND EXISTS (
      SELECT 1 
      FROM public.partners p
      WHERE p.user_id = auth.uid()
        AND p.id = chat_messages.partner_id
    )
    AND EXISTS (
      SELECT 1 
      FROM public.missions m
      WHERE m.partner_id = chat_messages.partner_id
        AND m.prospect_id = chat_messages.prospect_id
        AND m.project_type = chat_messages.project_type
    )
  );

-- UPDATE: Partner peut marquer comme lus ses propres messages
DROP POLICY IF EXISTS "partner_update_chat_messages" ON public.chat_messages;
CREATE POLICY "partner_update_chat_messages"
  ON public.chat_messages
  FOR UPDATE
  TO authenticated
  USING (
    channel = 'partner'
    AND partner_id IS NOT NULL
    AND EXISTS (
      SELECT 1 
      FROM public.partners p
      WHERE p.user_id = auth.uid()
        AND p.id = chat_messages.partner_id
    )
  );

-- 4️⃣ Vérification
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'chat_messages' AND column_name = 'partner_id';

-- 5️⃣ Backfill optionnel : Si des messages partner existants n'ont pas de partner_id,
--    on peut les remplir rétroactivement à partir des missions.
--    ⚠️ À exécuter UNIQUEMENT si nécessaire (ne pas exécuter en production sans vérification)
/*
UPDATE public.chat_messages cm
SET partner_id = (
  SELECT m.partner_id 
  FROM public.missions m
  WHERE m.prospect_id = cm.prospect_id
    AND m.project_type = cm.project_type
  LIMIT 1
)
WHERE cm.channel = 'partner' 
  AND cm.partner_id IS NULL;
*/
