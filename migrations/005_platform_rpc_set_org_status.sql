-- =========================================================
-- STEP 4 — RPC Platform Governance (Suspend / Reactivate)
-- =========================================================
-- Date : 6 février 2026
-- Prérequis : Table platform_admins + organizations.status
-- =========================================================

-- S'assurer que la colonne status existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.organizations 
    ADD COLUMN status text DEFAULT 'active' 
    CHECK (status IN ('active', 'suspended'));
  END IF;
END $$;

-- ============================================
-- 1️⃣ Mettre à jour platform_list_organizations pour inclure status
-- ============================================
DROP FUNCTION IF EXISTS public.platform_list_organizations();

CREATE OR REPLACE FUNCTION public.platform_list_organizations()
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  status text,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT 
    o.id,
    o.name,
    o.slug,
    COALESCE(o.status, 'active') as status,
    o.created_at
  FROM public.organizations o
  WHERE public.is_platform_admin()
  ORDER BY o.created_at DESC;
$$;

-- ============================================
-- 2️⃣ Mettre à jour platform_get_organization_detail pour inclure status
-- ============================================
DROP FUNCTION IF EXISTS public.platform_get_organization_detail(uuid);

CREATE OR REPLACE FUNCTION public.platform_get_organization_detail(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result jsonb;
  v_org jsonb;
  v_domains jsonb;
  v_settings jsonb;
BEGIN
  -- Vérifier accès platform_admin
  IF NOT public.is_platform_admin() THEN
    RETURN jsonb_build_object('error', 'Access denied');
  END IF;

  -- Organisation (avec status)
  SELECT jsonb_build_object(
    'id', o.id,
    'name', o.name,
    'slug', o.slug,
    'status', COALESCE(o.status, 'active'),
    'created_at', o.created_at
  ) INTO v_org
  FROM public.organizations o
  WHERE o.id = p_org_id;

  IF v_org IS NULL THEN
    RETURN jsonb_build_object('error', 'Organization not found');
  END IF;

  -- Domaines
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', d.id,
      'domain', d.domain,
      'is_primary', d.is_primary,
      'created_at', d.created_at
    )
  ), '[]'::jsonb) INTO v_domains
  FROM public.organization_domains d
  WHERE d.organization_id = p_org_id;

  -- Settings (branding)
  SELECT jsonb_build_object(
    'display_name', s.display_name,
    'logo_url', s.logo_url,
    'primary_color', s.primary_color,
    'secondary_color', s.secondary_color
  ) INTO v_settings
  FROM public.organization_settings s
  WHERE s.organization_id = p_org_id;

  -- Résultat final
  v_result := jsonb_build_object(
    'organization', v_org,
    'domains', v_domains,
    'settings', COALESCE(v_settings, '{}'::jsonb)
  );

  RETURN v_result;
END;
$$;

-- ============================================
-- 3️⃣ Fonction RPC pour changer le statut d'une organisation
-- ============================================
DROP FUNCTION IF EXISTS public.platform_set_org_status(uuid, text);

CREATE OR REPLACE FUNCTION public.platform_set_org_status(
  p_org_id uuid,
  p_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Vérifier accès platform_admin
  IF NOT public.is_platform_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;

  -- Valider le statut
  IF p_status NOT IN ('active', 'suspended') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid status. Must be active or suspended');
  END IF;

  -- Vérifier que l'org existe
  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = p_org_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization not found');
  END IF;

  -- Mettre à jour le statut
  UPDATE public.organizations
  SET status = p_status,
      updated_at = now()
  WHERE id = p_org_id;

  RETURN jsonb_build_object(
    'success', true,
    'org_id', p_org_id,
    'status', p_status
  );
END;
$$;

COMMENT ON FUNCTION public.platform_set_org_status(uuid, text) IS 
  'Suspend ou réactive une organisation (réservé aux platform_admins)';

-- Permissions
GRANT EXECUTE ON FUNCTION public.platform_set_org_status(uuid, text) TO authenticated;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- ============================================
-- VÉRIFICATION
-- ============================================
-- SELECT public.platform_set_org_status('uuid-org', 'suspended');
-- SELECT public.platform_set_org_status('uuid-org', 'active');
