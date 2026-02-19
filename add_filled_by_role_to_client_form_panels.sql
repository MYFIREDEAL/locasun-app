-- ═══════════════════════════════════════════════════════════════
-- AJOUT COLONNE filled_by_role À client_form_panels
-- Pour distinguer si le formulaire est rempli par le CLIENT ou le PARTENAIRE
-- ═══════════════════════════════════════════════════════════════

-- 1️⃣ Ajouter la colonne filled_by_role
ALTER TABLE client_form_panels 
ADD COLUMN IF NOT EXISTS filled_by_role TEXT DEFAULT 'client' CHECK (filled_by_role IN ('client', 'partner'));

-- 2️⃣ Ajouter un commentaire pour documentation
COMMENT ON COLUMN client_form_panels.filled_by_role IS 
  'Indique qui doit remplir le formulaire:
   - "client": Le formulaire est visible et rempli par le client (dashboard client)
   - "partner": Le formulaire est visible et rempli par le partenaire (mission partenaire)
   Par défaut "client" pour compatibilité avec l''existant.';

-- 3️⃣ Index pour filtrage rapide
CREATE INDEX IF NOT EXISTS idx_client_form_panels_filled_by_role 
ON client_form_panels(filled_by_role);

-- 4️⃣ Mettre à jour les panels existants créés pour partenaires
UPDATE client_form_panels
SET filled_by_role = 'partner'
WHERE panel_id LIKE 'panel-partner-%';

-- 5️⃣ METTRE À JOUR LA FONCTION RPC get_client_form_panels_for_org
-- 🔥 CRITIQUE: Ajouter filled_by_role dans le RETURN pour que le filtre côté client fonctionne
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
  filled_by_role TEXT, -- 🔥 AJOUT: Pour filtrer client vs partner
  last_submitted_at TIMESTAMPTZ,
  rejection_reason TEXT,
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
    cfp.filled_by_role, -- 🔥 AJOUT (DEFAULT 'client' en DB donc compatible existant)
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

COMMENT ON FUNCTION get_client_form_panels_for_org IS 
  'Retourne les form_panels pour une organisation (avec filled_by_role pour filtrage client/partner).
   ✅ Compatible existant: filled_by_role DEFAULT ''client'' en DB.
   ✅ Filtre automatique par organization_id (multi-tenant).
   ✅ Si p_prospect_id fourni => mode client (ses panels uniquement).
   ✅ Si p_prospect_id NULL => mode admin (tous les panels de l''org).';

-- ✅ Vérifier
SELECT 
  panel_id,
  form_id,
  filled_by_role,
  status
FROM client_form_panels
WHERE prospect_id = 'dfce4b95-fb61-4c2b-8596-8fdf9b67a9d6'
ORDER BY created_at DESC
LIMIT 3;
