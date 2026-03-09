-- ═══════════════════════════════════════════════════════════════
-- TRIGGER: Quand TOUS les panels d'une étape sont 'approved'
-- → Compléter l'étape in_progress et activer la suivante
--
-- POURQUOI: useWorkflowActionTrigger + sendNextAction ne tournent
-- que si la page admin est ouverte. Ce trigger est SERVER-SIDE.
--
-- LOGIQUE:
-- 1. Un panel passe à 'approved'
-- 2. Compter les panels pending restants pour ce prospect/project
-- 3. S'il n'en reste plus → compléter l'étape + activer suivante
-- ═══════════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS trigger_panel_approved_complete_step ON public.client_form_panels;
DROP FUNCTION IF EXISTS public.fn_panel_approved_complete_step();

CREATE OR REPLACE FUNCTION public.fn_panel_approved_complete_step()
RETURNS TRIGGER AS $$
DECLARE
  v_pending_count INTEGER;
  v_steps JSONB;
  v_current_idx INTEGER;
  v_step_count INTEGER;
  v_updated_steps JSONB;
  i INTEGER;
BEGIN
  -- Ne déclencher que quand status passe à 'approved'
  IF NEW.status <> 'approved' THEN
    RETURN NEW;
  END IF;
  
  -- Ne pas re-déclencher si déjà approved
  IF OLD.status = 'approved' THEN
    RETURN NEW;
  END IF;

  -- Compter les panels encore pending pour ce prospect/project
  SELECT COUNT(*) INTO v_pending_count
  FROM public.client_form_panels
  WHERE prospect_id = NEW.prospect_id
  AND project_type = NEW.project_type
  AND status = 'pending';

  -- S'il reste des panels pending, on ne fait rien (il y a encore des actions en cours)
  IF v_pending_count > 0 THEN
    RAISE LOG '[Trigger Step] Panel % approved mais % panels pending restants', NEW.id, v_pending_count;
    RETURN NEW;
  END IF;

  RAISE LOG '[Trigger Step] Tous les panels approved pour prospect=% project=% → complétion étape', 
    NEW.prospect_id, NEW.project_type;

  -- Récupérer les steps actuels
  SELECT steps INTO v_steps
  FROM public.project_steps_status
  WHERE prospect_id = NEW.prospect_id
  AND project_type = NEW.project_type;

  IF v_steps IS NULL THEN
    RAISE LOG '[Trigger Step] Pas de steps trouvées pour prospect=% project=%', NEW.prospect_id, NEW.project_type;
    RETURN NEW;
  END IF;

  v_step_count := jsonb_array_length(v_steps);
  v_current_idx := -1;

  -- Trouver l'étape in_progress
  FOR i IN 0..v_step_count-1 LOOP
    IF v_steps->i->>'status' = 'in_progress' THEN
      v_current_idx := i;
      EXIT;
    END IF;
  END LOOP;

  IF v_current_idx = -1 THEN
    RAISE LOG '[Trigger Step] Aucune étape in_progress trouvée';
    RETURN NEW;
  END IF;

  RAISE LOG '[Trigger Step] Étape % (%) → completed', v_current_idx, v_steps->v_current_idx->>'name';

  -- Marquer l'étape courante comme completed
  v_updated_steps := v_steps;
  v_updated_steps := jsonb_set(v_updated_steps, ARRAY[v_current_idx::text, 'status'], '"completed"');

  -- Activer l'étape suivante si elle existe
  IF v_current_idx + 1 < v_step_count THEN
    v_updated_steps := jsonb_set(v_updated_steps, ARRAY[(v_current_idx + 1)::text, 'status'], '"in_progress"');
    RAISE LOG '[Trigger Step] Étape % (%) → in_progress', v_current_idx + 1, v_steps->(v_current_idx+1)->>'name';
  END IF;

  -- Sauvegarder
  UPDATE public.project_steps_status
  SET steps = v_updated_steps
  WHERE prospect_id = NEW.prospect_id
  AND project_type = NEW.project_type;

  RAISE LOG '[Trigger Step] ✅ Steps mis à jour en DB';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger sur UPDATE de client_form_panels
CREATE TRIGGER trigger_panel_approved_complete_step
  AFTER UPDATE OF status ON public.client_form_panels
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_panel_approved_complete_step();
