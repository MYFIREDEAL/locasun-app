-- Diagnostiquer le problème d'UPDATE sur company_settings

-- 1. Vérifier si la ligne existe
SELECT 
  id, 
  company_name, 
  logo_url, 
  created_at,
  updated_at,
  CASE 
    WHEN id = '9769af46-b3ac-4909-8810-a8cf3fd6e307' THEN '✅ Ligne singleton trouvée'
    ELSE '⚠️ Mauvais ID'
  END as status
FROM public.company_settings;

-- 2. Compter les lignes (devrait être 1)
SELECT COUNT(*) as total_rows FROM public.company_settings;

-- 3. Tester un UPDATE manuel (remplace NULL par une valeur de test)
UPDATE public.company_settings
SET logo_url = 'test-logo-url-123',
    updated_at = NOW()
WHERE id = '9769af46-b3ac-4909-8810-a8cf3fd6e307'
RETURNING *;

-- 4. Vérifier les permissions de l'utilisateur actuel
SELECT 
  auth.uid() as current_user_id,
  u.name,
  u.email,
  u.role,
  CASE 
    WHEN u.user_id IS NOT NULL THEN '✅ Utilisateur trouvé dans users'
    ELSE '❌ Utilisateur NON trouvé dans users'
  END as user_status
FROM public.users u
WHERE u.user_id = auth.uid();

-- 5. Tester si on peut faire un SELECT (devrait fonctionner)
SELECT * FROM public.company_settings WHERE id = '9769af46-b3ac-4909-8810-a8cf3fd6e307';
