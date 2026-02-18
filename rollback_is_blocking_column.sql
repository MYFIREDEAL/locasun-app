-- =====================================================
-- ROLLBACK: Supprimer colonne is_blocking
-- =====================================================
-- Date: 18 février 2026
-- Objectif: Annuler migration add_is_blocking_to_missions.sql
-- Impact: Supprime colonne is_blocking de table missions
-- =====================================================

ALTER TABLE public.missions 
DROP COLUMN IF EXISTS is_blocking;

-- Vérification post-rollback
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'missions' 
    AND column_name = 'is_blocking'
  ) THEN
    RAISE EXCEPTION '❌ Colonne is_blocking toujours présente !';
  END IF;
  RAISE NOTICE '✅ Colonne is_blocking supprimée avec succès';
END $$;
