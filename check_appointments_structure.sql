-- =====================================================
-- VÉRIFIER LA STRUCTURE DE appointments
-- =====================================================

-- 1. Lister toutes les colonnes de la table appointments
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'appointments'
ORDER BY ordinal_position;

-- 2. Afficher quelques exemples de données
SELECT 
  id,
  title,
  start_time,
  end_time,
  contact_id,
  -- Chercher les colonnes liées au projet
  *
FROM public.appointments
LIMIT 5;
