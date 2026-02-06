-- ============================================================
-- Migration 009: Add EVATIME Load Indicator
-- Indicateur interne de charge (0-3) pour pricing guardrail
-- ============================================================

-- 1. Ajouter la colonne evatime_load à organizations
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS evatime_load INTEGER DEFAULT NULL;

-- 2. Ajouter un check constraint pour les valeurs valides (0-3)
ALTER TABLE public.organizations
DROP CONSTRAINT IF EXISTS check_evatime_load_range;

ALTER TABLE public.organizations
ADD CONSTRAINT check_evatime_load_range 
CHECK (evatime_load IS NULL OR (evatime_load >= 0 AND evatime_load <= 3));

-- 3. Mettre à jour platform_get_organization_detail pour inclure evatime_load
DROP FUNCTION IF EXISTS public.platform_get_organization_detail(uuid);

CREATE OR REPLACE FUNCTION public.platform_get_organization_detail(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  org_data jsonb;
  domains_data jsonb;
  settings_data jsonb;
BEGIN
  -- Vérifier que l'appelant est platform admin
  IF NOT public.is_platform_admin() THEN
    RETURN jsonb_build_object('error', 'Access denied: platform admin required');
  END IF;

  -- Récupérer l'organisation avec evatime_load
  SELECT jsonb_build_object(
    'id', o.id,
    'name', o.name,
    'slug', o.slug,
    'status', o.status,
    'created_at', o.created_at,
    'pricing_plan', o.pricing_plan,
    'monthly_price_reference', o.monthly_price_reference,
    'evatime_load', o.evatime_load
  ) INTO org_data
  FROM public.organizations o
  WHERE o.id = p_org_id;

  IF org_data IS NULL THEN
    RETURN jsonb_build_object('error', 'Organization not found');
  END IF;

  -- Récupérer les domaines
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', d.id,
    'domain', d.domain,
    'verified', d.verified
  )), '[]'::jsonb) INTO domains_data
  FROM public.organization_domains d
  WHERE d.organization_id = p_org_id;

  -- Récupérer les settings
  SELECT jsonb_build_object(
    'id', s.id,
    'company_name', s.company_name,
    'company_siret', s.company_siret,
    'company_address', s.company_address
  ) INTO settings_data
  FROM public.organization_settings s
  WHERE s.organization_id = p_org_id;

  RETURN jsonb_build_object(
    'organization', org_data,
    'domains', domains_data,
    'settings', COALESCE(settings_data, '{}'::jsonb)
  );
END;
$$;

-- 4. Créer RPC pour mettre à jour evatime_load
DROP FUNCTION IF EXISTS public.platform_update_org_load(uuid, integer);

CREATE OR REPLACE FUNCTION public.platform_update_org_load(
  p_org_id uuid,
  p_evatime_load integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Vérifier que l'appelant est platform admin
  IF NOT public.is_platform_admin() THEN
    RETURN jsonb_build_object('error', 'Access denied: platform admin required');
  END IF;

  -- Valider la valeur
  IF p_evatime_load IS NOT NULL AND (p_evatime_load < 0 OR p_evatime_load > 3) THEN
    RETURN jsonb_build_object('error', 'Invalid load value: must be 0-3');
  END IF;

  -- Mettre à jour
  UPDATE public.organizations
  SET evatime_load = p_evatime_load
  WHERE id = p_org_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Organization not found');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.platform_update_org_load(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_get_organization_detail(uuid) TO authenticated;
