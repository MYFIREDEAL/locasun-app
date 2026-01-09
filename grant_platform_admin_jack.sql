-- 🔑 Donner le rôle platform_admin à Jack Luc
-- Email: jack.luc2021@gmail.com
-- Auth UUID: 66adc899-0d3e-46f6-87ec-4c73b4fe4e26

-- ⚠️ ÉTAPE 0 : Modifier la contrainte de rôle pour ajouter 'platform_admin'
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users
ADD CONSTRAINT users_role_check 
CHECK (role IN ('Global Admin', 'Manager', 'Commercial', 'platform_admin'));

-- 0.1 : Rendre organization_id nullable pour les platform_admins
ALTER TABLE public.users 
ALTER COLUMN organization_id DROP NOT NULL;

-- 1️⃣ Vérifier si l'utilisateur existe déjà dans public.users
SELECT * FROM public.users WHERE user_id = '66adc899-0d3e-46f6-87ec-4c73b4fe4e26';

-- 2️⃣ Créer ou mettre à jour l'utilisateur avec le rôle platform_admin
INSERT INTO public.users (user_id, email, name, role, organization_id)
VALUES (
  '66adc899-0d3e-46f6-87ec-4c73b4fe4e26',
  'jack.luc2021@gmail.com',
  'Jack Luc',
  'platform_admin',
  NULL  -- platform_admin n'a pas d'organization_id (accès à toutes les orgs)
)
ON CONFLICT (user_id) 
DO UPDATE SET 
  role = 'platform_admin',
  email = 'jack.luc2021@gmail.com',
  name = 'Jack Luc';

-- 3️⃣ Vérification finale
SELECT 
  id,
  user_id,
  email,
  name,
  role,
  organization_id,
  created_at
FROM public.users
WHERE user_id = '66adc899-0d3e-46f6-87ec-4c73b4fe4e26';

-- ✅ Si role = 'platform_admin', vous pouvez accéder à /platform
