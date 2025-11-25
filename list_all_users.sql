-- 🔍 LISTER TOUS LES USERS DANS LA TABLE users

SELECT 
  name as "Nom",
  email as "Email",
  role as "Rôle",
  id as "users.id (PK)",
  user_id as "users.user_id (AUTH UUID)",
  created_at as "Créé le"
FROM users
ORDER BY created_at DESC;

-- Vérifier dans auth.users si Charly existe
SELECT 
  id as "Auth UUID",
  email as "Email",
  created_at as "Créé le",
  email_confirmed_at as "Email confirmé",
  last_sign_in_at as "Dernière connexion"
FROM auth.users
WHERE email LIKE '%charly%'
ORDER BY created_at DESC;
