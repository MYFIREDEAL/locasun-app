-- ============================================================================
-- RPC: create_webhook_prospect
-- ============================================================================
-- OBJECTIF: Créer un prospect via webhook externe (Make, API, etc.)
--           Similaire à create_affiliated_prospect mais avec owner_id direct.
--
-- DIFFÉRENCES avec create_affiliated_prospect:
--   - Pas de resolve_organization_from_host (org_id fourni directement par la Edge Function)
--   - Pas de affiliate_slug → owner_id fourni directement
--   - Validation type_projet contre project_templates
--   - Vérification doublon intégrée
--
-- SÉCURITÉ: SECURITY DEFINER — appelée uniquement depuis la Edge Function webhook-v1
--           (qui a déjà authentifié la requête via integration_keys)
--
-- NE PAS APPELER DIRECTEMENT DEPUIS LE FRONTEND
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_webhook_prospect(
  p_organization_id UUID,
  p_name TEXT,
  p_email TEXT,
  p_phone TEXT DEFAULT NULL,
  p_company TEXT DEFAULT NULL,
  p_address TEXT DEFAULT '',
  p_tags TEXT[] DEFAULT '{}',
  p_owner_id UUID DEFAULT NULL,     -- owner direct (déjà validé par Edge Function)
  p_status TEXT DEFAULT NULL,
  p_send_magic_link BOOLEAN DEFAULT false
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prospect_id UUID;
  v_owner_id UUID;
  v_owner_name TEXT;
  v_first_step_id TEXT;
  v_tag TEXT;
  v_template_exists BOOLEAN;
BEGIN
  -- ============================================================
  -- ÉTAPE 1: Vérifier doublon email dans cette org
  -- ============================================================
  IF EXISTS (
    SELECT 1 FROM public.prospects
    WHERE email = p_email AND organization_id = p_organization_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'DUPLICATE_EMAIL',
      'message', format('Un prospect avec l''email %s existe déjà dans cette organisation', p_email)
    );
  END IF;

  -- ============================================================
  -- ÉTAPE 2: Valider les tags contre project_templates
  -- ============================================================
  IF array_length(p_tags, 1) > 0 THEN
    FOREACH v_tag IN ARRAY p_tags LOOP
      SELECT EXISTS (
        SELECT 1 FROM public.project_templates
        WHERE type = v_tag
          AND (organization_id = p_organization_id OR organization_id IS NULL)
      ) INTO v_template_exists;

      IF NOT v_template_exists THEN
        RETURN json_build_object(
          'success', false,
          'error', 'INVALID_PROJECT_TYPE',
          'message', format('Le type de projet "%s" n''existe pas pour cette organisation', v_tag)
        );
      END IF;
    END LOOP;
  END IF;

  -- ============================================================
  -- ÉTAPE 3: Résoudre l'owner
  -- ============================================================
  IF p_owner_id IS NOT NULL THEN
    -- Vérifier que l'owner appartient à cette org
    SELECT user_id, name INTO v_owner_id, v_owner_name
    FROM public.users
    WHERE user_id = p_owner_id
      AND organization_id = p_organization_id;

    IF v_owner_id IS NULL THEN
      RETURN json_build_object(
        'success', false,
        'error', 'INVALID_OWNER',
        'message', format('L''owner_id %s n''appartient pas à cette organisation', p_owner_id)
      );
    END IF;
  ELSE
    -- Fallback: Global Admin de l'org
    SELECT user_id, name INTO v_owner_id, v_owner_name
    FROM public.users
    WHERE organization_id = p_organization_id
      AND role = 'Global Admin'
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_owner_id IS NULL THEN
      RETURN json_build_object(
        'success', false,
        'error', 'NO_GLOBAL_ADMIN',
        'message', 'Aucun Global Admin trouvé pour cette organisation'
      );
    END IF;
  END IF;

  -- ============================================================
  -- ÉTAPE 4: Résoudre le pipeline step — STRICT, pas de fallback fictif
  -- ============================================================
  IF p_status IS NULL THEN
    -- Chercher le premier step de cette org
    SELECT id INTO v_first_step_id
    FROM public.global_pipeline_steps
    WHERE organization_id = p_organization_id
    ORDER BY created_at ASC
    LIMIT 1;

    -- Si rien trouvé pour cette org, chercher un step global
    IF v_first_step_id IS NULL THEN
      SELECT id INTO v_first_step_id
      FROM public.global_pipeline_steps
      ORDER BY created_at ASC
      LIMIT 1;
    END IF;

    -- STRICT: si toujours rien, erreur — jamais de statut fictif
    IF v_first_step_id IS NULL THEN
      RETURN json_build_object(
        'success', false,
        'error', 'NO_PIPELINE_STEP',
        'message', 'Aucun pipeline step configuré pour cette organisation'
      );
    END IF;
  ELSE
    v_first_step_id := p_status;
  END IF;

  -- ============================================================
  -- ÉTAPE 5: Créer le prospect
  -- ============================================================
  INSERT INTO public.prospects(
    name,
    email,
    phone,
    company_name,
    address,
    owner_id,
    status,
    tags,
    has_appointment,
    affiliate_name,
    organization_id,
    created_at,
    updated_at
  ) VALUES (
    p_name,
    p_email,
    p_phone,
    p_company,
    p_address,
    v_owner_id,
    v_first_step_id,
    p_tags,
    false,
    v_owner_name,
    p_organization_id,
    now(),
    now()
  )
  RETURNING id INTO v_prospect_id;

  -- ============================================================
  -- RETOUR
  -- ============================================================
  RETURN json_build_object(
    'success', true,
    'prospect_id', v_prospect_id,
    'owner_id', v_owner_id,
    'owner_name', v_owner_name,
    'organization_id', p_organization_id,
    'tags', p_tags
  );
END;
$$;

-- ============================================================================
-- PERMISSIONS
-- ============================================================================
-- Accessible uniquement via service_role (Edge Function) — pas depuis le frontend
-- On n'accorde PAS à anon/authenticated pour éviter les abus directs
GRANT EXECUTE ON FUNCTION public.create_webhook_prospect(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], UUID, TEXT, BOOLEAN) TO service_role;
