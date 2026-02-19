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
