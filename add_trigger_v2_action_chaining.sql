-- ═══════════════════════════════════════════════════════════════════════════
-- TRIGGER V2 : CHAÎNAGE COMPLET DES ACTIONS CÔTÉ SERVEUR
-- ═══════════════════════════════════════════════════════════════════════════
--
-- POURQUOI : Le chaînage frontend (useWorkflowActionTrigger + sendNextAction)
-- ne fonctionne que si la page admin est ouverte. L'IA et le volume
-- nécessitent un chaînage 100% serveur.
--
-- QUAND : Un client_form_panels passe de n'importe quel status → 'approved'
--
-- LOGIQUE :
-- 1. Extraire moduleId + actionIndex depuis action_id (pattern "v2-{moduleId}-action-{idx}")
-- 2. Charger le template V2 (workflow_module_templates)
-- 3. Si action suivante existe → créer panel + message chat (CHAÎNAGE)
-- 4. Si dernière action → compléter étape + activer suivante (COMPLÉTION)
--
-- TYPES SUPPORTÉS : FORM, MESSAGE, SIGNATURE
-- ═══════════════════════════════════════════════════════════════════════════

-- Supprimer l'ancien trigger (celui qui ne faisait que la complétion)
DROP TRIGGER IF EXISTS trigger_panel_approved_complete_step ON public.client_form_panels;
DROP FUNCTION IF EXISTS public.fn_panel_approved_complete_step();

-- Supprimer le nouveau si on re-exécute
DROP TRIGGER IF EXISTS trigger_v2_action_chaining ON public.client_form_panels;
DROP FUNCTION IF EXISTS public.fn_v2_action_chaining();

-- ═══════════════════════════════════════════════════════════════════════════
-- FONCTION PRINCIPALE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.fn_v2_action_chaining()
RETURNS TRIGGER AS $$
DECLARE
  -- Parsing action_id
  v_action_id TEXT;
  v_module_id TEXT;
  v_action_index INTEGER;
  v_parts TEXT[];
  v_action_idx_text TEXT;
  
  -- Template V2
  v_template_config JSONB;
  v_actions JSONB;
  v_total_actions INTEGER;
  v_next_index INTEGER;
  v_next_action JSONB;
  v_next_action_config JSONB;
  v_next_action_type TEXT;
  v_next_action_id TEXT;
  v_next_target TEXT;
  
  -- Pour création panel
  v_panel_id TEXT;
  v_form_id TEXT;
  v_org_id UUID;
  v_module_name TEXT;
  v_new_panel_id BIGINT;
  
  -- Pour création message chat
  v_chat_message TEXT;
  v_button_labels JSONB;
  v_proceed_label TEXT;
  v_need_data_label TEXT;
  
  -- Pour complétion étape
  v_steps JSONB;
  v_step_count INTEGER;
  v_current_step_idx INTEGER;
  v_updated_steps JSONB;
  i INTEGER;
  
BEGIN
  -- ─────────────────────────────────────────────────────────────
  -- GARDE 1 : Seulement quand status passe à 'approved'
  -- ─────────────────────────────────────────────────────────────
  IF NEW.status <> 'approved' THEN
    RETURN NEW;
  END IF;
  
  IF OLD.status = 'approved' THEN
    RETURN NEW;  -- Déjà approved, pas de re-trigger
  END IF;
  
  -- ─────────────────────────────────────────────────────────────
  -- GARDE 2 : Seulement les panels V2 (avec action_id pattern v2-*)
  -- ─────────────────────────────────────────────────────────────
  v_action_id := NEW.action_id;
  
  IF v_action_id IS NULL OR NOT v_action_id LIKE 'v2-%' THEN
    -- Panel V1 ou sans action_id → ne pas toucher (ancien comportement)
    RAISE LOG '[V2 Chain] Panel % sans action_id V2, skip', NEW.id;
    RETURN NEW;
  END IF;
  
  -- ─────────────────────────────────────────────────────────────
  -- PARSER action_id : "v2-{moduleId}-action-{index}"
  -- Ex: "v2-collecte-dinfos-action-1" → moduleId="collecte-dinfos", index=1
  -- ─────────────────────────────────────────────────────────────
  
  -- Trouver la position de "-action-" dans l'action_id
  IF position('-action-' in v_action_id) = 0 THEN
    RAISE LOG '[V2 Chain] action_id % ne contient pas -action-, skip', v_action_id;
    RETURN NEW;
  END IF;
  
  -- Extraire moduleId (entre "v2-" et "-action-")
  v_module_id := substring(v_action_id FROM 4 FOR position('-action-' in v_action_id) - 4);
  
  -- Extraire l'index (après le dernier "-action-")
  v_action_idx_text := substring(v_action_id FROM position('-action-' in v_action_id) + 8);
  
  BEGIN
    v_action_index := v_action_idx_text::INTEGER;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG '[V2 Chain] Impossible de parser index depuis %, skip', v_action_id;
    RETURN NEW;
  END;
  
  RAISE LOG '[V2 Chain] Panel % approved → module=%, actionIndex=%', NEW.id, v_module_id, v_action_index;
  
  -- ─────────────────────────────────────────────────────────────
  -- CHARGER LE TEMPLATE V2
  -- ─────────────────────────────────────────────────────────────
  
  v_org_id := NEW.organization_id;
  
  SELECT config_json INTO v_template_config
  FROM public.workflow_module_templates
  WHERE org_id = v_org_id
    AND project_type = NEW.project_type
    AND module_id = v_module_id
  ORDER BY updated_at DESC NULLS LAST
  LIMIT 1;  -- Prendre le plus récent (protection doublons)
  
  IF v_template_config IS NULL THEN
    RAISE LOG '[V2 Chain] Template non trouvé pour org=%, project=%, module=%', v_org_id, NEW.project_type, v_module_id;
    RETURN NEW;
  END IF;
  
  -- Extraire le tableau d'actions
  v_actions := v_template_config->'actions';
  
  IF v_actions IS NULL OR jsonb_typeof(v_actions) <> 'array' THEN
    -- Pas de multi-actions → c'est la seule action → compléter l'étape
    RAISE LOG '[V2 Chain] Pas de tableau actions → complétion étape directe';
    v_total_actions := 1;
    v_next_index := 1;  -- Force le path "dernière action"
  ELSE
    v_total_actions := jsonb_array_length(v_actions);
    v_next_index := v_action_index + 1;
  END IF;
  
  RAISE LOG '[V2 Chain] Total actions=%, current=%, next=%', v_total_actions, v_action_index, v_next_index;

  -- ═══════════════════════════════════════════════════════════════
  -- CAS 1 : IL RESTE DES ACTIONS → CHAÎNAGE
  -- ═══════════════════════════════════════════════════════════════
  
  IF v_next_index < v_total_actions THEN
    v_next_action := v_actions->v_next_index;
    v_next_action_config := v_next_action->'actionConfig';
    
    IF v_next_action_config IS NULL THEN
      RAISE LOG '[V2 Chain] actionConfig null pour action index %, skip chaînage', v_next_index;
      RETURN NEW;
    END IF;
    
    v_next_action_type := v_next_action_config->>'actionType';
    v_next_action_id := 'v2-' || v_module_id || '-action-' || v_next_index;
    v_next_target := COALESCE(v_next_action_config->>'targetAudience', 'CLIENT');
    
    -- Si targetAudience est un array JSON, prendre le premier élément
    IF jsonb_typeof(v_next_action_config->'targetAudience') = 'array' THEN
      v_next_target := v_next_action_config->'targetAudience'->>0;
    END IF;
    
    v_module_name := COALESCE(v_template_config->>'objective', v_module_id);
    
    RAISE LOG '[V2 Chain] → Chaînage action % (type=%, target=%)', v_next_action_id, v_next_action_type, v_next_target;
    
    -- ─────────────────────────────────────────────────────────
    -- CRÉER LE PANEL pour l'action suivante
    -- ─────────────────────────────────────────────────────────
    
    v_panel_id := 'panel-auto-' || extract(epoch from now())::bigint || '-' || substr(md5(random()::text), 1, 5);
    
    -- Déterminer le form_id (premier du tableau allowedFormIds, ou null)
    v_form_id := NULL;
    IF v_next_action_type IN ('FORM') AND v_next_action_config->'allowedFormIds' IS NOT NULL 
       AND jsonb_array_length(COALESCE(v_next_action_config->'allowedFormIds', '[]'::jsonb)) > 0 THEN
      v_form_id := v_next_action_config->'allowedFormIds'->>0;
    END IF;
    
    INSERT INTO public.client_form_panels (
      panel_id,
      prospect_id,
      project_type,
      form_id,
      status,
      action_type,
      action_id,
      step_name,
      verification_mode,
      organization_id,
      message_timestamp
    ) VALUES (
      v_panel_id,
      NEW.prospect_id,
      NEW.project_type,
      v_form_id,
      'pending',
      LOWER(COALESCE(v_next_action_type, 'form')),
      v_next_action_id,
      COALESCE(NEW.step_name, v_module_id),
      COALESCE(v_next_action_config->>'verificationMode', 'HUMAN'),
      v_org_id,
      extract(epoch from now())::bigint::text
    )
    RETURNING id INTO v_new_panel_id;
    
    RAISE LOG '[V2 Chain] ✅ Panel créé id=%, action_id=%', v_new_panel_id, v_next_action_id;
    
    -- ─────────────────────────────────────────────────────────
    -- CRÉER LE MESSAGE CHAT selon le type d'action
    -- ─────────────────────────────────────────────────────────
    
    IF v_next_action_type = 'MESSAGE' THEN
      -- MESSAGE : Envoyer un message avec boutons
      v_button_labels := COALESCE(v_template_config->'buttonLabels', '{"proceedLabel":"Valider ✓","needDataLabel":"Besoin d''infos"}'::jsonb);
      v_proceed_label := COALESCE(v_button_labels->>'proceedLabel', 'Valider ✓');
      v_need_data_label := COALESCE(v_button_labels->>'needDataLabel', 'Besoin d''infos');
      
      -- Message texte depuis l'objectif de l'action
      v_chat_message := COALESCE(
        v_next_action->'config'->>'objective',
        v_next_action_config->>'objective',
        'Merci de confirmer en cliquant sur un des boutons ci-dessous.'
      );
      
      INSERT INTO public.chat_messages (
        prospect_id, project_type, sender, text, read,
        organization_id, channel, metadata
      ) VALUES (
        NEW.prospect_id,
        NEW.project_type,
        'pro',
        v_chat_message,
        false,
        v_org_id,
        'client',
        jsonb_build_object(
          'actionButtons', true,
          'panelId', v_new_panel_id,
          'proceedLabel', v_proceed_label,
          'needDataLabel', v_need_data_label,
          'source', 'workflow-v2-trigger',
          'actionType', 'MESSAGE'
        )
      );
      
      RAISE LOG '[V2 Chain] 💬 Chat MESSAGE envoyé avec boutons (panelId=%)', v_new_panel_id;
      
    ELSIF v_next_action_type = 'FORM' THEN
      -- FORM : Envoyer un message informant le client
      v_chat_message := COALESCE(
        v_next_action->'config'->>'objective',
        'Un formulaire est disponible à compléter.'
      );
      
      INSERT INTO public.chat_messages (
        prospect_id, project_type, sender, text, read,
        organization_id, channel, metadata
      ) VALUES (
        NEW.prospect_id,
        NEW.project_type,
        'pro',
        v_chat_message,
        false,
        v_org_id,
        'client',
        jsonb_build_object(
          'type', 'form_request',
          'formId', v_form_id,
          'panelId', v_new_panel_id,
          'source', 'workflow-v2-trigger'
        )
      );
      
      RAISE LOG '[V2 Chain] 📋 Chat FORM envoyé (formId=%, panelId=%)', v_form_id, v_new_panel_id;
      
    ELSIF v_next_action_type = 'SIGNATURE' THEN
      -- SIGNATURE : Juste le panel + message informatif
      -- (La procédure de signature nécessite le frontend pour la génération PDF)
      INSERT INTO public.chat_messages (
        prospect_id, project_type, sender, text, read,
        organization_id, channel, metadata
      ) VALUES (
        NEW.prospect_id,
        NEW.project_type,
        'pro',
        'Un document est en cours de préparation pour signature.',
        false,
        v_org_id,
        'client',
        jsonb_build_object(
          'type', 'signature_pending',
          'panelId', v_new_panel_id,
          'source', 'workflow-v2-trigger',
          'actionType', 'SIGNATURE'
        )
      );
      
      RAISE LOG '[V2 Chain] ✍️ Chat SIGNATURE envoyé (panelId=%)', v_new_panel_id;
    END IF;
    
    -- ─────────────────────────────────────────────────────────
    -- METTRE À JOUR LES SUBSTEPS
    -- ─────────────────────────────────────────────────────────
    
    SELECT steps INTO v_steps
    FROM public.project_steps_status
    WHERE prospect_id = NEW.prospect_id
      AND project_type = NEW.project_type;
    
    IF v_steps IS NOT NULL THEN
      v_step_count := jsonb_array_length(v_steps);
      v_current_step_idx := -1;
      
      FOR i IN 0..v_step_count-1 LOOP
        IF v_steps->i->>'status' = 'in_progress' THEN
          v_current_step_idx := i;
          EXIT;
        END IF;
      END LOOP;
      
      IF v_current_step_idx >= 0 THEN
        v_updated_steps := v_steps;
        
        -- Vérifier si subSteps existent
        IF v_updated_steps->v_current_step_idx->'subSteps' IS NOT NULL 
           AND jsonb_typeof(v_updated_steps->v_current_step_idx->'subSteps') = 'array'
           AND jsonb_array_length(v_updated_steps->v_current_step_idx->'subSteps') > 0 THEN
          
          -- Marquer la subStep de l'action complétée → completed
          IF v_action_index < jsonb_array_length(v_updated_steps->v_current_step_idx->'subSteps') THEN
            v_updated_steps := jsonb_set(v_updated_steps, 
              ARRAY[v_current_step_idx::text, 'subSteps', v_action_index::text, 'status'], 
              '"completed"');
          END IF;
          
          -- Activer la subStep de l'action suivante → in_progress
          IF v_next_index < jsonb_array_length(v_updated_steps->v_current_step_idx->'subSteps') THEN
            v_updated_steps := jsonb_set(v_updated_steps, 
              ARRAY[v_current_step_idx::text, 'subSteps', v_next_index::text, 'status'], 
              '"in_progress"');
          END IF;
          
          UPDATE public.project_steps_status
          SET steps = v_updated_steps
          WHERE prospect_id = NEW.prospect_id
            AND project_type = NEW.project_type;
          
          RAISE LOG '[V2 Chain] ✅ SubSteps mis à jour (completed=%, in_progress=%)', v_action_index, v_next_index;
        END IF;
      END IF;
    END IF;
    
    RETURN NEW;
  END IF;

  -- ═══════════════════════════════════════════════════════════════
  -- CAS 2 : DERNIÈRE ACTION → COMPLÉTION D'ÉTAPE
  -- ═══════════════════════════════════════════════════════════════
  
  RAISE LOG '[V2 Chain] 🏁 Dernière action (index=%) → complétion étape', v_action_index;
  
  -- Vérifier que TOUS les panels de cette étape sont bien approved
  -- (sécurité : ne pas compléter si un panel est encore pending)
  DECLARE
    v_pending_for_module INTEGER;
  BEGIN
    SELECT COUNT(*) INTO v_pending_for_module
    FROM public.client_form_panels
    WHERE prospect_id = NEW.prospect_id
      AND project_type = NEW.project_type
      AND action_id LIKE 'v2-' || v_module_id || '-action-%'
      AND status <> 'approved';
    
    IF v_pending_for_module > 0 THEN
      RAISE LOG '[V2 Chain] ⚠️ % panels non-approved pour module %, skip complétion', v_pending_for_module, v_module_id;
      RETURN NEW;
    END IF;
  END;
  
  -- Charger les steps
  SELECT steps INTO v_steps
  FROM public.project_steps_status
  WHERE prospect_id = NEW.prospect_id
    AND project_type = NEW.project_type;
  
  IF v_steps IS NULL THEN
    RAISE LOG '[V2 Chain] Pas de steps trouvées, skip';
    RETURN NEW;
  END IF;
  
  v_step_count := jsonb_array_length(v_steps);
  v_current_step_idx := -1;
  
  -- Trouver l'étape in_progress
  FOR i IN 0..v_step_count-1 LOOP
    IF v_steps->i->>'status' = 'in_progress' THEN
      v_current_step_idx := i;
      EXIT;
    END IF;
  END LOOP;
  
  IF v_current_step_idx = -1 THEN
    RAISE LOG '[V2 Chain] Aucune étape in_progress, skip';
    RETURN NEW;
  END IF;
  
  RAISE LOG '[V2 Chain] Étape % (%) → completed', v_current_step_idx, v_steps->v_current_step_idx->>'name';
  
  v_updated_steps := v_steps;
  
  -- Marquer TOUTES les subSteps comme completed
  IF v_updated_steps->v_current_step_idx->'subSteps' IS NOT NULL 
     AND jsonb_typeof(v_updated_steps->v_current_step_idx->'subSteps') = 'array' THEN
    FOR i IN 0..jsonb_array_length(v_updated_steps->v_current_step_idx->'subSteps')-1 LOOP
      v_updated_steps := jsonb_set(v_updated_steps,
        ARRAY[v_current_step_idx::text, 'subSteps', i::text, 'status'],
        '"completed"');
    END LOOP;
    RAISE LOG '[V2 Chain] Toutes subSteps marquées completed';
  END IF;
  
  -- Marquer l'étape courante → completed
  v_updated_steps := jsonb_set(v_updated_steps, ARRAY[v_current_step_idx::text, 'status'], '"completed"');
  
  -- Activer l'étape suivante → in_progress
  IF v_current_step_idx + 1 < v_step_count THEN
    v_updated_steps := jsonb_set(v_updated_steps, ARRAY[(v_current_step_idx + 1)::text, 'status'], '"in_progress"');
    RAISE LOG '[V2 Chain] Étape % → in_progress', v_current_step_idx + 1;
  END IF;
  
  -- Sauvegarder
  UPDATE public.project_steps_status
  SET steps = v_updated_steps
  WHERE prospect_id = NEW.prospect_id
    AND project_type = NEW.project_type;
  
  RAISE LOG '[V2 Chain] ✅ Étape complétée, steps mis à jour';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════
-- TRIGGER
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TRIGGER trigger_v2_action_chaining
  AFTER UPDATE OF status ON public.client_form_panels
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_v2_action_chaining();

-- ═══════════════════════════════════════════════════════════════════════════
-- VÉRIFICATION
-- ═══════════════════════════════════════════════════════════════════════════

SELECT tgname, tgrelid::regclass, tgenabled
FROM pg_trigger 
WHERE tgrelid = 'public.client_form_panels'::regclass
AND tgname = 'trigger_v2_action_chaining';
