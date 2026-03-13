-- ============================================
-- 🔔 Trigger : Envoyer push notification sur INSERT dans notifications
-- ============================================
-- Quand une notification est créée pour un client (prospect),
-- on appelle l'Edge Function send-push-notification
-- pour envoyer une push notification sur son téléphone.
--
-- ⚠️ Prérequis :
-- 1. Table push_subscriptions créée (create_push_subscriptions_table.sql)
-- 2. Edge Function send-push-notification déployée
-- 3. Secrets Supabase configurés : VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY

-- Fonction trigger
CREATE OR REPLACE FUNCTION fn_send_push_on_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_role_key TEXT;
  v_prospect_id UUID;
  v_has_subscription BOOLEAN;
BEGIN
  -- Récupérer le prospect_id depuis le owner_id (qui est le user_id auth)
  SELECT id INTO v_prospect_id
  FROM prospects
  WHERE user_id = NEW.owner_id
  LIMIT 1;

  -- Si pas de prospect trouvé, c'est peut-être un admin → skip
  IF v_prospect_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Vérifier qu'il y a au moins une souscription push pour ce prospect
  SELECT EXISTS (
    SELECT 1 FROM push_subscriptions WHERE prospect_id = v_prospect_id
  ) INTO v_has_subscription;

  IF NOT v_has_subscription THEN
    -- Pas d'abonnement push → rien à faire
    RETURN NEW;
  END IF;

  -- Récupérer l'URL Supabase et la service role key depuis les settings
  -- (on utilise les variables d'environnement du projet)
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  v_service_role_key := current_setting('app.settings.service_role_key', true);

  -- Fallback : utiliser des valeurs par défaut si les settings ne sont pas configurés
  IF v_supabase_url IS NULL OR v_supabase_url = '' THEN
    -- Utiliser net.http_post avec l'URL directe
    -- L'Edge Function sera appelée via pg_net
    PERFORM net.http_post(
      url := 'https://vvzxvtiyybilkswslqfn.supabase.co/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('supabase.service_role_key', true)
      ),
      body := jsonb_build_object(
        'prospect_id', v_prospect_id,
        'title', COALESCE(NEW.title, 'Nouvelle notification'),
        'body', COALESCE(NEW.message, NEW.title, ''),
        'url', '/dashboard',
        'tag', 'notification-' || NEW.id::text
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Créer le trigger sur la table notifications
DROP TRIGGER IF EXISTS trg_send_push_on_notification ON notifications;
CREATE TRIGGER trg_send_push_on_notification
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION fn_send_push_on_notification();
