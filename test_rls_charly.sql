-- 🔍 TESTER LA RLS POLICY POUR CHARLY

-- 1. Vérifier que Charly existe dans users
SELECT user_id, name, role 
FROM public.users 
WHERE user_id = 'e85ff206-87a2-4d63-9f1d-4d97f1842159';

-- 2. Tester l'INSERT avec RLS (simuler auth.uid())
-- ⚠️ À exécuter dans SQL Editor avec SET LOCAL role
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "e85ff206-87a2-4d63-9f1d-4d97f1842159"}';

-- 3. Tenter l'insertion (simulée)
INSERT INTO public.prospects (
  name, 
  email, 
  phone, 
  company_name, 
  address, 
  owner_id, 
  status, 
  tags, 
  has_appointment
) VALUES (
  'Test RLS Charly',
  'test.rls@example.com',
  '0600000000',
  'Test Company',
  '',
  'e85ff206-87a2-4d63-9f1d-4d97f1842159',
  'Intéressé',
  ARRAY[]::text[],
  false
);

-- 4. Vérifier la policy en détail
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'prospects' AND cmd = 'INSERT';
