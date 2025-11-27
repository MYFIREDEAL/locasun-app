-- =====================================================
-- TESTER la RPC update_user_access_rights
-- =====================================================

-- 1. Vérifier que la fonction existe
SELECT 
  proname as function_name,
  prosecdef as is_security_definer
FROM pg_proc
WHERE proname = 'update_user_access_rights';

-- 2. Tester l'appel direct (remplace les UUIDs par les vrais)
SELECT * FROM update_user_access_rights(
  '72501e6b-5438-48be-8c27-0e753db44b16'::uuid,  -- Élodie
  '{"modules": ["Pipeline", "Agenda"], "users": []}'::jsonb
);

-- 3. Vérifier que tu es bien Global Admin
SELECT 
  user_id,
  name,
  role
FROM public.users
WHERE user_id = auth.uid();
