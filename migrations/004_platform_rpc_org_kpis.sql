-- =========================================================
-- STEP 3A — RPC Platform KPIs V1
-- =========================================================
-- Date : 6 février 2026
-- Prérequis : Table platform_admins + RPC platform_* créées
-- =========================================================

DROP FUNCTION IF EXISTS public.platform_get_org_kpis(uuid);

CREATE OR REPLACE FUNCTION public.platform_get_org_kpis(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admins integer;
  v_prospects integer;
  v_projects integer;
  v_projects_active integer;
  v_forms_pending integer;
  v_files integer;
  v_last_activity timestamptz;
BEGIN
  -- Vérifier accès platform_admin
  IF NOT public.is_platform_admin() THEN
    RETURN jsonb_build_object('error', 'Access denied');
  END IF;

  -- Vérifier que l'org existe
  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = p_org_id) THEN
    RETURN jsonb_build_object('error', 'Organization not found');
  END IF;

  -- Nombre d'admins (users de cette org)
  SELECT COUNT(*) INTO v_admins
  FROM public.users
  WHERE organization_id = p_org_id;

  -- Nombre de prospects
  SELECT COUNT(*) INTO v_prospects
  FROM public.prospects
  WHERE organization_id = p_org_id;

  -- Nombre de projets (project_steps_status distinct par prospect+project_type)
  SELECT COUNT(DISTINCT (prospect_id, project_type)) INTO v_projects
  FROM public.project_steps_status
  WHERE organization_id = p_org_id;

  -- Projets actifs (au moins une étape non terminée)
  SELECT COUNT(DISTINCT (prospect_id, project_type)) INTO v_projects_active
  FROM public.project_steps_status
  WHERE organization_id = p_org_id
    AND status != 'completed';

  -- Formulaires en attente (panels non soumis ou en attente de validation)
  SELECT COUNT(*) INTO v_forms_pending
  FROM public.client_form_panels
  WHERE organization_id = p_org_id
    AND (status IS NULL OR status IN ('pending', 'sent', 'opened'));

  -- Nombre de fichiers
  SELECT COUNT(*) INTO v_files
  FROM public.project_files pf
  JOIN public.prospects p ON pf.prospect_id = p.id
  WHERE p.organization_id = p_org_id;

  -- Dernière activité (max updated_at parmi prospects, chat_messages, appointments)
  SELECT GREATEST(
    (SELECT MAX(updated_at) FROM public.prospects WHERE organization_id = p_org_id),
    (SELECT MAX(cm.created_at) FROM public.chat_messages cm 
     JOIN public.prospects p ON cm.prospect_id = p.id 
     WHERE p.organization_id = p_org_id),
    (SELECT MAX(a.updated_at) FROM public.appointments a 
     JOIN public.users u ON a.assigned_user_id = u.id 
     WHERE u.organization_id = p_org_id)
  ) INTO v_last_activity;

  RETURN jsonb_build_object(
    'admins', COALESCE(v_admins, 0),
    'prospects', COALESCE(v_prospects, 0),
    'projects', COALESCE(v_projects, 0),
    'projects_active', COALESCE(v_projects_active, 0),
    'forms_pending', COALESCE(v_forms_pending, 0),
    'files', COALESCE(v_files, 0),
    'last_activity', v_last_activity
  );
END;
$$;

COMMENT ON FUNCTION public.platform_get_org_kpis(uuid) IS 
  'KPIs V1 pour une organisation (réservé aux platform_admins)';

-- ============================================
-- VÉRIFICATION
-- ============================================
-- SELECT public.platform_get_org_kpis('uuid-de-l-org');
