-- ============================================================
-- Migration: Rendre form_id nullable pour les actions MESSAGE
-- Date: 2026-03-09
-- But: Les panels de type MESSAGE n'ont pas de formulaire,
--      form_id doit donc être nullable
-- ============================================================

-- Supprimer la contrainte NOT NULL sur form_id
ALTER TABLE client_form_panels
ALTER COLUMN form_id DROP NOT NULL;

-- Vérification
SELECT column_name, is_nullable, data_type
FROM information_schema.columns
WHERE table_name = 'client_form_panels' AND column_name = 'form_id';
