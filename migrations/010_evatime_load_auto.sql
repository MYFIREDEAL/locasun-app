-- ============================================================
-- Migration 010: Automatic EVATIME Load Estimation
-- Calcul automatique de la charge basé sur l'activité
-- ============================================================

-- 1. Ajouter les colonnes pour le calcul automatique
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS evatime_load_estimated INTEGER DEFAULT NULL;

ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS evatime_load_score INTEGER DEFAULT NULL;

-- 2. Ajouter check constraints
ALTER TABLE public.organizations
DROP CONSTRAINT IF EXISTS check_evatime_load_estimated_range;

ALTER TABLE public.organizations
ADD CONSTRAINT check_evatime_load_estimated_range 
CHECK (evatime_load_estimated IS NULL OR (evatime_load_estimated >= 0 AND evatime_load_estimated <= 3));

-- 3. Créer la RPC de calcul automatique
DROP FUNCTION IF EXISTS public.platform_calculate_evatime_load(uuid);

CREATE OR REPLACE FUNCTION public.platform_calculate_evatime_load(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_score integer := 0;
  v_load integer := 0;
  v_users_count integer := 0;
  v_prospects_count integer := 0;
  v_projects_count integer := 0;
  v_forms_pending integer := 0;
  v_files_count integer := 0;
  v_recent_activity boolean := false;
  v_last_activity timestamp;
BEGIN
  -- Vérifier que l'appelant est platform admin
  IF NOT public.is_platform_admin() THEN
    RETURN jsonb_build_object('error', 'Access denied: platform admin required');
  END IF;

  -- Vérifier que l'org existe
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = p_org_id) THEN
    RETURN jsonb_build_object('error', 'Organization not found');
  END IF;

  -- Compter les utilisateurs
  SELECT COUNT(*) INTO v_users_count FROM users WHERE organization_id = p_org_id;
  
  -- Compter les prospects
  SELECT COUNT(*) INTO v_prospects_count FROM prospects WHERE organization_id = p_org_id;
  
  -- Compter les projets (via project_steps_status)
  SELECT COUNT(DISTINCT prospect_id || project_type) INTO v_projects_count 
  FROM project_steps_status WHERE organization_id = p_org_id;
  
  -- Compter les formulaires en attente
  SELECT COUNT(*) INTO v_forms_pending 
  FROM client_form_panels 
  WHERE organization_id = p_org_id AND status = 'pending';
  
  -- Compter les fichiers
  SELECT COUNT(*) INTO v_files_count 
  FROM project_files WHERE organization_id = p_org_id;
  
  -- Vérifier activité récente (30 jours)
  SELECT MAX(updated_at) INTO v_last_activity 
  FROM prospects WHERE organization_id = p_org_id;
  
  v_recent_activity := v_last_activity IS NOT NULL 
    AND v_last_activity > (NOW() - INTERVAL '30 days');

  -- ============================================================
  -- CALCUL DU SCORE (0 à 100+)
  -- ============================================================
  
  -- Users: 0-5 points
  v_score := v_score + LEAST(v_users_count * 2, 10);
  
  -- Prospects: 0-30 points
  v_score := v_score + LEAST(v_prospects_count, 30);
  
  -- Projects: 0-20 points
  v_score := v_score + LEAST(v_projects_count * 2, 20);
  
  -- Forms pending: 0-20 points (plus il y en a, plus c'est lourd)
  v_score := v_score + LEAST(v_forms_pending * 5, 20);
  
  -- Files: 0-10 points
  v_score := v_score + LEAST(v_files_count / 10, 10);
  
  -- Activité récente: +10 points
  IF v_recent_activity THEN
    v_score := v_score + 10;
  END IF;

  -- ============================================================
  -- CONVERSION SCORE → LOAD (0-3)
  -- ============================================================
  
  IF v_score <= 15 THEN
    v_load := 0;  -- Léger
  ELSIF v_score <= 40 THEN
    v_load := 1;  -- Normal
  ELSIF v_score <= 70 THEN
    v_load := 2;  -- Complexe
  ELSE
    v_load := 3;  -- Critique
  END IF;

  -- Sauvegarder dans la table
  UPDATE organizations
  SET 
    evatime_load_estimated = v_load,
    evatime_load_score = v_score
  WHERE id = p_org_id;

  RETURN jsonb_build_object(
    'success', true,
    'load', v_load,
    'score', v_score,
    'details', jsonb_build_object(
      'users', v_users_count,
      'prospects', v_prospects_count,
      'projects', v_projects_count,
      'forms_pending', v_forms_pending,
      'files', v_files_count,
      'recent_activity', v_recent_activity
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.platform_calculate_evatime_load(uuid) TO authenticated;

-- 4. Mettre à jour platform_get_organization_detail pour inclure les nouveaux champs
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

  -- Récupérer l'organisation avec tous les champs
  SELECT jsonb_build_object(
    'id', o.id,
    'name', o.name,
    'slug', o.slug,
    'status', o.status,
    'created_at', o.created_at,
    'pricing_plan', o.pricing_plan,
    'monthly_price_reference', o.monthly_price_reference,
    'evatime_load', o.evatime_load,
    'evatime_load_estimated', o.evatime_load_estimated,
    'evatime_load_score', o.evatime_load_score
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

GRANT EXECUTE ON FUNCTION public.platform_get_organization_detail(uuid) TO authenticated;

-- 5. Mettre à jour platform_get_home_kpis pour inclure les champs de charge
DROP FUNCTION IF EXISTS public.platform_get_home_kpis();

CREATE OR REPLACE FUNCTION public.platform_get_home_kpis()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  orgs_active integer;
  orgs_suspended integer;
  revenue_estimate integer;
  orgs_data jsonb;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: platform admin required';
  END IF;

  SELECT COUNT(*) INTO orgs_active FROM organizations WHERE status = 'active';
  SELECT COUNT(*) INTO orgs_suspended FROM organizations WHERE status = 'suspended';
  SELECT COALESCE(SUM(monthly_price_reference), 0)::integer INTO revenue_estimate 
    FROM organizations WHERE status = 'active' AND monthly_price_reference IS NOT NULL;

  SELECT jsonb_agg(jsonb_build_object(
    'id', o.id,
    'name', o.name,
    'slug', o.slug,
    'status', o.status,
    'pricing_plan', o.pricing_plan,
    'monthly_price_reference', o.monthly_price_reference,
    'evatime_load', o.evatime_load,
    'evatime_load_estimated', o.evatime_load_estimated,
    'evatime_load_score', o.evatime_load_score,
    'users_count', (SELECT COUNT(*) FROM users u WHERE u.organization_id = o.id),
    'prospects_count', (SELECT COUNT(*) FROM prospects p WHERE p.organization_id = o.id)
  )) INTO orgs_data FROM organizations o;

  RETURN jsonb_build_object(
    'orgs_active', orgs_active,
    'orgs_suspended', orgs_suspended,
    'revenue_estimate', revenue_estimate,
    'orgs_data', COALESCE(orgs_data, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.platform_get_home_kpis() TO authenticated;
