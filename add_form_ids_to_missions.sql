-- ═══════════════════════════════════════════════════════════════
-- AJOUT COLONNE form_ids À LA TABLE missions
-- Pour stocker les IDs des formulaires associés à une mission partenaire
-- ═══════════════════════════════════════════════════════════════

-- 1️⃣ Ajouter la colonne form_ids (array de TEXT)
ALTER TABLE missions ADD COLUMN IF NOT EXISTS form_ids TEXT[];

-- 2️⃣ Ajouter un commentaire pour documentation
COMMENT ON COLUMN missions.form_ids IS 
  'IDs des formulaires que le partenaire doit remplir pour cette mission. 
   Utilisé quand Workflow V2 crée une mission avec actionType=FORM et target=PARTENAIRE.
   Les form_panels correspondants sont créés dans client_form_panels avec prospect_id du client.';

-- 3️⃣ Index GIN pour recherche efficace dans l'array
CREATE INDEX IF NOT EXISTS idx_missions_form_ids ON missions USING GIN (form_ids);

-- ✅ Vérifier que la colonne existe
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'missions' AND column_name = 'form_ids';
