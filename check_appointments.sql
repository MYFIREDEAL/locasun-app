-- Vérifier la structure de la table appointments
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'appointments'
ORDER BY ordinal_position;
