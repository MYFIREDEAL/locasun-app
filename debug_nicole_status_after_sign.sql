-- 🔍 Vérifier le statut actuel de Nicoleta après signature

SELECT 
  id,
  status,
  signers
FROM signature_procedures
WHERE id IN (
  SELECT signature_procedure_id 
  FROM cosigner_invite_tokens 
  WHERE signer_email = 'nicoleta@yopmail.com'
)
ORDER BY created_at DESC
LIMIT 1;

-- Extraire juste le cosigner Nicoleta
SELECT 
  id,
  jsonb_array_elements(signers) -> 'email' as signer_email,
  jsonb_array_elements(signers) -> 'status' as signer_status,
  jsonb_array_elements(signers) -> 'signed_at' as signed_at
FROM signature_procedures
WHERE id IN (
  SELECT signature_procedure_id 
  FROM cosigner_invite_tokens 
  WHERE signer_email = 'nicoleta@yopmail.com'
);
