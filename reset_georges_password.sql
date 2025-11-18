-- =====================================================
-- RESET PASSWORD: Changer le mot de passe de Georges
-- =====================================================
-- Nouveau mot de passe: johanne
-- =====================================================

-- Étape 1: Trouver l'UUID de Georges dans auth.users
SELECT 
    id as auth_user_id,
    email,
    created_at
FROM auth.users
WHERE email ILIKE '%george%'
OR email ILIKE '%georges%';

-- Étape 2: Réinitialiser le mot de passe (copie l'UUID ci-dessus)
-- ⚠️ REMPLACE 'UUID_DE_GEORGES' par l'UUID trouvé ci-dessus
-- ⚠️ Ce code ne peut pas être exécuté directement en SQL, utilise le Dashboard Supabase

/*
Instructions pour réinitialiser le mot de passe via Dashboard:
1. Va dans Supabase Dashboard
2. Authentication → Users
3. Cherche georges@yopmail.com
4. Clique sur les 3 points → "Reset Password"
5. Ou utilise le bouton "Send Password Reset Email"
*/

-- =====================================================
-- ALTERNATIVE: Utiliser l'API Supabase Admin
-- =====================================================
-- Tu peux aussi utiliser ce script JavaScript (à exécuter dans la console du navigateur):
/*
const { createClient } = require('@supabase/supabase-js');

// Utilise la SERVICE_ROLE_KEY (pas l'anon key!)
const supabase = createClient(
  'https://your-project.supabase.co',
  'your-service-role-key-here'
);

// Mettre à jour le mot de passe
const { data, error } = await supabase.auth.admin.updateUserById(
  'UUID_DE_GEORGES',
  { password: 'johanne' }
);

console.log('Résultat:', data, error);
*/

-- =====================================================
-- SOLUTION RAPIDE: Via Supabase Dashboard
-- =====================================================
-- 1. Va sur https://supabase.com/dashboard
-- 2. Sélectionne ton projet
-- 3. Authentication → Users
-- 4. Cherche "georges@yopmail.com" ou "george"
-- 5. Clique sur l'utilisateur
-- 6. Scroll vers "Reset Password"
-- 7. Entre le nouveau mot de passe: johanne
-- 8. Clique "Update user"
