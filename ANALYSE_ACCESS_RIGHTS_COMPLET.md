# 📊 ANALYSE COMPLÈTE DU SYSTÈME ACCESS_RIGHTS

## 🎯 RÉSUMÉ EXÉCUTIF

**Problème identifié** : Le système de gestion des droits d'accès (`access_rights`) enregistre des **Primary Keys (PK)** au lieu des **Auth UUIDs** dans la base de données, ce qui empêche le filtrage correct des prospects et utilisateurs.

**Impact utilisateur** : Un utilisateur comme Élodie ne voit qu'elle-même dans les filtres, même si un admin lui a donné accès à d'autres commerciaux.

**Cause racine** : Incohérence entre le format attendu (`user_id` = auth UUID) et le format enregistré (`id` = PK) dans `ProfilePage.jsx`.

---

## 📁 1. ARCHITECTURE ACTUELLE

### 1.1 Structure de la table `public.users`

```sql
CREATE TABLE public.users (
  id UUID PRIMARY KEY,                    -- PK (UUID généré par Supabase)
  user_id UUID REFERENCES auth.users(id), -- FK vers auth.users (UUID auth)
  name TEXT,
  email TEXT,
  role TEXT,
  access_rights JSONB DEFAULT '{
    "modules": ["Pipeline", "Agenda", "Contacts"],
    "users": []
  }'::jsonb
);
```

### 1.2 Format attendu de `access_rights`

```json
{
  "modules": ["Pipeline", "Agenda", "Contacts"],
  "users": ["auth-uuid-1", "auth-uuid-2", "auth-uuid-3"]
}
```

**⚠️ CRITIQUE** : `access_rights.users` doit contenir des **`user_id`** (auth UUID), **PAS** des `id` (PK).

**Pourquoi ?**
- `prospects.owner_id` référence `users.user_id` (auth UUID)
- `appointments.assigned_user_id` référence `users.id` (PK)
- Les RLS policies comparent `access_rights.users` avec `owner_id` (auth UUID)

---

## 🔍 2. CHARGEMENT DES USERS

### 2.1 Hook `useSupabaseUsers` (lecture seule)

**Fichier** : `/src/hooks/useSupabaseUsers.js`

```javascript
const { data } = await supabase
  .from('users')
  .select('id, user_id, name, email, role, phone, avatar_url, manager_id, access_rights')
  .order('name', { ascending: true });

setUsers(data || []);
```

**Retour** : Array d'objets avec **tous les champs**, incluant `access_rights` (JSONB brut).

**Utilisé dans** :
- `FinalPipeline.jsx`
- `CompleteOriginalContacts.jsx`
- `Agenda.jsx`
- `ProfilePage.jsx`

---

### 2.2 Hook `useSupabaseUsersCRUD` (gestion complète)

**Fichier** : `/src/hooks/useSupabaseUsersCRUD.js`

Même chose que `useSupabaseUsers` mais avec :
- ✅ Real-time subscription (INSERT/UPDATE/DELETE)
- ✅ Fonctions CRUD : `addUser()`, `updateUser()`, `deleteUser()`

**Utilisé dans** : `ProfilePage.jsx` uniquement.

---

## 🐛 3. BUGS IDENTIFIÉS DANS ProfilePage.jsx

### Bug #1 : Mapping incorrect dans `openAccessRightsDialog()`

**Ligne 1095** : Création de l'objet `users` indexé par PK

```javascript
const users = useMemo(() => {
  return supabaseUsers.reduce((acc, user) => {
    acc[user.id] = {  // 🔴 INDEXÉ PAR PK (user.id)
      id: user.id,
      name: user.name,
      accessRights: user.access_rights,
    };
    return acc;
  }, {});
}, [supabaseUsers]);
```

**Ligne 1477** : Création des options avec des PK

```javascript
const allUserOptions = Object.values(users)
  .filter(u => u.id !== user.id)
  .map(u => ({
    value: u.id,  // 🔴 UTILISE PK au lieu de user_id
    label: u.name
  }));
```

**Ligne 1493** : Lecture de `access_rights.users` (contient des UUIDs)

```javascript
const selectedUsers = (userAccessRights.users || []).map(userId => {
  const foundUser = users[userId]; // 🔴 Cherche par UUID dans un objet indexé par PK
  return foundUser ? {
    value: foundUser.id,  // 🔴 Retourne PK
    label: foundUser.name
  } : null;
}).filter(Boolean);
```

**Problème** :
1. Si `access_rights.users` contient des **auth UUID** (correct) → `users[auth-uuid]` retourne `undefined`
2. Si `access_rights.users` contient des **PK** (incorrect mais cohérent avec le bug) → Ça marche

**Résultat** : Liste vide ou partielle dans l'interface.

---

### Bug #2 : Sauvegarde de PK au lieu de user_id

**Ligne 1517** : Sauvegarde des droits d'accès

```javascript
const handleSaveAccessRights = async () => {
  await updateUser(editingUser.id, {
    accessRights: {
      modules: accessRights.modules,
      users: accessRights.users.map(u => u.value) // 🔴 Envoie des PK (user.id)
    }
  });
};
```

**Résultat dans Supabase** :
```json
{
  "modules": ["Pipeline", "Agenda", "Contacts"],
  "users": ["pk-uuid-1", "pk-uuid-2"] // 🔴 MAUVAIS : ce sont des PK
}
```

**Impact** : Le filtrage échoue car `prospect.ownerId` (auth UUID) ne matche jamais avec les PK.

---

## ✅ 4. IMPLÉMENTATIONS CORRECTES

### 4.1 FinalPipeline.jsx (✅ Correct)

**Ligne 229** : Filtrage des utilisateurs autorisés

```javascript
const allowedUsers = useMemo(() => {
  if (!activeAdminUser) return [];
  if (activeAdminUser.role === 'Global Admin' || activeAdminUser.role === 'Admin') {
    return Object.values(usersFromSupabase);
  }
  
  // ✅ CORRECT : Compare user_id (auth UUID)
  const allowedUserIds = [
    activeAdminUser.user_id,
    ...(activeAdminUser.accessRights?.users || [])
  ];
  
  return Object.values(usersFromSupabase).filter(u => 
    allowedUserIds.includes(u.user_id) // ✅ Compare avec user_id
  );
}, [activeAdminUser, usersFromSupabase]);
```

**Ligne 298** : Filtrage des prospects

```javascript
const filteredProspects = useMemo(() => {
  const visibleProspects = prospects.filter(prospect => {
    if (activeAdminUser.role === 'Global Admin') return true;
    
    const allowedUserIds = [
      activeAdminUser.user_id,
      ...(activeAdminUser.accessRights?.users || [])
    ];
    
    return allowedUserIds.includes(prospect.ownerId); // ✅ ownerId = user_id
  });
  
  return visibleProspects;
}, [prospects, activeAdminUser]);
```

---

### 4.2 CompleteOriginalContacts.jsx (✅ Correct)

**Ligne 300** : Même implémentation que FinalPipeline

```javascript
const allowedUsers = useMemo(() => {
  if (activeAdminUser.role === 'Global Admin') {
    return supabaseUsers;
  }
  
  const allowedUserIds = [
    activeAdminUser.user_id,
    ...(activeAdminUser.accessRights?.users || [])
  ];
  
  return supabaseUsers.filter(u => 
    allowedUserIds.includes(u.user_id) // ✅ Compare avec user_id
  );
}, [activeAdminUser, supabaseUsers]);
```

---

### 4.3 Agenda.jsx (❌ Non implémenté)

**Ligne 1473** :

```javascript
const allowedUsers = useMemo(() => {
  if (!activeAdminUser || supabaseUsers.length === 0) return [];
  // 🔴 PROBLÈME : Affiche TOUS les utilisateurs
  return supabaseUsers;
}, [activeAdminUser, supabaseUsers]);
```

**Impact** : Même un Commercial restreint voit tous les utilisateurs dans le filtre de l'agenda.

---

## 🗄️ 5. FONCTION RPC get_prospects_safe()

**Fichier** : `fix_select_prospects_rpc.sql`

```sql
CREATE OR REPLACE FUNCTION public.get_prospects_safe()
RETURNS SETOF public.prospects
AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
BEGIN
  v_user_id := auth.uid();
  SELECT role INTO v_user_role FROM public.users WHERE user_id = v_user_id;
  
  IF v_user_role = 'Global Admin' THEN
    RETURN QUERY SELECT * FROM public.prospects;
  ELSIF v_user_role = 'Manager' THEN
    RETURN QUERY 
      SELECT p.* FROM public.prospects p
      LEFT JOIN public.users u ON u.id = p.owner_id
      WHERE p.owner_id = v_user_id OR u.manager_id = v_user_id;
  ELSE
    -- 🔴 PROBLÈME : Ne gère PAS access_rights.users
    RETURN QUERY 
      SELECT * FROM prospects WHERE owner_id = v_user_id;
  END IF;
END;
$$;
```

**Problème** : Pour les Commercial, la fonction retourne **uniquement** `WHERE owner_id = v_user_id`.

**Impact** : 
- Même si `access_rights.users` contient d'autres UUIDs, ils ne sont **jamais pris en compte**
- Le Commercial ne voit que ses propres prospects au chargement initial

---

## 📊 6. TABLEAU RÉCAPITULATIF

| Composant | Lit access_rights ? | Filtre correct ? | Statut |
|-----------|-------------------|------------------|--------|
| **ProfilePage** (affichage) | ✅ Oui | ❌ Non | Mapping PK vs user_id cassé |
| **ProfilePage** (sauvegarde) | ✅ Oui | ❌ Non | Enregistre des PK |
| **FinalPipeline** | ✅ Oui | ✅ Oui | ✅ Implémentation correcte |
| **CompleteOriginalContacts** | ✅ Oui | ✅ Oui | ✅ Implémentation correcte |
| **Agenda** | ❌ Non | ❌ Non | Pas d'implémentation |
| **RPC get_prospects_safe()** | ❌ Non | ❌ Non | Ignore access_rights.users |
| **RLS Policies** | ✅ Oui | ⚠️ Partiel | Dépend du contenu (PK vs user_id) |

---

## 🎯 7. SCÉNARIO CONCRET : POURQUOI ÉLODIE NE VOIT QU'ELLE-MÊME

### Étape 1 : Configuration par l'admin

1. Admin ouvre **ProfilePage > Gestion des utilisateurs**
2. Clique sur "Modifier droits" pour Élodie
3. Sélectionne "Commercial B" dans la liste
4. Clique sur "Enregistrer"

**Ce qui se passe** (ligne 1517) :
```javascript
await updateUser(editingUser.id, {
  accessRights: {
    modules: ["Pipeline", "Agenda", "Contacts"],
    users: ["pk-uuid-commercial-B"] // 🔴 PK enregistrée
  }
});
```

**Dans Supabase** :
```json
{
  "modules": ["Pipeline", "Agenda", "Contacts"],
  "users": ["pk-uuid-commercial-B"] // 🔴 PK au lieu de user_id
}
```

---

### Étape 2 : Élodie se connecte

1. Élodie se connecte avec son compte
2. `activeAdminUser.user_id` = `"auth-uuid-elodie"`
3. `activeAdminUser.accessRights.users` = `["pk-uuid-commercial-B"]`

---

### Étape 3 : Filtrage dans FinalPipeline

**Code exécuté** (ligne 229) :
```javascript
const allowedUserIds = [
  "auth-uuid-elodie",           // user_id d'Élodie
  "pk-uuid-commercial-B"        // PK du Commercial B (MAUVAIS)
];

return supabaseUsers.filter(u => 
  allowedUserIds.includes(u.user_id) // Compare avec user_id (auth UUID)
);
```

**Résultat** :
- `u.user_id = "auth-uuid-elodie"` → ✅ Match → Élodie ajoutée
- `u.user_id = "auth-uuid-commercial-B"` → ❌ Ne matche PAS avec `"pk-uuid-commercial-B"`

**Conclusion** : `allowedUsers = [Élodie]` → **Seule Élodie apparaît dans la liste**.

---

### Étape 4 : Filtrage des prospects

**Code exécuté** (ligne 298) :
```javascript
const allowedUserIds = [
  "auth-uuid-elodie",
  "pk-uuid-commercial-B"
];

return prospects.filter(prospect => 
  allowedUserIds.includes(prospect.ownerId) // ownerId = user_id (auth UUID)
);
```

**Résultat** :
- Prospects d'Élodie (`ownerId = "auth-uuid-elodie"`) → ✅ Visibles
- Prospects du Commercial B (`ownerId = "auth-uuid-commercial-B"`) → ❌ **Cachés**

---

## 🔄 8. CYCLE VICIEUX

```
1. Admin configure access_rights
   ↓
2. ProfilePage enregistre des PK dans Supabase
   ↓
3. Front lit access_rights.users (contient des PK)
   ↓
4. Filtrage compare PK avec user_id (auth UUID)
   ↓
5. Aucun match → Utilisateur ne voit que lui-même
   ↓
6. Admin pense que c'est un bug et reconfigure
   ↓
7. ProfilePage enregistre à nouveau des PK
   ↓
8. Le problème persiste à l'infini
```

---

## 🛠️ 9. CORRECTIONS NÉCESSAIRES

### 9.1 ProfilePage.jsx

#### Correction #1 : Indexer `users` par `user_id`

**Ligne 1095** (actuel) :
```javascript
const users = useMemo(() => {
  return supabaseUsers.reduce((acc, user) => {
    acc[user.id] = { ... }; // 🔴 Indexé par PK
    return acc;
  }, {});
}, [supabaseUsers]);
```

**Correction proposée** :
```javascript
const users = useMemo(() => {
  return supabaseUsers.reduce((acc, user) => {
    acc[user.user_id] = { // ✅ Indexé par user_id (auth UUID)
      id: user.id,
      user_id: user.user_id,
      name: user.name,
      accessRights: user.access_rights,
    };
    return acc;
  }, {});
}, [supabaseUsers]);
```

---

#### Correction #2 : Utiliser `user_id` dans `allUserOptions`

**Ligne 1477** (actuel) :
```javascript
const allUserOptions = Object.values(users).map(u => ({
  value: u.id, // 🔴 PK
  label: u.name
}));
```

**Correction proposée** :
```javascript
const allUserOptions = Object.values(users).map(u => ({
  value: u.user_id, // ✅ Auth UUID
  label: u.name
}));
```

---

#### Correction #3 : `selectedUsers` trouvera automatiquement les users

Pas de modification nécessaire si les corrections #1 et #2 sont appliquées :

```javascript
const selectedUsers = (userAccessRights.users || []).map(userId => {
  const foundUser = users[userId]; // ✅ userId est un auth UUID, users est indexé par user_id
  return foundUser ? {
    value: foundUser.user_id, // ✅ Retourne user_id
    label: foundUser.name
  } : null;
}).filter(Boolean);
```

---

### 9.2 Fonction RPC get_prospects_safe()

**Ajout nécessaire** : Élargir la visibilité selon `access_rights.users`

```sql
CREATE OR REPLACE FUNCTION public.get_prospects_safe()
RETURNS SETOF public.prospects
AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
BEGIN
  v_user_id := auth.uid();
  SELECT role INTO v_user_role FROM public.users WHERE user_id = v_user_id;
  
  IF v_user_role = 'Global Admin' THEN
    RETURN QUERY SELECT * FROM public.prospects ORDER BY created_at DESC;
  ELSIF v_user_role = 'Manager' THEN
    RETURN QUERY 
      SELECT p.* FROM public.prospects p
      LEFT JOIN public.users u ON u.user_id = p.owner_id
      WHERE p.owner_id = v_user_id OR u.manager_id = (
        SELECT id FROM public.users WHERE user_id = v_user_id
      )
      ORDER BY p.created_at DESC;
  ELSE
    -- ✅ AJOUT : Élargir selon access_rights.users
    RETURN QUERY 
      SELECT DISTINCT p.* FROM public.prospects p
      WHERE p.owner_id = v_user_id
         OR p.owner_id IN (
           SELECT jsonb_array_elements_text(access_rights->'users')::UUID
           FROM public.users
           WHERE user_id = v_user_id
         )
      ORDER BY p.created_at DESC;
  END IF;
END;
$$;
```

---

### 9.3 Agenda.jsx

**Ligne 1473** (actuel) :
```javascript
const allowedUsers = useMemo(() => {
  if (!activeAdminUser || supabaseUsers.length === 0) return [];
  return supabaseUsers; // 🔴 Tous les users
}, [activeAdminUser, supabaseUsers]);
```

**Correction proposée** (copier de FinalPipeline) :
```javascript
const allowedUsers = useMemo(() => {
  if (!activeAdminUser || supabaseUsers.length === 0) return [];
  
  if (activeAdminUser.role === 'Global Admin' || activeAdminUser.role === 'Admin') {
    return supabaseUsers;
  }
  
  const allowedUserIds = [
    activeAdminUser.user_id,
    ...(activeAdminUser.accessRights?.users || [])
  ];
  
  return supabaseUsers.filter(u => 
    allowedUserIds.includes(u.user_id)
  );
}, [activeAdminUser, supabaseUsers]);
```

---

## 🧪 10. TESTS DE VALIDATION

### Test #1 : Vérifier le contenu de `access_rights`

**SQL à exécuter dans Supabase** :
```sql
SELECT 
  name,
  email,
  role,
  access_rights
FROM public.users
WHERE email = 'elodie@example.com';
```

**Vérifier** :
- `access_rights.users` contient-il des **auth UUID** ou des **PK** ?
- Pour distinguer, comparer avec la colonne `user_id` vs `id`

---

### Test #2 : Tester après correction

1. Admin reconfigure les droits d'Élodie (après corrections)
2. Vérifier dans Supabase :
   ```sql
   SELECT access_rights->'users' FROM public.users WHERE email = 'elodie@example.com';
   ```
   Devrait contenir : `["auth-uuid-commercial-B"]` (pas de PK)

3. Élodie se déconnecte et se reconnecte
4. Ouvrir le filtre utilisateurs dans Pipeline
5. Vérifier qu'elle voit : **Élodie + Commercial B**

---

## 📝 11. CHECKLIST COMPLÈTE

### Fichiers à modifier

- [ ] `/src/pages/admin/ProfilePage.jsx` (3 corrections)
  - [ ] Ligne 1095 : Indexer `users` par `user_id`
  - [ ] Ligne 1477 : Utiliser `user_id` dans `allUserOptions`
  - [ ] Vérifier ligne 1517 : `handleSaveAccessRights()` (devrait fonctionner automatiquement)

- [ ] `/src/pages/admin/Agenda.jsx`
  - [ ] Ligne 1473 : Implémenter filtrage `allowedUsers`

- [ ] `fix_select_prospects_rpc.sql` (ou créer un nouveau fichier SQL)
  - [ ] Ajouter élargissement selon `access_rights.users` pour les Commercial

### Actions post-correction

- [ ] Tester en local (`npm run dev`)
- [ ] Reconfigurer les droits d'accès de tous les utilisateurs existants
- [ ] Vérifier dans Supabase que `access_rights.users` contient des auth UUID
- [ ] Déployer en production (`npm run deploy`)
- [ ] Demander aux utilisateurs de se reconnecter

---

## 🎯 12. CONCLUSION

**Le système actuel est fonctionnel à 70%** :
- ✅ FinalPipeline et CompleteOriginalContacts : **Implémentation correcte**
- ❌ ProfilePage : **Logique cassée** (enregistre des PK au lieu de user_id)
- ❌ Agenda : **Filtrage absent**
- ❌ RPC : **N'utilise pas access_rights.users**

**Impact utilisateur** : Visible uniquement pour les utilisateurs avec `access_rights.users` configuré. Les autres (rôles Admin/Manager) ne sont pas affectés.

**Priorité des corrections** :
1. **HAUTE** : ProfilePage (enregistrement incorrect)
2. **MOYENNE** : RPC get_prospects_safe() (élargissement manquant)
3. **BASSE** : Agenda (affichage tous les users, mais impact faible)

**Temps estimé** : 1-2 heures de développement + tests.

---

**FIN DE L'ANALYSE**
