-- ============================================
-- DIAGNOSTIC: Données signataire vides
-- ============================================

-- 1. Vérifier les données dans signature_procedures
SELECT 
  id,
  prospect_id,
  signer_name,
  signer_email,
  status,
  created_at
FROM public.signature_procedures
ORDER BY created_at DESC
LIMIT 5;

-- 2. Vérifier les données dans prospects (source)
SELECT 
  id,
  name,
  email,
  company_name
FROM public.prospects
WHERE id IN (
  SELECT prospect_id 
  FROM public.signature_procedures
  ORDER BY created_at DESC
  LIMIT 5
);

-- 3. Joindre pour voir le problème
SELECT 
  sp.id as procedure_id,
  sp.signer_name as procedure_signer_name,
  sp.signer_email as procedure_signer_email,
  p.name as prospect_name,
  p.email as prospect_email,
  p.company_name as prospect_company
FROM public.signature_procedures sp
LEFT JOIN public.prospects p ON sp.prospect_id = p.id
ORDER BY sp.created_at DESC
LIMIT 5;
