-- Vérifier le rôle de l'utilisateur connecté
-- Remplace 'cd73c227-6d2d-4997-bc33-16833f19a34c' par ton user_id des logs

SELECT 
  user_id,
  name,
  email,
  role,
  CASE 
    WHEN role = 'Global Admin' THEN '✅ Peut modifier company_settings'
    ELSE '❌ NE PEUT PAS modifier company_settings (pas Global Admin)'
  END as can_update_settings
FROM public.users
WHERE user_id = 'cd73c227-6d2d-4997-bc33-16833f19a34c';

-- Voir tous les Global Admins
SELECT user_id, name, email, role
FROM public.users
WHERE role = 'Global Admin';
