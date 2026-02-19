-- ============================================
-- NOUVELLE FONCTION RPC: get_client_form_panels_for_org_v2
-- ============================================
-- ⚠️ POURQUOI V2 ?
-- PostgREST cache agressivement le schema des fonctions RPC.
-- Même après DROP+CREATE de get_client_form_panels_for_org,
-- l'ancienne signature est cachée et cause l'erreur:
-- "structure of query does not match function result type"
--
-- SOLUTION: Créer une NOUVELLE fonction avec nom différent
-- pour contourner le cache PostgREST.
--
-- Date: 19 février 2026
-- ============================================

-- D'abord supprimer les anciennes versions si elles existent
DROP FUNCTION IF EXISTS get_client_form_panels_for_org_v2(UUID, UUID);
DROP FUNCTION IF EXISTS get_client_form_panels_for_org_v2(UUID);

-- Créer la nouvelle fonction V2
CREATE OR REPLACE FUNCTION get_client_form_panels_for_org_v2(
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
  form_data JSONB, -- 🔥 Données du formulaire (critique pour partenaires)
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
    cfp.form_data,
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

-- Commenter la fonction
COMMENT ON FUNCTION get_client_form_panels_for_org_v2 IS 
  'V2 de get_client_form_panels_for_org - Contourne le cache PostgREST.
   ✅ Inclut form_data pour affichage des données formulaires partenaires.
   ✅ filled_by_role pour filtrage client/partner.
   ✅ Multi-tenant via organization_id.';

-- ✅ Vérifier que la fonction est bien créée
SELECT 
  proname AS function_name,
  pg_get_function_arguments(oid) AS arguments
FROM pg_proc 
WHERE proname = 'get_client_form_panels_for_org_v2';
