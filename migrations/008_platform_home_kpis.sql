-- =========================================================
-- PR Platform Home — RPC KPIs globaux
-- =========================================================
-- Date : 6 février 2026
-- =========================================================

DROP FUNCTION IF EXISTS public.platform_get_home_kpis();

CREATE OR REPLACE FUNCTION public.platform_get_home_kpis()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_orgs_active integer;
  v_orgs_suspended integer;
  v_revenue_estimate integer;
  v_orgs_data jsonb;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RETURN jsonb_build_object('error', 'Access denied');
  END IF;

  -- Orgs actives
  SELECT COUNT(*) INTO v_orgs_active
  FROM public.organizations
  WHERE COALESCE(status, 'active') = 'active';

  -- Orgs suspendues
  SELECT COUNT(*) INTO v_orgs_suspended
  FROM public.organizations
  WHERE status = 'suspended';

  -- Revenu mensuel estimé (somme des monthly_price_reference)
  SELECT COALESCE(SUM(monthly_price_reference), 0) INTO v_revenue_estimate
  FROM public.organizations
  WHERE COALESCE(status, 'active') = 'active';

  -- Données des orgs pour les signaux business
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', o.id,
      'name', o.name,
      'slug', o.slug,
      'status', COALESCE(o.status, 'active'),
      'pricing_plan', o.pricing_plan,
      'monthly_price_reference', o.monthly_price_reference,
      'prospects_count', (SELECT COUNT(*) FROM public.prospects WHERE organization_id = o.id),
      'last_activity', (SELECT MAX(updated_at) FROM public.prospects WHERE organization_id = o.id)
    )
  ), '[]'::jsonb) INTO v_orgs_data
  FROM public.organizations o
  WHERE COALESCE(o.status, 'active') = 'active';

  RETURN jsonb_build_object(
    'orgs_active', v_orgs_active,
    'orgs_suspended', v_orgs_suspended,
    'revenue_estimate', v_revenue_estimate,
    'orgs_data', v_orgs_data
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.platform_get_home_kpis() TO authenticated;

NOTIFY pgrst, 'reload schema';
