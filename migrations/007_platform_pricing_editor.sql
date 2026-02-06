-- =========================================================
-- PR Pricing — Ajouter pricing_plan et monthly_price_reference à la RPC
-- =========================================================
-- Date : 6 février 2026
-- Prérequis : Colonnes pricing_plan et monthly_price_reference existent dans organizations
-- =========================================================

-- Vérifier/créer les colonnes si nécessaire
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'pricing_plan'
  ) THEN
    ALTER TABLE public.organizations ADD COLUMN pricing_plan text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'monthly_price_reference'
  ) THEN
    ALTER TABLE public.organizations ADD COLUMN monthly_price_reference integer;
  END IF;
END $$;

-- Mettre à jour platform_get_organization_detail pour inclure pricing
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
  IF NOT public.is_platform_admin() THEN
    RETURN jsonb_build_object('error', 'Access denied');
  END IF;

  -- Organisation (avec status + pricing)
  SELECT jsonb_build_object(
    'id', o.id,
    'name', o.name,
    'slug', o.slug,
    'status', COALESCE(o.status, 'active'),
    'pricing_plan', o.pricing_plan,
    'monthly_price_reference', o.monthly_price_reference,
    'created_at', o.created_at,
    'updated_at', o.updated_at
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

  v_result := jsonb_build_object(
    'organization', v_org,
    'domains', v_domains,
    'settings', COALESCE(v_settings, '{}'::jsonb)
  );

  RETURN v_result;
END;
$$;

-- RPC pour mettre à jour le pricing (platform admin only)
DROP FUNCTION IF EXISTS public.platform_update_org_pricing(uuid, text, integer);

CREATE OR REPLACE FUNCTION public.platform_update_org_pricing(
  p_org_id uuid,
  p_pricing_plan text,
  p_monthly_price integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = p_org_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization not found');
  END IF;

  UPDATE public.organizations
  SET 
    pricing_plan = p_pricing_plan,
    monthly_price_reference = p_monthly_price,
    updated_at = now()
  WHERE id = p_org_id;

  RETURN jsonb_build_object(
    'success', true,
    'org_id', p_org_id,
    'pricing_plan', p_pricing_plan,
    'monthly_price_reference', p_monthly_price
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.platform_update_org_pricing(uuid, text, integer) TO authenticated;

NOTIFY pgrst, 'reload schema';
