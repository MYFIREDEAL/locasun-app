-- ============================================
-- 🔇 PRESENCE SYSTEM + SMART PUSH
-- Date: 13 mars 2026
-- ============================================
-- Pas de push si le client est actif (app visible)
-- Décision CÔTÉ SERVEUR (trigger DB) — seule solution fiable iOS + Android
-- ============================================

-- 1️⃣ Table user_presence
CREATE TABLE IF NOT EXISTS user_presence (
  prospect_id UUID PRIMARY KEY REFERENCES prospects(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT false,
  last_seen TIMESTAMPTZ DEFAULT now()
);

-- 2️⃣ RLS: Le client peut lire/écrire SA propre présence
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_manage_own_presence" ON user_presence;
CREATE POLICY "client_manage_own_presence"
ON user_presence
FOR ALL
TO authenticated
USING (
  prospect_id IN (
    SELECT id FROM prospects WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  prospect_id IN (
    SELECT id FROM prospects WHERE user_id = auth.uid()
  )
);

-- Admins peuvent lire (pour debug)
DROP POLICY IF EXISTS "admin_read_presence" ON user_presence;
CREATE POLICY "admin_read_presence"
ON user_presence
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users WHERE user_id = auth.uid() AND role IN ('Global Admin', 'Manager', 'Commercial')
  )
);

-- 3️⃣ Modifier le trigger push pour vérifier la présence
CREATE OR REPLACE FUNCTION fn_send_push_on_client_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2enh2dGl5eWJpbGtzd3NscWZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3ODgzNDgsImV4cCI6MjA3ODM2NDM0OH0.e-8gRV1ZP3V_zKor5RrpFhKlxd3BwumVhQe6OntZk1U';
  v_has_subscription BOOLEAN;
  v_is_active BOOLEAN;
  v_last_seen TIMESTAMPTZ;
BEGIN
  -- Sur UPDATE : ne déclencher que si le count a changé (nouveau message)
  IF TG_OP = 'UPDATE' THEN
    IF OLD.count IS NOT DISTINCT FROM NEW.count THEN
      RETURN NEW;
    END IF;
  END IF;

  -- 🔇 Vérifier si le client est ACTIF (app visible) — skip push si oui
  SELECT is_active, last_seen
  INTO v_is_active, v_last_seen
  FROM user_presence
  WHERE prospect_id = NEW.prospect_id;

  -- Actif = is_active=true ET last_seen < 30 secondes
  IF v_is_active IS TRUE AND v_last_seen > (now() - interval '30 seconds') THEN
    RAISE LOG '[push] Client % actif (last_seen: %), skip push', NEW.prospect_id, v_last_seen;
    RETURN NEW;
  END IF;

  -- Vérifier qu'il y a au moins une souscription push pour ce prospect
  SELECT EXISTS (
    SELECT 1 FROM push_subscriptions WHERE prospect_id = NEW.prospect_id
  ) INTO v_has_subscription;

  IF NOT v_has_subscription THEN
    RETURN NEW;
  END IF;

  -- Appeler l'Edge Function via pg_net
  PERFORM net.http_post(
    url := 'https://vvzxvtiyybilkswslqfn.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_anon_key
    ),
    body := jsonb_build_object(
      'prospect_id', NEW.prospect_id,
      'title', '💬 Nouveau message',
      'body', COALESCE(LEFT(NEW.message, 100), 'Vous avez un nouveau message'),
      'url', '/dashboard',
      'tag', 'client-msg-' || NEW.prospect_id::text
    ),
    timeout_milliseconds := 15000
  );

  RAISE LOG '[push] Push envoyé au prospect % (op: %)', NEW.prospect_id, TG_OP;
  RETURN NEW;
END;
$$;

-- ===== VÉRIFICATION =====
SELECT 'user_presence table' as check, count(*) as rows FROM user_presence;
