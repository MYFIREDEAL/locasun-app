-- ================================================================
-- CORRECTION : Autoriser les clients à ajouter des projets (tags)
-- ================================================================
-- Problème : Les clients ne peuvent pas ajouter de projets depuis
-- leur espace car update_own_prospect_profile() bloquait la modification
-- du champ 'tags'.
--
-- Solution : Autoriser la modification de 'tags' pour que les clients
-- puissent ajouter des projets depuis /dashboard/offres
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
    tags = COALESCE((_data->'tags')::JSONB, tags), -- ✅ Autoriser modification des tags (projets)
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
COMMENT ON FUNCTION public.update_own_prospect_profile IS
'Permet à un client de mettre à jour son propre profil prospect (name, email, phone, company_name, address, form_data, tags). Bypass RLS.';
