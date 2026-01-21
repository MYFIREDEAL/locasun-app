-- =====================================================
-- RPC : Vérifier si un prospect existe par email ET organization_id
-- Multi-tenant : Vérifie uniquement dans l'organisation spécifiée
-- SECURITY DEFINER : Autorise les utilisateurs anonymes
-- =====================================================

CREATE OR REPLACE FUNCTION public.check_prospect_exists_in_org(
  p_email TEXT,
  p_organization_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Retourner TRUE si un prospect avec cet email existe dans cette organisation
  RETURN EXISTS (
    SELECT 1 
    FROM public.prospects 
    WHERE email = p_email
      AND organization_id = p_organization_id
  );
END;
$$;

-- Accorder l'exécution aux utilisateurs anonymes ET authentifiés
GRANT EXECUTE ON FUNCTION public.check_prospect_exists_in_org TO anon, authenticated;

COMMENT ON FUNCTION public.check_prospect_exists_in_org IS 
  'Vérifie si un prospect existe avec cet email dans une organisation spécifique (multi-tenant, accessible aux anonymes)';
