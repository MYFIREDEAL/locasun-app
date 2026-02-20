-- =====================================================
-- TRIGGER: Auto-notify admin ciblé quand un collègue envoie un message interne
-- =====================================================
-- Quand un INSERT sur chat_messages avec channel='internal'
-- → Lire metadata->>'target_user_id' pour savoir QUI notifier
-- → Créer ou incrémenter une notification dans la table notifications
-- → project_name = '👥 Message interne' pour distinguer des autres notifs

-- 1️⃣ Fonction trigger
CREATE OR REPLACE FUNCTION notify_admin_on_internal_chat_message()
RETURNS TRIGGER AS $$
DECLARE
  v_target_user_id UUID;
  v_sender_name TEXT;
  v_prospect_name TEXT;
  v_organization_id UUID;
  v_existing_notif_id UUID;
  v_existing_count INT;
BEGIN
  -- Ne s'exécute QUE pour les messages sur channel 'internal'
  IF NEW.channel != 'internal' THEN
    RETURN NEW;
  END IF;

  -- Récupérer le target_user_id depuis les metadata
  v_target_user_id := (NEW.metadata->>'target_user_id')::UUID;
  v_sender_name := COALESCE(NEW.metadata->>'sender_name', 'Collègue');

  -- Si pas de target_user_id dans metadata, on ne peut pas notifier
  IF v_target_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Ne pas notifier l'expéditeur lui-même
  IF v_target_user_id = (NEW.metadata->>'sender_id')::UUID THEN
    RETURN NEW;
  END IF;

  -- Récupérer le nom du prospect et l'organization_id
  SELECT p.name, p.organization_id
  INTO v_prospect_name, v_organization_id
  FROM public.prospects p
  WHERE p.id = NEW.prospect_id;

  -- Vérifier s'il existe déjà une notification non lue INTERNE pour ce prospect+project_type+target
  SELECT id, count INTO v_existing_notif_id, v_existing_count
  FROM public.notifications
  WHERE prospect_id = NEW.prospect_id
    AND project_type = NEW.project_type
    AND project_name = '👥 Message interne'
    AND owner_id = v_target_user_id
    AND read = false
  LIMIT 1;

  IF v_existing_notif_id IS NOT NULL THEN
    -- Incrémenter le compteur
    UPDATE public.notifications
    SET count = v_existing_count + 1,
        created_at = NOW()
    WHERE id = v_existing_notif_id;
  ELSE
    -- Créer une nouvelle notification
    INSERT INTO public.notifications (
      prospect_id,
      owner_id,
      organization_id,
      project_type,
      prospect_name,
      project_name,
      count,
      read
    ) VALUES (
      NEW.prospect_id,
      v_target_user_id,
      v_organization_id,
      NEW.project_type,
      v_prospect_name,
      '👥 Message interne',
      1,
      false
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2️⃣ Trigger sur INSERT chat_messages
DROP TRIGGER IF EXISTS trigger_notify_admin_on_internal_message ON public.chat_messages;
CREATE TRIGGER trigger_notify_admin_on_internal_message
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_on_internal_chat_message();
