-- ================================================================
-- Fonction RPC : update_prospect_safe()
-- ================================================================
-- Permet de mettre à jour un prospect en bypassant les RLS
-- tout en respectant les règles métier du système PRO.
--
-- Règles :
-- - Global Admin : peut tout modifier (y compris owner_id)
-- - Manager/Commercial : peut modifier tout SAUF owner_id
--   ET seulement les prospects où il est owner OU dans access_rights.users
-- ================================================================

DROP FUNCTION IF EXISTS public.update_prospect_safe(uuid, jsonb);

CREATE OR REPLACE FUNCTION public.update_prospect_safe(
  _prospect_id UUID,
  _data JSONB
)
RETURNS SETOF public.prospects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_user_id UUID;
  v_user_pk UUID;
  v_user_role TEXT;
  v_user_access_rights JSONB;
  v_prospect RECORD;
  v_allowed BOOLEAN := FALSE;
  v_cleaned_data JSONB;
BEGIN
  -- ════════════════════════════════════════════════════════════
  -- 1. RÉCUPÉRER L'UTILISATEUR COURANT
  -- ════════════════════════════════════════════════════════════
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT id, role, access_rights
  INTO v_user_pk, v_user_role, v_user_access_rights
  FROM public.users
  WHERE user_id = v_current_user_id;

  IF v_user_pk IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- ════════════════════════════════════════════════════════════
  -- 2. VÉRIFIER QUE LE PROSPECT EXISTE
  -- ════════════════════════════════════════════════════════════
  SELECT * INTO v_prospect
  FROM public.prospects
  WHERE id = _prospect_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prospect not found';
  END IF;

  -- ════════════════════════════════════════════════════════════
  -- 3. VÉRIFIER LES DROITS D'ACCÈS AU PROSPECT
  -- ════════════════════════════════════════════════════════════
  -- Global Admin : accès total
  IF v_user_role = 'Global Admin' THEN
    v_allowed := TRUE;
  
  -- Owner du prospect : accès autorisé
  ELSIF v_prospect.owner_id = v_current_user_id THEN
    v_allowed := TRUE;
  
  -- Vérifier si le owner du prospect est dans access_rights.users
  ELSIF v_user_access_rights IS NOT NULL 
    AND v_user_access_rights ? 'users' 
    AND v_user_access_rights->'users' ? v_prospect.owner_id::TEXT THEN
    v_allowed := TRUE;
  END IF;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Access denied: you do not have permission to modify this prospect';
  END IF;

  -- ════════════════════════════════════════════════════════════
  -- 4. VÉRIFIER PERMISSION SUR OWNER_ID
  -- ════════════════════════════════════════════════════════════
  -- Seul Global Admin peut modifier owner_id
  IF v_user_role <> 'Global Admin' AND _data ? 'owner_id' THEN
    RAISE EXCEPTION 'Non-admin cannot modify owner_id';
  END IF;

  -- Nettoyer les données pour être sûr (défense en profondeur)
  v_cleaned_data := _data;
  IF v_user_role <> 'Global Admin' THEN
    v_cleaned_data := v_cleaned_data - 'owner_id';
  END IF;

  -- ════════════════════════════════════════════════════════════
  -- 5. EFFECTUER LA MISE À JOUR
  -- ════════════════════════════════════════════════════════════
  -- Mise à jour sélective : seuls les champs fournis sont modifiés
  RETURN QUERY
  UPDATE public.prospects
  SET
    name = COALESCE((v_cleaned_data->>'name'), name),
    email = COALESCE((v_cleaned_data->>'email'), email),
    phone = COALESCE((v_cleaned_data->>'phone'), phone),
    status = COALESCE((v_cleaned_data->>'status'), status),
    tags = COALESCE((v_cleaned_data->'tags')::TEXT[], tags),
    form_data = COALESCE((v_cleaned_data->'form_data')::JSONB, form_data),
    project_info = COALESCE((v_cleaned_data->'project_info')::JSONB, project_info),
    address = COALESCE((v_cleaned_data->>'address'), address),
    city = COALESCE((v_cleaned_data->>'city'), city),
    postal_code = COALESCE((v_cleaned_data->>'postal_code'), postal_code),
    country = COALESCE((v_cleaned_data->>'country'), country),
    notes = COALESCE((v_cleaned_data->>'notes'), notes),
    score = COALESCE((v_cleaned_data->>'score')::INTEGER, score),
    owner_id = COALESCE((v_cleaned_data->>'owner_id')::UUID, owner_id),
    updated_at = NOW()
  WHERE id = _prospect_id
  RETURNING *;

END;
$$;

-- ================================================================
-- GRANT EXECUTE À authenticated
-- ================================================================
GRANT EXECUTE ON FUNCTION public.update_prospect_safe(UUID, JSONB) TO authenticated;

-- ================================================================
-- COMMENTAIRE
-- ================================================================
COMMENT ON FUNCTION public.update_prospect_safe(UUID, JSONB) IS 
'Mise à jour sécurisée d''un prospect avec bypass RLS. 
Règles : Global Admin peut tout modifier. 
Manager/Commercial peuvent modifier tout sauf owner_id, 
et uniquement les prospects dont ils sont owner ou présents dans access_rights.users.';
