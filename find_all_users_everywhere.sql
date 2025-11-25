-- 🔍 CHERCHER TOUS LES UTILISATEURS CRÉÉS VIA GESTION USER

-- 1. Table users (devrait avoir les 3 personnes)
SELECT 
  'TABLE: users' as "Source",
  name as "Nom",
  email as "Email",
  role as "Rôle",
  id as "ID",
  user_id as "Auth UUID",
  created_at as "Créé le"
FROM users
ORDER BY created_at DESC;

-- 2. Table company_settings (si les users sont stockés là)
SELECT 
  'TABLE: company_settings' as "Source",
  team_members as "Membres équipe"
FROM company_settings
LIMIT 1;

-- 3. Chercher dans auth.users (tous les comptes authentification)
SELECT 
  'TABLE: auth.users' as "Source",
  email as "Email",
  id as "Auth UUID",
  created_at as "Créé le",
  last_sign_in_at as "Dernière connexion"
FROM auth.users
ORDER BY created_at DESC;

-- 4. Vérifier s'il y a d'autres tables avec "user" dans le nom
SELECT 
  table_schema,
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (table_name LIKE '%user%' OR table_name LIKE '%admin%' OR table_name LIKE '%team%')
ORDER BY table_name;
