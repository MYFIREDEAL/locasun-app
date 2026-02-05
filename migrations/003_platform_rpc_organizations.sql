-- =========================================================
-- STEP 2A — RPC Platform (list + detail organizations)
-- =========================================================
-- Date : 5 février 2026
-- Prérequis : Table platform_admins créée (Step 1A)
-- =========================================================

-- ============================================
-- 1️⃣ RPC: platform_list_organizations
-- ============================================
-- Liste toutes les organisations (réservé aux platform_admins)

DROP FUNCTION IF EXISTS public.platform_list_organizations();

CREATE OR REPLACE FUNCTION public.platform_list_organizations()
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
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
    o.created_at
  FROM public.organizations o
  WHERE public.is_platform_admin()
  ORDER BY o.created_at DESC;
$$;

-- Commentaire
COMMENT ON FUNCTION public.platform_list_organizations() IS 
  'Liste toutes les organisations (réservé aux platform_admins via is_platform_admin())';

-- ============================================
-- 2️⃣ RPC: platform_get_organization_detail
-- ============================================
-- Détail complet d'une organisation (org + domains + settings)

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

  -- Organisation
  SELECT jsonb_build_object(
    'id', o.id,
    'name', o.name,
    'slug', o.slug,
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

-- Commentaire
COMMENT ON FUNCTION public.platform_get_organization_detail(uuid) IS 
  'Détail complet d''une organisation (org + domains + settings) - réservé aux platform_admins';

-- ============================================
-- 3️⃣ VÉRIFICATION
-- ============================================
-- Tester (en tant que platform_admin connecté) :
-- SELECT * FROM public.platform_list_organizations();
-- SELECT public.platform_get_organization_detail('uuid-de-l-org');
