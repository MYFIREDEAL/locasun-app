-- 📋 Lister toutes les tables publiques de Supabase

SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 📊 Voir les colonnes de signature_procedures
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'signature_procedures'
ORDER BY ordinal_position;
