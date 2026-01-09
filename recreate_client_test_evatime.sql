-- ✅ RECRÉER LES COMPTES TEST POUR EVATIME CHECK
-- À exécuter dans le SQL Editor de Supabase

-- 🔧 ÉTAPE 1 : Créer les utilisateurs auth (si n'existent pas)
DO $$
DECLARE
  v_client_user_id uuid;
  v_admin_user_id uuid;
  v_organization_id uuid;
BEGIN
  -- Récupérer l'organization_id pour localhost
  SELECT id INTO v_organization_id
  FROM organizations
  WHERE domain = 'localhost'
  LIMIT 1;

  IF v_organization_id IS NULL THEN
    RAISE EXCEPTION 'Organization localhost non trouvée. Crée-la d''abord avec: INSERT INTO organizations (domain, name) VALUES (''localhost'', ''EVATIME Test'');';
  END IF;

  RAISE NOTICE '✅ Organization trouvée: %', v_organization_id;

  -- ========================================
  -- 1️⃣ CRÉER LE CLIENT TEST
  -- ========================================
  
  -- Vérifier si le client test existe déjà dans auth.users
  SELECT id INTO v_client_user_id
  FROM auth.users
  WHERE email = 'client_test@evatime.fr';

  IF v_client_user_id IS NULL THEN
    -- Créer l'utilisateur dans auth.users
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
      is_super_admin
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'client_test@evatime.fr',
      crypt('evatime123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      false
    )
    RETURNING id INTO v_client_user_id;

    RAISE NOTICE '✅ Client user créé avec ID: %', v_client_user_id;
  ELSE
    RAISE NOTICE '✅ Client user existe déjà avec ID: %', v_client_user_id;
  END IF;

  -- Créer/Mettre à jour le prospect dans public.prospects
  INSERT INTO public.prospects (
    id,
    user_id,
    name,
    email,
    phone,
    company_name,
    address,
    owner_id,
    status,
    tags,
    has_appointment,
    form_data,
    organization_id,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    v_client_user_id,
    'Client Test EVATIME',
    'client_test@evatime.fr',
    '+33612345678',
    'EVATIME Test Corp',
    '123 Test Street',
    NULL,
    'lead',
    ARRAY['ACC', 'Centrale'],
    false,
    '{}'::jsonb,
    v_organization_id,
    now(),
    now()
  )
  ON CONFLICT (email, organization_id) DO UPDATE
  SET
    user_id = EXCLUDED.user_id,
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    updated_at = now();

  RAISE NOTICE '✅ Client prospect créé/mis à jour';

  -- ========================================
  -- 2️⃣ CRÉER L''ADMIN TEST
  -- ========================================
  
  -- Vérifier si l'admin test existe déjà dans auth.users
  SELECT id INTO v_admin_user_id
  FROM auth.users
  WHERE email = 'admin_test@evatime.fr';

  IF v_admin_user_id IS NULL THEN
    -- Créer l'utilisateur admin dans auth.users
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
      is_super_admin
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'admin_test@evatime.fr',
      crypt('evatime123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      false
    )
    RETURNING id INTO v_admin_user_id;

    RAISE NOTICE '✅ Admin user créé avec ID: %', v_admin_user_id;
  ELSE
    RAISE NOTICE '✅ Admin user existe déjà avec ID: %', v_admin_user_id;
  END IF;

  -- Créer/Mettre à jour l'admin dans public.users
  INSERT INTO public.users (
    id,
    user_id,
    name,
    email,
    role,
    organization_id,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    v_admin_user_id,
    'Admin Test EVATIME',
    'admin_test@evatime.fr',
    'Admin',
    v_organization_id,
    now(),
    now()
  )
  ON CONFLICT (email, organization_id) DO UPDATE
  SET
    user_id = EXCLUDED.user_id,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    updated_at = now();

  RAISE NOTICE '✅ Admin créé/mis à jour';

  RAISE NOTICE '🎉 EVATIME TEST ACCOUNTS PRÊTS !';

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Erreur: %', SQLERRM;
END $$;

-- 🔍 VÉRIFICATION : Afficher les comptes créés
SELECT 
  'CLIENT' as type,
  p.id,
  p.name,
  p.email,
  p.user_id,
  p.organization_id,
  u.email as auth_email
FROM prospects p
LEFT JOIN auth.users u ON u.id = p.user_id
WHERE p.email = 'client_test@evatime.fr'

UNION ALL

SELECT 
  'ADMIN' as type,
  usr.id,
  usr.name,
  usr.email,
  usr.user_id,
  usr.organization_id,
  u.email as auth_email
FROM users usr
LEFT JOIN auth.users u ON u.id = usr.user_id
WHERE usr.email = 'admin_test@evatime.fr';

