-- ============================================
-- 🔔 Trigger : Push notification au CLIENT quand admin envoie message
-- ============================================
-- Problème : le push trigger existant (trg_send_push_on_notification)
--   écoute la table `notifications` → qui est pour les ADMINS
--   Quand l'admin envoie un message, ça écrit dans `client_notifications`
--   → il faut un trigger push sur `client_notifications` aussi !
-- ============================================

CREATE OR REPLACE FUNCTION fn_send_push_on_client_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_service_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2enh2dGl5eWJpbGtzd3NscWZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjc4ODM0OCwiZXhwIjoyMDc4MzY0MzQ4fQ.LBJOwSfIqMx9yj2D0PHvvOzLwHOFbY8IfBM2CWBVuI0';
  v_has_subscription BOOLEAN;
  v_prospect_name TEXT;
BEGIN
  -- Vérifier qu'il y a au moins une souscription push pour ce prospect
  SELECT EXISTS (
    SELECT 1 FROM push_subscriptions WHERE prospect_id = NEW.prospect_id
  ) INTO v_has_subscription;

  IF NOT v_has_subscription THEN
    RETURN NEW;
  END IF;

  -- Récupérer le nom du prospect pour le titre
  SELECT name INTO v_prospect_name
  FROM prospects
  WHERE id = NEW.prospect_id;

  -- Appeler l'Edge Function via pg_net
  PERFORM net.http_post(
    url := 'https://vvzxvtiyybilkswslqfn.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body := jsonb_build_object(
      'prospect_id', NEW.prospect_id,
      'title', '💬 Nouveau message',
      'body', COALESCE(LEFT(NEW.message, 100), 'Vous avez un nouveau message'),
      'url', '/dashboard',
      'tag', 'client-msg-' || NEW.id::text
    ),
    timeout_milliseconds := 15000
  );

  RAISE LOG '[push] Push envoyé au prospect % pour client_notification %', NEW.prospect_id, NEW.id;

  RETURN NEW;
END;
$$;

-- Créer le trigger sur client_notifications
DROP TRIGGER IF EXISTS trg_send_push_on_client_notification ON client_notifications;
CREATE TRIGGER trg_send_push_on_client_notification
  AFTER INSERT ON client_notifications
  FOR EACH ROW
  EXECUTE FUNCTION fn_send_push_on_client_notification();

-- ============================================
-- Vérification
-- ============================================
SELECT 
  tgname as trigger_name,
  c.relname as table_name,
  tgenabled as enabled
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE tgname LIKE '%push%'
ORDER BY tgname;
