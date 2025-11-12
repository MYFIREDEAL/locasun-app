-- =====================================================
-- INSERTION DE L'UTILISATEUR ADMIN JACK LUC
-- =====================================================
-- Email: jack.luc@icloud.com
-- Ce script crée l'utilisateur PRO dans public.users
-- en le liant au compte auth.users existant
-- =====================================================

-- Étape 1: Récupérer l'UUID de l'utilisateur dans auth.users
-- (Cette requête est juste pour vérification, copie l'UUID obtenu)
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'jack.luc@icloud.com';

-- Étape 2: Insérer l'utilisateur dans public.users
-- ⚠️ REMPLACE 'UUID-ICI' par l'UUID obtenu à l'étape 1
INSERT INTO public.users (user_id, name, email, role, phone, access_rights)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'jack.luc@icloud.com'), -- Récupère automatiquement l'UUID
  'Jack Luc',
  'jack.luc@icloud.com',
  'Global Admin',
  NULL, -- Phone (optionnel, tu peux ajouter ton numéro si tu veux)
  '{"modules": ["Pipeline", "Agenda", "Contacts"], "users": []}'::jsonb
);

-- Étape 3: Vérifier que l'insertion a fonctionné
SELECT 
  u.id,
  u.user_id,
  u.name,
  u.email,
  u.role,
  u.affiliate_slug,
  u.affiliate_link,
  u.created_at
FROM public.users u
WHERE u.email = 'jack.luc@icloud.com';

-- =====================================================
-- RÉSULTAT ATTENDU :
-- =====================================================
-- Si tout fonctionne, tu devrais voir :
-- - id : UUID généré automatiquement
-- - user_id : UUID de auth.users
-- - name : Jack Luc
-- - email : jack.luc@icloud.com
-- - role : Global Admin
-- - affiliate_slug : jack-luc (généré automatiquement)
-- - affiliate_link : https://evatime.fr/inscription/jack-luc
-- =====================================================
