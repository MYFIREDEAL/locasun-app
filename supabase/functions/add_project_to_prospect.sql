-- ============================================================================
-- RPC: add_project_to_prospect
-- ============================================================================
-- OBJECTIF: Ajouter un nouveau projet à un prospect existant via webhook
--           Sans recréer le prospect. Universel, multi-tenant.
--
-- ACTIONS:
--   1. Vérifier que le prospect existe dans l'organisation
--   2. Vérifier que le project_template existe pour cette org
--   3. Vérifier que le prospect n'a pas déjà ce projet (doublon)
--   4. Ajouter le type dans le tableau tags[] du prospect
--   5. Initialiser project_steps_status avec les steps du template
--      (première étape en "in_progress", les autres en "pending")
--   6. Retourner success + infos
--
-- SÉCURITÉ: SECURITY DEFINER — appelée uniquement depuis webhook-v1
--           (qui a déjà authentifié la requête via integration_keys)
--
-- NE PAS APPELER DIRECTEMENT DEPUIS LE FRONTEND
-- ============================================================================

CREATE OR REPLACE FUNCTION public.add_project_to_prospect(
  p_prospect_id UUID,
  p_organization_id UUID,
  p_project_type TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prospect_name TEXT;
  v_prospect_tags TEXT[];
  v_template_steps JSONB;
  v_initialized_steps JSONB;
  v_first_step JSONB;
  v_rest_steps JSONB;
BEGIN
  -- ============================================================
  -- ÉTAPE 1: Vérifier que le prospect existe dans cette org
  -- ============================================================
  SELECT name, tags INTO v_prospect_name, v_prospect_tags
  FROM public.prospects
  WHERE id = p_prospect_id
    AND organization_id = p_organization_id;

  IF v_prospect_name IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'INVALID_PROSPECT',
      'message', format('Prospect %s introuvable dans cette organisation', p_prospect_id)
    );
  END IF;

  -- ============================================================
  -- ÉTAPE 2: Vérifier que le project_template existe
  -- ============================================================
  SELECT steps INTO v_template_steps
  FROM public.project_templates
  WHERE type = p_project_type
    AND (organization_id = p_organization_id OR organization_id IS NULL);

  IF v_template_steps IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'INVALID_PROJECT_TYPE',
      'message', format('Le type de projet "%s" n''existe pas pour cette organisation', p_project_type)
    );
  END IF;

  -- ============================================================
  -- ÉTAPE 3: Vérifier que le prospect n'a pas déjà ce projet
  -- ============================================================
  IF v_prospect_tags IS NOT NULL AND p_project_type = ANY(v_prospect_tags) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'DUPLICATE_PROJECT',
      'message', format('Le prospect a déjà le projet "%s"', p_project_type)
    );
  END IF;

  -- ============================================================
  -- ÉTAPE 4: Ajouter le tag au prospect
  -- ============================================================
  UPDATE public.prospects
  SET
    tags = array_append(COALESCE(tags, '{}'), p_project_type),
    updated_at = now()
  WHERE id = p_prospect_id
    AND organization_id = p_organization_id;

  -- ============================================================
  -- ÉTAPE 5: Initialiser project_steps_status
  --          Première étape → "in_progress", les autres → "pending"
  -- ============================================================
  -- Construire les steps initialisés
  IF jsonb_array_length(v_template_steps) > 0 THEN
    -- Première étape : set status = "in_progress"
    v_first_step := jsonb_set(v_template_steps->0, '{status}', '"in_progress"');

    -- Si plus d'une étape, garder les autres en "pending"
    IF jsonb_array_length(v_template_steps) > 1 THEN
      v_rest_steps := '[]'::jsonb;
      FOR i IN 1..jsonb_array_length(v_template_steps) - 1 LOOP
        v_rest_steps := v_rest_steps || jsonb_build_array(
          jsonb_set(v_template_steps->i, '{status}', '"pending"')
        );
      END LOOP;
      v_initialized_steps := jsonb_build_array(v_first_step) || v_rest_steps;
    ELSE
      v_initialized_steps := jsonb_build_array(v_first_step);
    END IF;
  ELSE
    v_initialized_steps := '[]'::jsonb;
  END IF;

  -- Insérer dans project_steps_status (UNIQUE constraint prospect_id + project_type)
  INSERT INTO public.project_steps_status (prospect_id, project_type, steps, organization_id)
  VALUES (p_prospect_id, p_project_type, v_initialized_steps, p_organization_id)
  ON CONFLICT (prospect_id, project_type) DO NOTHING;

  -- ============================================================
  -- RETOUR
  -- ============================================================
  RETURN json_build_object(
    'success', true,
    'prospect_id', p_prospect_id,
    'prospect_name', v_prospect_name,
    'project_type', p_project_type,
    'steps_count', jsonb_array_length(v_initialized_steps)
  );
END;
$$;

-- ============================================================================
-- PERMISSIONS
-- ============================================================================
-- Accessible uniquement via service_role (Edge Function) — pas depuis le frontend
GRANT EXECUTE ON FUNCTION public.add_project_to_prospect(UUID, UUID, TEXT) TO service_role;
