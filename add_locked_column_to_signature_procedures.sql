-- ============================================
-- MIGRATION: Ajouter la colonne 'locked' à signature_procedures
-- ============================================

-- Ajouter la colonne locked si elle n'existe pas
ALTER TABLE signature_procedures
ADD COLUMN IF NOT EXISTS locked BOOLEAN DEFAULT false;

-- Ajouter un index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_signature_procedures_locked 
ON signature_procedures(locked);

-- Commentaire
COMMENT ON COLUMN signature_procedures.locked IS 'Verrouillage de la procédure après génération du PDF signé final';

-- Vérifier que la colonne a été ajoutée
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'signature_procedures' 
AND column_name = 'locked';
