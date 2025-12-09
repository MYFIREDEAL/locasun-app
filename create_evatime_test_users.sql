-- ============================================
-- CRÉATION DES COMPTES TEST EVATIME
-- ============================================
-- À exécuter dans Supabase SQL Editor
-- ============================================

-- 1️⃣ CRÉER LE CLIENT TEST dans auth.users
DO $$
DECLARE
  client_auth_id uuid;
  admin_auth_id uuid;
BEGIN
  -- Vérifier si l'utilisateur client existe déjà
  SELECT id INTO client_auth_id FROM auth.users WHERE email = 'client_test@evatime.fr';

  -- Si l'utilisateur n'existe pas, le créer
  IF client_auth_id IS NULL THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'client_test@evatime.fr',
      crypt('evatime123', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      FALSE,
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO client_auth_id;
  END IF;

  -- Créer la ligne dans public.prospects
  -- D'abord vérifier si le prospect existe déjà
  IF NOT EXISTS (SELECT 1 FROM public.prospects WHERE email = 'client_test@evatime.fr') THEN
    INSERT INTO public.prospects (
      user_id,
      email,
      name,
      owner_id,
      status,
      tags,
      created_at
    )
    VALUES (
      client_auth_id,
      'client_test@evatime.fr',
      'Client Test',
      '82be903d-9600-4c53-9cd4-113bfaaac12e',
      'new',
      ARRAY[]::text[],
      NOW()
    );
  ELSE
    -- Mettre à jour le prospect existant
    UPDATE public.prospects 
    SET user_id = client_auth_id,
        owner_id = '82be903d-9600-4c53-9cd4-113bfaaac12e'
    WHERE email = 'client_test@evatime.fr';
  END IF;

  RAISE NOTICE '✅ Client test créé avec user_id: %', client_auth_id;

  -- 2️⃣ CRÉER L'ADMIN TEST dans auth.users
  -- Vérifier si l'utilisateur admin existe déjà
  SELECT id INTO admin_auth_id FROM auth.users WHERE email = 'admin_test@evatime.fr';

  -- Si l'utilisateur n'existe pas, le créer
  IF admin_auth_id IS NULL THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'admin_test@evatime.fr',
      crypt('evatime123', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      FALSE,
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO admin_auth_id;
  END IF;

  -- Créer la ligne dans public.users
  -- D'abord vérifier si l'utilisateur existe déjà
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE user_id = admin_auth_id) THEN
    INSERT INTO public.users (
      user_id,
      email,
      name,
      role,
      created_at
    )
    VALUES (
      admin_auth_id,
      'admin_test@evatime.fr',
      'Admin Test',
      'Global Admin',
      NOW()
    );
  ELSE
    -- Mettre à jour l'utilisateur existant
    UPDATE public.users 
    SET role = 'Global Admin'
    WHERE user_id = admin_auth_id;
  END IF;

  RAISE NOTICE '✅ Admin test créé avec user_id: %', admin_auth_id;

END $$;

-- Vérification
SELECT 
  'CLIENT' as type,
  u.id as auth_id,
  u.email,
  p.name,
  p.owner_id::text as info
FROM auth.users u
LEFT JOIN public.prospects p ON p.user_id = u.id
WHERE u.email = 'client_test@evatime.fr'

UNION ALL

SELECT 
  'ADMIN' as type,
  u.id as auth_id,
  u.email,
  us.name,
  us.role::text as info
FROM auth.users u
LEFT JOIN public.users us ON us.user_id = u.id
WHERE u.email = 'admin_test@evatime.fr';
