-- ============================================
-- SCRIPT SQL: Trouver une procédure de signature pour tester
-- ============================================

-- 1️⃣ Lister toutes les procédures avec status 'completed'
SELECT 
  id,
  prospect_id,
  project_type,
  status,
  signer_name,
  signer_email,
  signers,
  signed_file_id,
  locked,
  created_at
FROM signature_procedures
WHERE status = 'completed'
ORDER BY created_at DESC
LIMIT 5;

-- 2️⃣ Vérifier les preuves de signature pour une procédure
-- Remplacer 'PROCEDURE_ID' par un vrai ID
SELECT 
  id,
  signature_procedure_id,
  signer_email,
  pdf_hash,
  ip_address,
  created_at
FROM signature_proofs
WHERE signature_procedure_id = 'PROCEDURE_ID'
ORDER BY created_at;

-- 3️⃣ Vérifier les signataires dans le JSONB signers[]
-- Remplacer 'PROCEDURE_ID' par un vrai ID
SELECT 
  id,
  jsonb_array_length(signers) as total_signers,
  (
    SELECT COUNT(*)
    FROM jsonb_array_elements(signers) AS signer
    WHERE signer->>'status' = 'signed'
  ) as signed_count,
  signers
FROM signature_procedures
WHERE id = 'PROCEDURE_ID';

-- 4️⃣ Si aucune procédure 'completed', en chercher une 'partially_signed'
SELECT 
  id,
  prospect_id,
  status,
  signer_name,
  signers,
  created_at
FROM signature_procedures
WHERE status IN ('completed', 'partially_signed')
ORDER BY created_at DESC
LIMIT 10;

-- 5️⃣ Vérifier le fichier original (PDF source)
SELECT 
  sp.id as procedure_id,
  sp.status,
  pf.id as file_id,
  pf.file_name,
  pf.storage_path,
  pf.file_size
FROM signature_procedures sp
INNER JOIN project_files pf ON sp.file_id = pf.id
WHERE sp.status = 'completed'
LIMIT 5;

-- 6️⃣ Créer une procédure de TEST (si besoin)
/*
-- ⚠️ À UTILISER UNIQUEMENT EN DEV
INSERT INTO signature_procedures (
  organization_id,
  prospect_id,
  project_type,
  file_id,
  signer_name,
  signer_email,
  status,
  signers,
  access_token,
  access_token_expires_at
)
VALUES (
  'YOUR_ORG_ID',
  'YOUR_PROSPECT_ID',
  'ACC',
  'YOUR_FILE_ID',
  'Test User',
  'test@example.com',
  'completed',
  '[
    {
      "role": "owner",
      "name": "Test User",
      "email": "test@example.com",
      "status": "signed",
      "signed_at": "2026-01-13T10:00:00Z"
    }
  ]'::jsonb,
  gen_random_uuid()::text,
  NOW() + INTERVAL '7 days'
)
RETURNING id;
*/
