-- =====================================================
-- MIGRATION: Ajouter colonnes client dans missions
-- =====================================================
-- Date: 2026-02-19
-- Objectif: Stocker nom, email, phone, address du client
--           directement dans missions pour éviter JOIN avec prospects
-- Impact: Table missions seulement
-- Rollback: Voir rollback_client_info_from_missions.sql

-- 1. Ajouter colonnes
ALTER TABLE public.missions 
  ADD COLUMN IF NOT EXISTS client_name TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT;

-- 2. Commentaires
COMMENT ON COLUMN public.missions.client_name IS 'Nom du client (copie depuis prospects.name)';
COMMENT ON COLUMN public.missions.email IS 'Email du client (copie depuis prospects.email)';
COMMENT ON COLUMN public.missions.phone IS 'Téléphone du client (copie depuis prospects.phone)';
COMMENT ON COLUMN public.missions.address IS 'Adresse du client (copie depuis prospects.address)';

-- 3. Vérification
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'missions'
  AND column_name IN ('client_name', 'email', 'phone', 'address')
ORDER BY column_name;

-- ✅ Attendu: 4 colonnes ajoutées (TEXT, nullable)
