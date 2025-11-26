-- Script pour créer un compte client à partir d'un prospect existant
-- Exemple : créer un compte pour permettre au prospect de se connecter

-- ============================================
-- ÉTAPE 1 : Vérifier que le prospect existe
-- ============================================
-- Remplacer 'email@example.com' par l'email du prospect
SELECT id, name, email, user_id 
FROM prospects 
WHERE email = 'email@example.com';  -- ← MODIFIER ICI

-- ============================================
-- ÉTAPE 2 : Créer le compte auth
-- ============================================
-- Note: Supabase génère automatiquement le hash du mot de passe avec crypt()
-- Remplacer 'email@example.com' et 'motdepasse123' par les vraies valeurs

-- Créer l'utilisateur dans auth.users
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),  -- Génère un UUID pour le user
  'authenticated',
  'authenticated',
  'email@example.com',  -- ← MODIFIER ICI (email du prospect)
  crypt('motdepasse123', gen_salt('bf')),  -- ← MODIFIER ICI (mot de passe)
  NOW(),  -- Email confirmé immédiatement
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
)
RETURNING id, email;

-- ============================================
-- ÉTAPE 3 : Lier le compte auth au prospect
-- ============================================
-- Copier l'UUID retourné par l'étape 2 et le coller ci-dessous

UPDATE prospects
SET user_id = 'UUID_DU_COMPTE_AUTH'  -- ← COLLER L'UUID ICI
WHERE email = 'email@example.com';  -- ← MODIFIER ICI

-- ============================================
-- ÉTAPE 4 : Vérifier que tout est OK
-- ============================================
SELECT 
  p.id AS prospect_id,
  p.name AS prospect_name,
  p.email AS prospect_email,
  p.user_id,
  u.email AS auth_email,
  u.email_confirmed_at
FROM prospects p
LEFT JOIN auth.users u ON p.user_id = u.id
WHERE p.email = 'email@example.com';  -- ← MODIFIER ICI

-- ============================================
-- ✅ RÉSULTAT ATTENDU
-- ============================================
-- Le prospect doit maintenant avoir un user_id non-null
-- L'utilisateur peut se connecter avec :
--   - Email : email@example.com
--   - Mot de passe : motdepasse123
-- ============================================


-- ============================================
-- ALTERNATIVE : Script automatisé (tout-en-un)
-- ============================================
-- Remplacer les valeurs et exécuter tout en une fois

DO $$
DECLARE
  prospect_email TEXT := 'email@example.com';  -- ← MODIFIER ICI
  prospect_password TEXT := 'motdepasse123';   -- ← MODIFIER ICI
  new_user_id UUID;
BEGIN
  -- 1. Créer le compte auth
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    prospect_email,
    crypt(prospect_password, gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO new_user_id;

  -- 2. Lier au prospect
  UPDATE prospects
  SET user_id = new_user_id
  WHERE email = prospect_email;

  -- 3. Afficher le résultat
  RAISE NOTICE '✅ Compte créé avec succès pour %', prospect_email;
  RAISE NOTICE '🔑 Mot de passe : %', prospect_password;
  RAISE NOTICE '🆔 User ID : %', new_user_id;
END $$;

-- Vérifier
SELECT 
  p.id AS prospect_id,
  p.name,
  p.email,
  p.user_id,
  u.email AS auth_email,
  u.email_confirmed_at
FROM prospects p
LEFT JOIN auth.users u ON p.user_id = u.id
WHERE p.email = 'email@example.com';  -- ← MODIFIER ICI
