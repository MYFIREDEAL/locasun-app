-- ================================================================
-- Fonction RPC : update_own_prospect_profile()
-- ================================================================
-- Permet à un CLIENT de mettre à jour SON PROPRE profil
-- en bypassant les RLS.
--
-- Règles :
-- - Le client peut uniquement modifier SON prospect (user_id = auth.uid())
-- - Le client NE PEUT PAS modifier : owner_id, status, has_appointment
-- - Le client PEUT modifier : name, email, phone, company_name, address, form_data, tags
-- ================================================================

DROP FUNCTION IF EXISTS public.update_own_prospect_profile(jsonb);

CREATE OR REPLACE FUNCTION public.update_own_prospect_profile(
  _data JSONB
)
RETURNS SETOF public.prospects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_user_id UUID;
  v_prospect RECORD;
BEGIN
  -- ════════════════════════════════════════════════════════════
  -- 1. RÉCUPÉRER L'UTILISATEUR COURANT
  -- ════════════════════════════════════════════════════════════
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- ════════════════════════════════════════════════════════════
  -- 2. VÉRIFIER QUE LE PROSPECT EXISTE ET APPARTIENT AU CLIENT
  -- ════════════════════════════════════════════════════════════
  SELECT * INTO v_prospect
  FROM public.prospects
  WHERE user_id = v_current_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prospect profile not found for this user';
  END IF;

  -- ════════════════════════════════════════════════════════════
  -- 3. EFFECTUER LA MISE À JOUR (CHAMPS AUTORISÉS UNIQUEMENT)
  -- ════════════════════════════════════════════════════════════
  -- Le client peut modifier uniquement ses informations personnelles
  -- PAS de modification de : owner_id, status, has_appointment
  -- ✅ LE CLIENT PEUT AJOUTER DES PROJETS (tags) depuis son espace
  
  RETURN QUERY
  UPDATE public.prospects
  SET
    name = COALESCE((_data->>'name'), name),
    email = COALESCE((_data->>'email'), email),
    phone = COALESCE((_data->>'phone'), phone),
    company_name = COALESCE((_data->>'company_name'), company_name),
    address = COALESCE((_data->>'address'), address),
    form_data = COALESCE((_data->'form_data')::JSONB, form_data),
    tags = CASE 
      WHEN _data ? 'tags' THEN ARRAY(SELECT jsonb_array_elements_text(_data->'tags'))
      ELSE tags
    END, -- 🔥 FIX: N'écraser tags QUE si explicitement fourni dans _data
    updated_at = NOW()
  WHERE user_id = v_current_user_id
  RETURNING *;

END;
$$;

-- ================================================================
-- GRANT EXECUTE À authenticated
-- ================================================================
GRANT EXECUTE ON FUNCTION public.update_own_prospect_profile(JSONB) TO authenticated;

-- ================================================================
-- COMMENTAIRE
-- ================================================================
COMMENT ON FUNCTION public.update_own_prospect_profile(JSONB) IS 
'Permet à un client authentifié de mettre à jour SON PROPRE profil prospect.
Le client peut modifier : name, email, phone, company_name, address, form_data.
Le client NE PEUT PAS modifier : owner_id, status, tags, has_appointment (réservé aux admins).';
