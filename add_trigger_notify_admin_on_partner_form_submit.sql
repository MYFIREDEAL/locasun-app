-- =====================================================
-- TRIGGER: Auto-notify admin quand un partenaire soumet un formulaire
-- =====================================================
-- Quand un UPDATE sur client_form_panels avec status='submitted' et filled_by_role='partner'
-- → Notifier le owner_id du prospect
-- → project_name = '🟠 Formulaire partenaire soumis'

-- 1️⃣ Fonction trigger
CREATE OR REPLACE FUNCTION notify_admin_on_partner_form_submit()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_id UUID;
  v_prospect_name TEXT;
  v_organization_id UUID;
  v_existing_notif_id UUID;
  v_existing_count INT;
BEGIN
  -- GARDE 1 : status passe à 'submitted'
  IF NEW.status <> 'submitted' THEN RETURN NEW; END IF;
  IF OLD.status = 'submitted' THEN RETURN NEW; END IF;
  
  -- GARDE 2 : uniquement les formulaires remplis par un partenaire
  IF NEW.filled_by_role IS NULL OR NEW.filled_by_role <> 'partner' THEN
    RETURN NEW;
  END IF;

  -- Récupérer le owner_id, nom du prospect, et organization_id
  SELECT p.owner_id, p.name, p.organization_id
  INTO v_owner_id, v_prospect_name, v_organization_id
  FROM public.prospects p
  WHERE p.id = NEW.prospect_id;

  -- Si pas de owner_id, on ne peut pas notifier
  IF v_owner_id IS NULL THEN
    RAISE LOG '[Notif Partner Form] Pas de owner_id pour prospect %, skip', NEW.prospect_id;
    RETURN NEW;
  END IF;

  -- Vérifier s'il existe déjà une notification non lue pour ce prospect+project_type
  SELECT id, count INTO v_existing_notif_id, v_existing_count
  FROM public.notifications
  WHERE prospect_id = NEW.prospect_id
    AND project_type = NEW.project_type
    AND project_name = '🟠 Formulaire partenaire soumis'
    AND read = false
  LIMIT 1;

  IF v_existing_notif_id IS NOT NULL THEN
    -- Incrémenter le compteur
    UPDATE public.notifications
    SET count = v_existing_count + 1,
        created_at = NOW()
    WHERE id = v_existing_notif_id;
    
    RAISE LOG '[Notif Partner Form] Notification existante incrémentée (count=%) pour prospect %', v_existing_count + 1, NEW.prospect_id;
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
      '🟠 Formulaire partenaire soumis',
      1,
      false
    );
    
    RAISE LOG '[Notif Partner Form] ✅ Notification créée pour prospect % → admin %', NEW.prospect_id, v_owner_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2️⃣ Trigger sur UPDATE de client_form_panels
DROP TRIGGER IF EXISTS trigger_notify_admin_on_partner_form_submit ON public.client_form_panels;
CREATE TRIGGER trigger_notify_admin_on_partner_form_submit
  AFTER UPDATE OF status ON public.client_form_panels
  FOR EACH ROW
  WHEN (NEW.status = 'submitted' AND OLD.status IS DISTINCT FROM 'submitted')
  EXECUTE FUNCTION notify_admin_on_partner_form_submit();

-- 3️⃣ Vérification
SELECT tgname, tgenabled FROM pg_trigger WHERE tgname = 'trigger_notify_admin_on_partner_form_submit';
