-- ============================================
-- AJOUT form_data DANS LA RPC get_client_form_panels_for_org
-- ============================================
-- La RPC doit retourner form_data pour que l'admin puisse voir
-- les données des formulaires partenaires (stockées dans le panel, pas dans prospect)
--
-- Date: 19 février 2026
-- ============================================

-- ⚠️ DROP obligatoire car on change le type de retour (ajout d'une colonne)
DROP FUNCTION IF EXISTS get_client_form_panels_for_org(UUID, UUID);

CREATE FUNCTION get_client_form_panels_for_org(
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
  filled_by_role TEXT,
  form_data JSONB, -- 🔥 AJOUT: Données du formulaire (critique pour partenaires)
  last_submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  organization_id UUID
) AS $$
BEGIN
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
    cfp.filled_by_role,
    cfp.form_data, -- 🔥 AJOUT
    cfp.last_submitted_at,
    cfp.created_at,
    cfp.updated_at,
    cfp.organization_id
  FROM client_form_panels cfp
  WHERE cfp.organization_id = p_organization_id
    AND (p_prospect_id IS NULL OR cfp.prospect_id = p_prospect_id)
  ORDER BY cfp.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_client_form_panels_for_org IS 
  'Retourne les form_panels pour une organisation.
   ✅ Inclut form_data pour affichage des données formulaires partenaires.
   ✅ filled_by_role pour filtrage client/partner.
   ✅ Multi-tenant via organization_id.';

-- ✅ Vérifier
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'client_form_panels' 
  AND column_name = 'form_data';
