-- ============================================================
-- Migration: Ajouter colonne action_type à client_form_panels
-- Date: 2026-02-20
-- But: Distinguer les panels de type 'form', 'signature', 'message'
--      pour le type d'action MESSAGE du Workflow V2
-- ============================================================

-- 1. Ajouter la colonne action_type (défaut 'form' pour compatibilité)
ALTER TABLE client_form_panels
ADD COLUMN IF NOT EXISTS action_type TEXT DEFAULT 'form';

-- 2. Commentaire explicatif
COMMENT ON COLUMN client_form_panels.action_type IS 
  'Type d''action du workflow: form (formulaire), signature (signature), message (boutons validation client)';

-- 3. Vérification
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'client_form_panels' AND column_name = 'action_type';
