-- ================================================
-- FONCTION : Créer notification client quand admin envoie message
-- ================================================

CREATE OR REPLACE FUNCTION notify_client_on_admin_message()
RETURNS TRIGGER AS $$
DECLARE
  existing_notif client_notifications%ROWTYPE;
BEGIN
  -- Ne traiter que les messages envoyés par les admins
  IF NEW.sender != 'admin' THEN
    RETURN NEW;
  END IF;

  -- Vérifier si une notification existe déjà
  SELECT * INTO existing_notif
  FROM client_notifications
  WHERE prospect_id = NEW.prospect_id
    AND project_type = NEW.project_type;

  IF FOUND THEN
    -- Incrémenter le compteur
    UPDATE client_notifications
    SET 
      message_count = message_count + 1,
      last_message_at = NEW.created_at,
      is_read = false
    WHERE id = existing_notif.id;
    
    RAISE NOTICE 'Client notification updated for prospect % - count: %', NEW.prospect_id, existing_notif.message_count + 1;
  ELSE
    -- Créer une nouvelle notification
    INSERT INTO client_notifications (
      prospect_id,
      project_type,
      message_count,
      last_message_at,
      is_read
    ) VALUES (
      NEW.prospect_id,
      NEW.project_type,
      1,
      NEW.created_at,
      false
    );
    
    RAISE NOTICE 'New client notification created for prospect %', NEW.prospect_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- TRIGGER : Activer la fonction sur INSERT messages
-- ================================================

DROP TRIGGER IF EXISTS on_admin_message_notify_client ON chat_messages;

CREATE TRIGGER on_admin_message_notify_client
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_client_on_admin_message();

-- ================================================
-- VÉRIFICATION
-- ================================================

-- Vérifier que les deux triggers sont créés
SELECT 
  tgname as trigger_name,
  tgtype as trigger_type,
  tgenabled as enabled
FROM pg_trigger
WHERE tgname IN ('on_client_message_notify_admin', 'on_admin_message_notify_client')
ORDER BY tgname;

-- Résumé des triggers
SELECT 
  'Triggers actifs' as status,
  COUNT(*) as total
FROM pg_trigger
WHERE tgname IN ('on_client_message_notify_admin', 'on_admin_message_notify_client');
