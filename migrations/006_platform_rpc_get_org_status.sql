-- =========================================================
-- STEP 5 — RPC Platform Get Org Status (pour blocage login)
-- =========================================================
-- Date : 6 février 2026
-- Prérequis : Colonne organizations.status existe (PR-4)
-- =========================================================

DROP FUNCTION IF EXISTS public.platform_get_org_status(uuid);

CREATE OR REPLACE FUNCTION public.platform_get_org_status(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_status text;
BEGIN
  -- Pas de vérification platform_admin ici car utilisé par tous les users
  -- pour vérifier le statut de leur propre org au login
  
  SELECT COALESCE(status, 'active') INTO v_status
  FROM public.organizations
  WHERE id = p_org_id;

  IF v_status IS NULL THEN
    RETURN jsonb_build_object('error', 'Organization not found');
  END IF;

  RETURN jsonb_build_object('status', v_status);
END;
$$;

COMMENT ON FUNCTION public.platform_get_org_status(uuid) IS 
  'Retourne le statut d''une organisation (active/suspended) - accessible à tous pour vérification au login';

-- Permissions pour authenticated ET anon (vérification au login)
GRANT EXECUTE ON FUNCTION public.platform_get_org_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_get_org_status(uuid) TO anon;

NOTIFY pgrst, 'reload schema';

-- ============================================
-- VÉRIFICATION
-- ============================================
-- SELECT public.platform_get_org_status('uuid-de-l-org');
