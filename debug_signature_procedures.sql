-- 🔍 DEBUG: Vérifier les dernières signature_procedures créées
-- Exécute ce script dans Supabase Dashboard → SQL Editor

-- 1. Voir les 10 dernières procédures avec tous les champs pertinents
SELECT 
  id,
  access_token,
  access_token_expires_at,
  signer_name,
  signer_email,
  status,
  prospect_id,
  project_type,
  organization_id,
  created_at,
  signature_metadata
FROM signature_procedures
ORDER BY created_at DESC
LIMIT 10;

-- 2. Compter les procédures avec/sans access_token
SELECT 
  CASE WHEN access_token IS NULL THEN 'Sans token' ELSE 'Avec token' END as token_status,
  COUNT(*) as count
FROM signature_procedures
GROUP BY (access_token IS NULL);

-- 3. Vérifier les RLS policies actives
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'signature_procedures';
