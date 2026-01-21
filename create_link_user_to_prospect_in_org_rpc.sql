-- =====================================================
-- RPC : Lier un user_id à un prospect par email + organization
-- Multi-tenant : Permet de "switch" d'org automatiquement
-- SECURITY DEFINER : Bypass RLS pour lier correctement
-- =====================================================

CREATE OR REPLACE FUNCTION public.link_user_to_prospect_in_org(
  p_user_id UUID,
  p_email TEXT,
  p_organization_id UUID
)
RETURNS UUID -- Retourne l'ID du prospect lié
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prospect_id UUID;
BEGIN
  -- Trouver le prospect avec cet email dans cette organisation
  SELECT id INTO v_prospect_id
  FROM public.prospects
  WHERE email = p_email
    AND organization_id = p_organization_id
  LIMIT 1;

  -- Si trouvé, lier le user_id
  IF v_prospect_id IS NOT NULL THEN
    UPDATE public.prospects
    SET user_id = p_user_id
    WHERE id = v_prospect_id;
    
    RETURN v_prospect_id;
  END IF;

  RETURN NULL;
END;
$$;

-- Accorder l'exécution aux utilisateurs authentifiés uniquement
GRANT EXECUTE ON FUNCTION public.link_user_to_prospect_in_org TO authenticated;

COMMENT ON FUNCTION public.link_user_to_prospect_in_org IS 
  'Lie un user_id à un prospect existant dans une organisation spécifique (multi-tenant, bypass RLS)';
