-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION: Ajouter verification_mode à client_form_panels
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- Source unique de vérité pour savoir si une vérification humaine est requise.
-- Compatible V1 et V2.
--
-- ⚠️ EXÉCUTER DANS SUPABASE SQL EDITOR
-- ═══════════════════════════════════════════════════════════════════════════

-- Ajouter la colonne verification_mode
ALTER TABLE public.client_form_panels
ADD COLUMN IF NOT EXISTS verification_mode TEXT DEFAULT 'HUMAN';

COMMENT ON COLUMN public.client_form_panels.verification_mode IS 
  'Mode de vérification du formulaire:
   - HUMAN: Une tâche est créée pour le commercial quand le client soumet
   - AI: Pas de tâche créée, workflow continue automatiquement
   Source unique de vérité (compatible V1 et V2)';

-- Vérification
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'client_form_panels'
  AND column_name = 'verification_mode';
