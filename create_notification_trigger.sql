-- ================================================
-- FONCTION : Créer notification admin quand client envoie message
-- ================================================

CREATE OR REPLACE FUNCTION notify_admin_on_client_message()
RETURNS TRIGGER AS $$
DECLARE
  admin_user_id UUID;
  existing_notif notifications%ROWTYPE;
BEGIN
  -- Ne traiter que les messages envoyés par les clients
  IF NEW.sender != 'client' THEN
    RETURN NEW;
  END IF;

  -- Récupérer l'owner_id (admin) du prospect
  SELECT owner_id INTO admin_user_id
  FROM prospects
  WHERE id = NEW.prospect_id;

  -- Si pas d'admin trouvé, on sort
  IF admin_user_id IS NULL THEN
    RAISE NOTICE 'No admin found for prospect %', NEW.prospect_id;
    RETURN NEW;
  END IF;

  -- Vérifier si une notification existe déjà
  SELECT * INTO existing_notif
  FROM notifications
  WHERE prospect_id = NEW.prospect_id
    AND project_type = NEW.project_type
    AND user_id = admin_user_id;

  IF FOUND THEN
    -- Incrémenter le compteur
    UPDATE notifications
    SET 
      message_count = message_count + 1,
      last_message_at = NEW.created_at,
      is_read = false
    WHERE id = existing_notif.id;
    
    RAISE NOTICE 'Notification updated for admin % - count: %', admin_user_id, existing_notif.message_count + 1;
  ELSE
    -- Créer une nouvelle notification
    INSERT INTO notifications (
      user_id,
      prospect_id,
      project_type,
      message_count,
      last_message_at,
      is_read
    ) VALUES (
      admin_user_id,
      NEW.prospect_id,
      NEW.project_type,
      1,
      NEW.created_at,
      false
    );
    
    RAISE NOTICE 'New notification created for admin %', admin_user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- TRIGGER : Activer la fonction sur INSERT messages
-- ================================================

DROP TRIGGER IF EXISTS on_client_message_notify_admin ON chat_messages;

CREATE TRIGGER on_client_message_notify_admin
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_on_client_message();

-- ================================================
-- VÉRIFICATION
-- ================================================

-- Vérifier que le trigger est créé
SELECT 
  tgname as trigger_name,
  tgtype as trigger_type,
  tgenabled as enabled
FROM pg_trigger
WHERE tgname = 'on_client_message_notify_admin';

-- Test : Insérer un message client et vérifier la notification
-- (Remplace les UUIDs par les valeurs réelles si tu veux tester manuellement)
/*
INSERT INTO chat_messages (prospect_id, project_type, sender, message, created_at)
VALUES (
  'e84730fe-5500-4b9c-bf64-0fdd9c98c1fc', -- Eva
  'ACC',
  'client',
  'Test trigger notification',
  NOW()
);

-- Vérifier la notification créée
SELECT * FROM notifications 
WHERE prospect_id = 'e84730fe-5500-4b9c-bf64-0fdd9c98c1fc'
AND project_type = 'ACC'
ORDER BY last_message_at DESC
LIMIT 1;
*/
