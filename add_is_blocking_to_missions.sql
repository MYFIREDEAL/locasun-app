-- =====================================================
-- MIGRATION: Ajouter colonne is_blocking à missions
-- =====================================================
-- Date: 18 février 2026
-- Objectif: Fix code V1 qui insert is_blocking (colonne manquante)
-- Impact: Table missions seulement
-- Rollback: ALTER TABLE missions DROP COLUMN is_blocking;
-- =====================================================

-- Ajouter colonne
ALTER TABLE public.missions 
ADD COLUMN is_blocking BOOLEAN DEFAULT FALSE;

-- Documenter colonne
COMMENT ON COLUMN public.missions.is_blocking IS 
  'Mission bloquante : si TRUE, le workflow doit attendre complétion avant de continuer.
   
   LOGIQUE MÉTIER:
   - is_blocking = TRUE + status IN (''pending'', ''in_progress'', ''blocked'') → Workflow PAUSE
   - is_blocking = TRUE + status = ''completed'' → Workflow REPREND
   - is_blocking = FALSE → Workflow continue sans attendre (mission optionnelle)
   
   Utilisé pour synchroniser workflow automatique et exécution terrain partenaire.';

-- Vérification post-migration
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'missions' 
    AND column_name = 'is_blocking'
  ) THEN
    RAISE EXCEPTION '❌ Colonne is_blocking pas créée !';
  END IF;
  RAISE NOTICE '✅ Colonne is_blocking ajoutée avec succès';
END $$;
