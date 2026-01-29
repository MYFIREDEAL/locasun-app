-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION: Ajouter form_data à signature_procedures (V2 compatible)
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- Seule colonne manquante pour Workflow V2.
-- Le reste du schéma existe déjà (signers, signature_metadata, file_id, etc.)
--
-- ⚠️ EXÉCUTER DANS SUPABASE SQL EDITOR
-- ═══════════════════════════════════════════════════════════════════════════

-- Ajouter form_data (données collectées des formulaires pour injection contrat)
ALTER TABLE public.signature_procedures
ADD COLUMN IF NOT EXISTS form_data JSONB DEFAULT '{}';

COMMENT ON COLUMN public.signature_procedures.form_data IS 
  'Données des formulaires collectés pour injection dans le contrat (V2)';

-- Vérification
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'signature_procedures'
  AND column_name = 'form_data';

