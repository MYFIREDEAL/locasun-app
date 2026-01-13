-- 🔍 DEBUG: Pourquoi le cosigner ne voit pas "Déjà signé" ?

-- 1️⃣ Vérifier les tokens des cosigners
SELECT 
  token,
  signature_procedure_id,
  signer_email,
  created_at,
  used_at,
  expires_at
FROM cosigner_invite_tokens
ORDER BY created_at DESC
LIMIT 10;

-- 2️⃣ Vérifier les procédures de signature
SELECT 
  id,
  prospect_id,
  project_type,
  status,
  signer_name,
  signer_email,
  signers,
  created_at,
  signed_at
FROM signature_procedures
ORDER BY created_at DESC
LIMIT 10;

-- 3️⃣ Vérifier les preuves de signature (signature_proofs)
SELECT 
  id,
  signature_procedure_id,
  signer_email,
  signer_user_id,
  pdf_file_id,
  pdf_hash,
  created_at
FROM signature_proofs
ORDER BY created_at DESC
LIMIT 10;

-- 4️⃣ JOINTURE: Voir si les cosigners ont des preuves
SELECT 
  cit.signer_email AS cosigner_email,
  cit.token,
  sp.id AS procedure_id,
  sp.status AS procedure_status,
  sproof.id AS proof_id,
  sproof.created_at AS signed_at
FROM cosigner_invite_tokens cit
LEFT JOIN signature_procedures sp ON cit.signature_procedure_id = sp.id
LEFT JOIN signature_proofs sproof ON sproof.signature_procedure_id = sp.id 
  AND sproof.signer_email = cit.signer_email
ORDER BY cit.created_at DESC
LIMIT 10;

-- 5️⃣ Chercher un cosigner spécifique (remplacer l'email)
-- Exemple: eva.jones@yopmail.com
SELECT 
  'Token' AS type,
  cit.token,
  cit.signer_email,
  cit.signature_procedure_id,
  cit.created_at
FROM cosigner_invite_tokens cit
WHERE cit.signer_email = 'eva.jones@yopmail.com'
UNION ALL
SELECT 
  'Proof' AS type,
  sproof.id::text AS token,
  sproof.signer_email,
  sproof.signature_procedure_id,
  sproof.created_at
FROM signature_proofs sproof
WHERE sproof.signer_email = 'eva.jones@yopmail.com'
ORDER BY created_at DESC;
