-- =====================================================
-- ROLLBACK: Supprimer colonnes client de missions
-- =====================================================
-- Date: 2026-02-19
-- Objectif: Annuler add_client_info_to_missions.sql

ALTER TABLE public.missions 
  DROP COLUMN IF EXISTS client_name,
  DROP COLUMN IF EXISTS email,
  DROP COLUMN IF EXISTS phone,
  DROP COLUMN IF EXISTS address;

-- Vérification
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'missions'
  AND column_name IN ('client_name', 'email', 'phone', 'address');

-- ✅ Attendu: 0 rows (colonnes supprimées)
