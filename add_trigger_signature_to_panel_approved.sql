-- ═══════════════════════════════════════════════════════════════
-- TRIGGER: Quand signature_procedures.status → 'completed' ou 'signed'
-- → Mettre le panel client_form_panels associé à 'approved'
-- 
-- POURQUOI: Le listener real-time dans ProspectDetailsAdmin ne tourne
-- que si la page admin est ouverte. Ce trigger est SERVER-SIDE,
-- il fonctionne 24/7 sans dépendre de l'UI.
-- ═══════════════════════════════════════════════════════════════

-- Supprimer si existe déjà
DROP TRIGGER IF EXISTS trigger_signature_completed_to_panel_approved ON public.signature_procedures;
DROP FUNCTION IF EXISTS public.fn_signature_completed_to_panel_approved();

-- Fonction trigger
CREATE OR REPLACE FUNCTION public.fn_signature_completed_to_panel_approved()
RETURNS TRIGGER AS $$
DECLARE
  v_panel_id UUID;
  v_action_id TEXT;
BEGIN
  -- Ne déclencher que quand status passe à 'completed' ou 'signed'
  IF NEW.status NOT IN ('completed', 'signed') THEN
    RETURN NEW;
  END IF;
  
  -- Ne pas re-déclencher si ancien status était déjà completed/signed
  IF OLD.status IN ('completed', 'signed') THEN
    RETURN NEW;
  END IF;

  -- STRATÉGIE 1: Chercher via panelDbId dans signature_metadata
  IF NEW.signature_metadata IS NOT NULL AND (NEW.signature_metadata->>'panelDbId') IS NOT NULL THEN
    v_panel_id := (NEW.signature_metadata->>'panelDbId')::UUID;
    
    UPDATE public.client_form_panels
    SET status = 'approved'
    WHERE id = v_panel_id
    AND status = 'pending';
    
    IF FOUND THEN
      RAISE LOG '[Trigger] Signature % → panel % approved (via panelDbId)', NEW.id, v_panel_id;
      RETURN NEW;
    END IF;
  END IF;

  -- STRATÉGIE 2: Chercher via actionId dans signature_metadata
  IF NEW.signature_metadata IS NOT NULL AND (NEW.signature_metadata->>'actionId') IS NOT NULL THEN
    v_action_id := NEW.signature_metadata->>'actionId';
    
    UPDATE public.client_form_panels
    SET status = 'approved'
    WHERE prospect_id = NEW.prospect_id
    AND project_type = NEW.project_type
    AND action_id = v_action_id
    AND action_type = 'signature'
    AND status = 'pending';
    
    IF FOUND THEN
      RAISE LOG '[Trigger] Signature % → panel approved (via actionId %)', NEW.id, v_action_id;
      RETURN NEW;
    END IF;
  END IF;

  -- STRATÉGIE 3: Fallback — chercher le dernier panel signature pending pour ce prospect/project
  UPDATE public.client_form_panels
  SET status = 'approved'
  WHERE id = (
    SELECT id FROM public.client_form_panels
    WHERE prospect_id = NEW.prospect_id
    AND project_type = NEW.project_type
    AND action_type = 'signature'
    AND status = 'pending'
    ORDER BY created_at DESC
    LIMIT 1
  );

  IF FOUND THEN
    RAISE LOG '[Trigger] Signature % → panel approved (via fallback)', NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger sur UPDATE de signature_procedures
CREATE TRIGGER trigger_signature_completed_to_panel_approved
  AFTER UPDATE OF status ON public.signature_procedures
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_signature_completed_to_panel_approved();
