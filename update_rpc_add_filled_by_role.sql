-- ═══════════════════════════════════════════════════════════════
-- MISE À JOUR RPC get_client_form_panels_for_org
-- Ajouter filled_by_role dans le SELECT
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_client_form_panels_for_org(
  p_organization_id UUID,
  p_prospect_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  panel_id TEXT,
  prospect_id UUID,
  project_type TEXT,
  form_id TEXT,
  prompt_id TEXT,
  current_step_index INT,
  message_timestamp BIGINT,
  status TEXT,
  user_override TEXT,
  step_name TEXT,
  filled_by_role TEXT, -- 🔥 AJOUT: client ou partner
  last_submitted_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  organization_id UUID
) AS $$
BEGIN
  -- 🔥 Si p_prospect_id fourni → Filtrer par prospect (mode client)
  -- Sinon → Tous les panels de l'org (mode admin)
  RETURN QUERY
  SELECT 
    cfp.id,
    cfp.panel_id,
    cfp.prospect_id,
    cfp.project_type,
    cfp.form_id,
    cfp.prompt_id,
    cfp.current_step_index,
    cfp.message_timestamp,
    cfp.status,
    cfp.user_override,
    cfp.step_name,
    cfp.filled_by_role, -- 🔥 AJOUT
    cfp.last_submitted_at,
    cfp.rejection_reason,
    cfp.created_at,
    cfp.updated_at,
    cfp.organization_id
  FROM client_form_panels cfp
  WHERE cfp.organization_id = p_organization_id
    AND (p_prospect_id IS NULL OR cfp.prospect_id = p_prospect_id)
  ORDER BY cfp.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ✅ Grant exécution à authenticated
GRANT EXECUTE ON FUNCTION get_client_form_panels_for_org(UUID, UUID) TO authenticated;

-- ✅ Vérifier la mise à jour
SELECT 
  p.proname AS function_name,
  pg_get_function_result(p.oid) AS return_type
FROM pg_proc p
WHERE p.proname = 'get_client_form_panels_for_org';
