-- 🔍 Voir la structure de signature_proofs
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'signature_proofs'
ORDER BY ordinal_position;

-- 🔍 Vérifier toutes les preuves de signature
SELECT *
FROM signature_proofs
ORDER BY created_at DESC
LIMIT 20;

-- 🔍 Vérifier pour eva.jones7@yopmail.com (principal)
SELECT *
FROM signature_proofs
WHERE signer_email = 'eva.jones7@yopmail.com';

-- 🔍 Vérifier pour john456@yopmail.com (co-signataire)
SELECT *
FROM signature_proofs
WHERE signer_email = 'john456@yopmail.com';
