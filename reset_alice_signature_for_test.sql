-- ============================================
-- Créer un nouveau test de signature pour Alice
-- (pour voir les logs avec les corrections)
-- ============================================

-- 1️⃣ Réinitialiser la procédure d'Alice pour la retester
UPDATE signature_procedures
SET 
  status = 'pending',
  signed_file_id = NULL,
  signed_at = NULL,
  signers = jsonb_set(
    jsonb_set(
      signers,
      '{0,status}',
      '"pending"'
    ),
    '{0,signed_at}',
    'null'
  )
WHERE id = '2819adf6-39d4-425e-87f6-f999267640cd';

-- 2️⃣ Si vous avez un co-signataire, le réinitialiser aussi
UPDATE signature_procedures
SET signers = jsonb_set(
    jsonb_set(
      signers,
      '{1,status}',
      '"pending"'
    ),
    '{1,signed_at}',
    'null'
  )
WHERE id = '2819adf6-39d4-425e-87f6-f999267640cd'
AND jsonb_array_length(signers) > 1;

-- 3️⃣ Vérifier la réinitialisation
SELECT 
  id,
  status,
  signed_file_id,
  jsonb_pretty(signers) as signers_status
FROM signature_procedures
WHERE id = '2819adf6-39d4-425e-87f6-f999267640cd';
