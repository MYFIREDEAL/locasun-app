# Session 19/11/2025 - Corrections Importantes

## 1️⃣ Système d'activités unifié (Appels & Tâches)

### Problème
Modal des tâches plantait (page blanche)

### Cause
Champs incorrects dans le modal :
- `activity.done` n'existe pas
- `activity.text` n'existe pas
- `projectsData` undefined

### Solution
**Fichier** : `src/pages/admin/Agenda.jsx` (lignes 428, 442, 471)

**Corrections** :
- `projectsData` → `allProjectsData`
- `activity.details/text` → `activity.notes`
- `activity.done` → `activity.status === 'effectue'`
- Ajouté scroll au modal : `max-h-[90vh] overflow-y-auto`
- Ajouté nom du prospect dans les cartes tâches sidebar

**Commits** :
- `fix: correct task modal data structure`
- `feat: add scroll to task/call modal`
- `feat: display prospect name in task cards`

---

## 2️⃣ Bug user_id vs id (affichage propriétaires)

### Problème
- "Suivi par" affichait "Non assigné" au lieu de "Jack LUC"
- Filtre contacts ne fonctionnait pas

### Cause
**Confusion critique entre 2 colonnes** :
- `public.users.id` = UUID interne table (ex: `cd73c227...`)
- `public.users.user_id` = UUID `auth.users` (ex: `82be903d...`)
- **`prospects.owner_id` référence `auth.users.id` (donc = `users.user_id`), PAS `users.id`**

### Solution
Remplacer **TOUS** les `supabaseUsers.find(u => u.id === ...)` par `u.user_id === ...`

**Fichiers modifiés** :
- `ProspectDetailsAdmin.jsx` (lignes 1135, 1505, 1762)
- `Agenda.jsx` (lignes 57, 248, 1680)
- `CompleteOriginalContacts.jsx` (lignes 319, 327, 358, 574)

**Test SQL** : `check_fabrice_owner.sql` pour diagnostiquer

**Commits** :
- `fix: find users by user_id instead of id (fixes owner display)`
- `fix: use user_id instead of id for user filter in Contacts`

---

## 3️⃣ Modification propriétaire (erreur 409 FK constraint)

### Problème
Erreur 23503 "Foreign key constraint violated" lors du changement de propriétaire

### Cause
Dropdown envoyait `user.id` au lieu de `user.user_id` → contrainte FK `prospects_owner_id_fkey` rejetait

### Solution
**Fichier** : `ProspectDetailsAdmin.jsx` (ligne 647)

**Corrections** :
- `user.id` → `user.user_id` dans `userOptions`
- Ajouté `forceUpdate({})` dans `handleOwnerChange` pour re-render immédiat
- Changé affichage lecture pour utiliser `editableProspectRef.current.ownerId`

**Commits** :
- `fix: use user_id instead of id when updating prospect owner`
- `fix: force re-render after owner change`
- `fix: display owner from ref instead of prop`

---

## 🔑 Clés de diagnostic

### Erreurs courantes et leurs causes :
1. **Erreur 409/23503 (Foreign Key Constraint)** → Vérifier quelle colonne référence quoi dans le schéma
2. **"Non assigné" alors que `owner_id` existe** → Cherche par la mauvaise colonne (`id` au lieu de `user_id`)
3. **Real-time fonctionne mais UI ne se met pas à jour** → Problème de `ref` vs `state`

### Architecture auth users :
```
auth.users (Supabase Auth)
  └─ id (UUID)
      ↓
public.users (App users table)
  ├─ id (UUID) ← Internal table ID (NOT USED FOR FK)
  └─ user_id (UUID) ← References auth.users.id (USED FOR FK)
      ↑
prospects.owner_id ← MUST USE users.user_id, NOT users.id
```

### Pattern de recherche correct :
```javascript
// ❌ INCORRECT
const user = supabaseUsers.find(u => u.id === prospect.owner_id)

// ✅ CORRECT
const user = supabaseUsers.find(u => u.user_id === prospect.owner_id)
```

---

## 📝 Notes pour prochaines sessions
- Toujours vérifier si on utilise `user_id` ou `id` quand on manipule des users
- Tester les FK constraints en cas d'erreur 409
- Vérifier les refs vs state pour les problèmes de re-render
- Les `activity` utilisent `notes`, pas `text` ou `details`
- Les `activity` utilisent `status === 'effectue'`, pas `done`

---

## 4️⃣ Correction filtre utilisateur Agenda (suite analyse)

### Problème
Après correction du module Contacts, analyse du filtre utilisateur dans l'Agenda a révélé le même bug **à 4 endroits**

### Cause
**Ligne 1056** : `userOptions` dans modal "Ajouter activité" utilisait `user.id`
**Ligne 1325** : Affichage nom utilisateur dans modal utilisait `u.id === assignedUserId`
**Ligne 1466** : `userOptions` du dropdown filtre utilisait `user.id`
**Ligne 1474** : `allowedUsers.some(u => u.id === ...)` cherchait par mauvaise colonne

### Solution
**Fichier** : `src/pages/admin/Agenda.jsx` (lignes 1056, 1325, 1466, 1474)

**Corrections** :
```javascript
// 1️⃣ Modal "Ajouter activité" - userOptions (ligne 1056)
// ❌ AVANT
const userOptions = useMemo(() => {
  return users.map(user => ({ value: user.id, label: user.name }));
}, [users]);

// ✅ APRÈS
const userOptions = useMemo(() => {
  return users.map(user => ({ value: user.user_id, label: user.name }));
}, [users]);

// 2️⃣ Modal - Affichage nom utilisateur assigné (ligne 1325)
// ❌ AVANT
{assignedUserId ? users.find(u => u.id === assignedUserId)?.name : "..."}

// ✅ APRÈS
{assignedUserId ? users.find(u => u.user_id === assignedUserId)?.name : "..."}

// 3️⃣ Dropdown filtre - userOptions (ligne 1466)
// ❌ AVANT
const userOptions = useMemo(() => {
  return allowedUsers.map(user => ({ value: user.id, label: user.name }));
}, [allowedUsers]);

// ✅ APRÈS
const userOptions = useMemo(() => {
  return allowedUsers.map(user => ({ value: user.user_id, label: user.name }));
}, [allowedUsers]);

// 4️⃣ useEffect validation (ligne 1474)
// ❌ AVANT
if (!allowedUsers.some(u => u.id === selectedUserId)) {

// ✅ APRÈS
if (!allowedUsers.some(u => u.user_id === selectedUserId)) {
```

**Impact** : 
- ✅ Le dropdown utilisateur envoie maintenant le bon UUID (`user_id`)
- ✅ Le filtre des rendez-vous/appels/tâches fonctionne correctement
- ✅ Les comparaisons `assignedUserId === selectedUserId` matchent correctement
- ✅ Le modal "Ajouter activité" affiche le bon nom d'utilisateur
- ✅ Le modal envoie le bon `assigned_user_id` aux tables Supabase

**Test SQL** : `test_agenda_filter.sql` pour vérifier les activités par utilisateur

**Commits** :
- `fix: use user_id in add activity modal (dropdown + display)`
- `fix: use user_id in agenda filter dropdown and validation`

---

**Date** : 19 novembre 2025
**Fichiers critiques modifiés** : `Agenda.jsx`, `ProspectDetailsAdmin.jsx`, `CompleteOriginalContacts.jsx`
