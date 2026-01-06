-- Politique RLS manquante : permettre aux ADMINS/PROs d'envoyer des messages dans le chat
-- (actuellement seuls les clients peuvent INSERT via la politique "Clients can send messages")

CREATE POLICY "Users can send messages to their prospects"
  ON public.chat_messages
  FOR INSERT
  WITH CHECK (
    prospect_id IN (
      SELECT id FROM public.prospects WHERE owner_id = auth.uid()
    ) AND
    EXISTS (SELECT 1 FROM public.users WHERE user_id = auth.uid()) AND
    sender IN ('admin', 'pro')
  );
