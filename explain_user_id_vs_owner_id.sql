-- 🔍 COMPRENDRE user_id vs owner_id dans la table prospects

-- 1️⃣ Voir la structure complète
SELECT 
  name as "Nom Prospect",
  email,
  owner_id as "Commercial (owner_id)",
  user_id as "Compte Client (user_id)",
  CASE 
    WHEN owner_id IS NOT NULL AND user_id IS NULL THEN '✅ Prospect normal (pas encore client)'
    WHEN owner_id IS NOT NULL AND user_id IS NOT NULL THEN '👤 Prospect devenu CLIENT (a un compte)'
    WHEN owner_id IS NULL THEN '⚠️ ORPHELIN (pas de commercial)'
  END as "Statut",
  created_at as "Créé le"
FROM prospects
ORDER BY created_at DESC
LIMIT 20;

-- 2️⃣ Statistiques
SELECT 
  COUNT(*) as "Total prospects",
  COUNT(owner_id) as "Avec owner_id (commercial)",
  COUNT(user_id) as "Avec user_id (compte client)",
  COUNT(*) - COUNT(user_id) as "user_id NULL (normal)"
FROM prospects;

-- 3️⃣ Vérifier si user_id référence bien auth.users quand il existe
SELECT 
  p.name as "Prospect",
  p.user_id as "user_id dans prospects",
  CASE 
    WHEN EXISTS (SELECT 1 FROM auth.users WHERE id = p.user_id) 
    THEN '✅ Existe dans auth.users'
    ELSE '❌ N''existe PAS dans auth.users'
  END as "Validation"
FROM prospects p
WHERE p.user_id IS NOT NULL;

-- 4️⃣ RECOMMANDATION : Comprendre la vraie utilité
/*
┌─────────────────────────────────────────────────────────────┐
│  📋 COLONNES PROSPECTS : RÔLES DIFFÉRENTS                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  owner_id (UUID) :                                          │
│    → Commercial/Admin qui gère ce prospect                  │
│    → Référence users.user_id (table users)                  │
│    → OBLIGATOIRE (défaut : créateur du prospect)            │
│    → Utilisé pour filtrer Pipeline/Contacts                 │
│                                                              │
│  user_id (UUID) :                                           │
│    → Compte auth.users du prospect (si inscrit)             │
│    → Référence auth.users.id                                │
│    → OPTIONNEL (NULL = prospect pas encore client)          │
│    → Rempli quand on crée un compte pour le prospect        │
│    → Permet au prospect de se connecter à /dashboard        │
│                                                              │
└─────────────────────────────────────────────────────────────┘

💡 NORMAL QUE user_id SOIT NULL :
   La plupart des prospects n'ont pas encore de compte client !
   Ils restent en tant que "leads" gérés par les commerciaux.
   
   user_id n'est rempli QUE si :
   - Le commercial envoie une invitation email
   - Le prospect s'inscrit et active son compte
   - Il devient un "client" avec accès au dashboard

🔧 SI VOUS VOULEZ NETTOYER :
   - On peut SUPPRIMER la colonne user_id si elle n'est plus utilisée
   - OU la renommer en "client_account_id" pour clarifier
   - OU garder telle quelle (fonctionnel)
*/
