-- Ajouter colonnes pour PDF signé final et verrouillage
ALTER TABLE signature_procedures
ADD COLUMN IF NOT EXISTS signed_file_id UUID REFERENCES project_files(id),
ADD COLUMN IF NOT EXISTS locked BOOLEAN DEFAULT false;

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_signature_procedures_signed_file ON signature_procedures(signed_file_id);
CREATE INDEX IF NOT EXISTS idx_signature_procedures_locked ON signature_procedures(locked);
