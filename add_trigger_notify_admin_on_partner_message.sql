-- =====================================================
-- TRIGGER: Auto-notify admin quand un partenaire envoie un message chat
-- =====================================================
-- Quand un INSERT sur chat_messages avec sender='partner' et channel='partner'
-- → Créer ou incrémenter une notification admin dans la table notifications
-- → Utilise owner_id du prospect comme destinataire de la notif
-- → organization_id auto-fill par le trigger existant sur notifications

-- 1️⃣ Fonction trigger
CREATE OR REPLACE FUNCTION notify_admin_on_partner_chat_message()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_id UUID;
  v_prospect_name TEXT;
  v_organization_id UUID;
  v_existing_notif_id UUID;
  v_existing_count INT;
BEGIN
  -- Ne s'exécute QUE pour les messages partner sur channel partner
  IF NEW.sender != 'partner' OR NEW.channel != 'partner' THEN
    RETURN NEW;
  END IF;

  -- Récupérer le owner_id et le nom du prospect
  SELECT p.owner_id, p.name, p.organization_id
  INTO v_owner_id, v_prospect_name, v_organization_id
  FROM public.prospects p
  WHERE p.id = NEW.prospect_id;

  -- Si pas de owner_id, on ne peut pas notifier
  IF v_owner_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Vérifier s'il existe déjà une notification non lue PARTENAIRE pour ce prospect+project_type
  SELECT id, count INTO v_existing_notif_id, v_existing_count
  FROM public.notifications
  WHERE prospect_id = NEW.prospect_id
    AND project_type = NEW.project_type
    AND project_name = '🟠 Message partenaire'
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
      v_owner_id,
      v_organization_id,
      NEW.project_type,
      v_prospect_name,
      '🟠 Message partenaire',
      1,
      false
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2️⃣ Trigger sur INSERT chat_messages
DROP TRIGGER IF EXISTS trigger_notify_admin_on_partner_message ON public.chat_messages;
CREATE TRIGGER trigger_notify_admin_on_partner_message
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_on_partner_chat_message();
