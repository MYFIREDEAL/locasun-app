# 📋 TODO LIST - Migration Supabase Locasun App

**Dernière mise à jour:** 13 novembre 2025  
**Status global:** Phase 1 ✅ | Phase 2 🔄 | Phase 3 ⏳ | Phase 4 ⏳

---

## ⚠️ RÈGLES DE GESTION TODO

**🤖 Copilot gère ce fichier automatiquement :**
- ✅ C'est Copilot qui coche les cases `[ ]` → `[x]` quand une tâche est terminée
- ✅ C'est Copilot qui met à jour les dates et statuts
- ✅ C'est Copilot qui commit TODO.md avec les changements de code

**👤 L'utilisateur ne touche JAMAIS à TODO.md :**
- Il dit juste "On fait Task 2.1" ou "Continue Phase 2"
- Copilot code + coche + commit automatiquement

**📖 Pour consulter l'avancement :**
- L'utilisateur dit "Regarde la TODO" → Copilot lit TODO.md

---

## ✅ PHASE 1 - TERMINÉE (40 min)
**Objectif:** Fixer les affichages utilisateurs urgents

### ✅ Task 1.1 - Agenda.jsx
- **Fichier:** `src/pages/admin/Agenda.jsx`
- **Lignes modifiées:** 1148, 1206
- **Changements:**
  - ✅ Migré vers `useSupabaseUsers()` pour affichage utilisateur assigné
  - ✅ Supprimé `users` du context dans ce fichier
- **Commit:** 44e150f
- **Status:** ✅ Déployé en production

### ✅ Task 1.2 - ProspectDetailsAdmin.jsx
- **Fichier:** `src/components/admin/ProspectDetailsAdmin.jsx`
- **Lignes modifiées:** 222, 1285, 1541
- **Changements:**
  - ✅ Migré modales d'activités vers `supabaseUsers.find()`
  - ✅ Fixé avatar chat: `users[prospectId]` → `prospects.find()`
- **Commit:** 44e150f
- **Status:** ✅ Déployé en production

### ✅ Task 1.3 - AdminHeader.jsx
- **Fichier:** `src/components/admin/AdminHeader.jsx`
- **Ligne modifiée:** 166
- **Changements:**
  - ✅ Dropdown changement utilisateur migré vers `useSupabaseUsers()`
  - ✅ Ajout loading state
- **Commit:** 44e150f
- **Status:** ✅ Déployé en production

### ✅ Task 1.4 - CompleteOriginalContacts.jsx
- **Fichier:** `src/pages/admin/CompleteOriginalContacts.jsx`
- **Lignes modifiées:** 293-303, 362-364
- **Changements:**
  - ✅ Nettoyage des console.logs de debug
- **Commit:** 44e150f
- **Status:** ✅ Déployé en production

**Production URL:** https://evatime.vercel.app

---

## 🔄 PHASE 2 - EN COURS (4-6h)
**Objectif:** Migration complète du user management

### ✅ Task 2.1 - ProfilePage.jsx - Gestion des utilisateurs
**Priorité:** HAUTE | **Temps estimé:** 3-4h | **Statut:** ✅ TERMINÉ (13 nov 2025)

**Fichier:** `src/pages/admin/ProfilePage.jsx`
**Commit:** c3b722b
**Date:** 13 novembre 2025

**Lignes à migrer:**
- [x] ~~Ligne 1275: `users[editingUser]`~~ → Migré vers Supabase
- [x] ~~Ligne 1316: `Object.values(users)`~~ → Utilise `useMemo` sur `supabaseUsers`
- [x] ~~Ligne 1332: `handleAddUser()`~~ → Remplacé par `addUser()` hook
- [x] ~~Ligne 1333: `setUsers(prev => ({...prev}))`~~ → Supprimé (real-time)
- [x] ~~Ligne 1352: `handleUpdateUser()`~~ → Remplacé par `updateUser()` hook
- [x] ~~Ligne 1355: `setUsers(prev => ({...prev}))`~~ → Supprimé (real-time)
- [x] ~~Ligne 1382: `handleDeleteUser()`~~ → Remplacé par `deleteUserSupabase()` hook
- [x] ~~Ligne 1385: `setUsers(prev => {...prev})`~~ → Supprimé (real-time)
- [x] Formulaire édition utilisateur → Migré
- [x] Tableau liste utilisateurs → Migré
- [x] Actions CRUD boutons → Migré

**Actions requises:**
1. [x] Créer `src/hooks/useSupabaseUsersCRUD.js` avec:
   - `addUser(userData)` - INSERT dans `public.users`
   - `updateUser(userId, updates)` - UPDATE
   - `deleteUser(userId)` - DELETE
   - Real-time sync automatique via subscription
2. [x] Ajouter import: `import { useSupabaseUsersCRUD } from '@/hooks/useSupabaseUsersCRUD'`
3. [x] Remplacer `const { users, updateUsers, deleteUser } = useAppContext()` par hook Supabase
4. [x] Remplacer tous les `updateUsers()` localStorage par appels Supabase
5. [x] Remplacer `deleteUser()` localStorage par `deleteUserSupabase()`
6. [x] Transformer array Supabase en objet compatible (useMemo)

**Dépendances:**
- Permissions RLS dans Supabase ✅ (déjà configuré dans `schema.sql`)

**Résultats:**
- ✅ Création d'utilisateurs fonctionne (testé en local)
- ✅ Modification des droits d'accès fonctionne
- ✅ Changement de rôle fonctionne
- ✅ Suppression avec réassignation des prospects fonctionne
- ✅ Real-time sync opérationnel
- ⚠️ Email de confirmation envoyé (désactivable dans Supabase settings)

**Notes importantes:**
- Les utilisateurs sont créés avec `auth.signUp()` (envoie email confirmation)
- RLS policy "Global Admin can insert users" ajoutée dans Supabase
- Hook transforme array → object via `useMemo` pour compatibilité
- Pour production future : Créer Edge Function avec Service Role Key (pas d'email)
- Les utilisateurs doivent être dans `auth.users` ET `public.users`
- Vérifier cohérence avec `supabase/AUTH_LOGIC.md`

---

### ✅ Task 2.2 - App.jsx - Nettoyer Context
**Priorité:** HAUTE | **Temps estimé:** 30 min | **Statut:** ✅ TERMINÉ (13 nov 2025)

**Fichier:** `src/App.jsx`
**Commit:** À faire

**Actions:**
- [x] Supprimer l'objet `users` du state initial (localStorage) - ligne 162
- [x] Supprimer `setUsers` des fonctions (ligne ~807)
- [x] Supprimer `updateUsers()` fonction (ligne ~807)
- [x] Supprimer `deleteUser()` fonction (ligne ~812) - déjà migré vers hook
- [x] Supprimer `getAdminById()` fonction - utilisait `users[userId]`
- [x] Supprimer chargement localStorage 'evatime_users' (lignes 356-377)
- [x] Supprimer `users`, `updateUsers`, `deleteUser`, `getAdminById` du context
- [x] Garder `activeAdminUser` et `switchActiveAdminUser()` (toujours nécessaires)

**Résultats:**
- ✅ Context App.jsx nettoyé : ~100 lignes supprimées
- ✅ Plus aucune référence `users` localStorage dans App.jsx
- ✅ Tous les composants doivent maintenant utiliser les hooks Supabase
- ✅ Context est plus léger et performant
- ⚠️ `activeAdminUser` conservé (nécessaire pour switch user + routing)

**Impact:** 
- Tous les composants devront utiliser `useSupabaseUsers()` ou `useSupabaseUsersCRUD()` exclusivement
- Plus de conflits localStorage/Supabase possible
- ProfilePage ✅ déjà migré (Task 2.1)
- AdminHeader ✅ déjà migré (Phase 1)
- Agenda ✅ déjà migré (Phase 1)
- ProspectDetailsAdmin ✅ déjà migré (Phase 1)

**Tests à effectuer:**
- [ ] Vérifier que le switch user fonctionne encore dans AdminHeader
- [ ] Vérifier que les filtres par user fonctionnent (Pipeline, Agenda, Contacts)
- [ ] Vérifier que ProfilePage continue à fonctionner
- [ ] Vérifier qu'aucun composant ne crash par manque de `users` context

**⚠️ Note:**
- `activeAdminUser` conservé dans localStorage (objet complet)
- `switchActiveAdminUser()` toujours fonctionnel
- Si besoin futur : remplacer par UUID + hook pour optimiser

---

### � Task 2.3 - Audit final composants restants
**Priorité:** MOYENNE | **Temps estimé:** 1-2h | **Statut:** 🔄 EN COURS (13 nov 2025)

**Progression:** 6/7 fichiers migrés (~86% complete)

**✅ Fichiers complétés:**
1. [x] **App.jsx** (commit 50d261d)
   - ✅ Modified `switchActiveAdminUser()` to accept user object instead of userId
   - ✅ Components must now pass full user object from `useSupabaseUsers()`

2. [x] **AdminHeader.jsx** (commit 50d261d)
   - ✅ Updated `handleUserSwitch()` to find user from `supabaseUsers`
   - ✅ Passes full user object to `switchActiveAdminUser()`

3. [x] **CompleteOriginalContacts.jsx** (commit 50d261d)
   - ✅ Removed `users` from context
   - ✅ Added `useMemo` to transform `supabaseUsers` array to object
   - ✅ All `users[ownerId]` references now use Supabase data

4. [x] **ProspectDetailsAdmin.jsx** (commit 71a75e1)
   - ✅ Fixed `supabaseUsers` undefined error causing blank page
   - ✅ Removed `users` from context in 5 nested components:
     - `ChatInterface`
     - `ProspectActivities`
     - `OtherActivityDetailsPopup`
     - `EventDetailsPopup`
     - `ProspectDetailsAdmin` (main)
   - ✅ Added `useSupabaseUsers()` hook to each component
   - ✅ **BUG FIX:** Clicking on associated project no longer causes blank page

5. [x] **FinalPipeline.jsx** (commit 71a75e1)
   - ✅ Added `useSupabaseUsers()` import and hook call
   - ✅ Ready for future users display needs

6. [x] **Agenda.jsx - AddActivityModal** (commit f084af2)
   - ✅ **CRITICAL BUG FIX:** Fixed blank page when creating appointment
   - ✅ Line 1148: Changed `supabaseUsers.find()` → `users.find()`
   - ✅ AddActivityModal uses `users` prop (from parent), not global `supabaseUsers`
   - ✅ Error: "ReferenceError: Can't find variable: supabaseUsers"
   - ✅ Impact: Appointment creation now works properly

**🔴 Fichiers restants:**

1. [ ] **SafeProspectDetailsAdmin.jsx**
   - 2 références à 'users' context (lignes 127, 131)
   - Pattern: `users[ownerId]`
   - À migrer vers `useSupabaseUsers()`

2. [ ] **ProfilePage.jsx**
   - 1 référence ligne 1356: `users[userId]`
   - ⚠️ Task 2.1 devrait avoir tout migré → À VÉRIFIER uniquement

3. [ ] **RegistrationPage.jsx**
   - 5 références (lignes 16, 37, 103, 104, 106, 107)
   - Pattern: `users[affiliateId]`, `users['user-1']`
   - Logique d'affiliation à migrer vers Supabase

**Méthode:**
```bash
# Commande pour trouver tous les usages restants
grep -rn "users =\|users\[\|Object.values(users)" src/
```

**Actions pour chaque match:**
1. Lire le contexte du code
2. Décider si migration nécessaire
3. Migrer vers `useSupabaseUsers()` ou `useSupabaseUsersCRUD()` si besoin
4. Tester en local
5. Commit incrémental

**Commit final:** `"feat: Phase 2 complete - All localStorage users references removed"`

**⚠️ Note importante:**
- Certains composants utilisent déjà `useSupabaseUsers()` (Agenda, ProspectDetailsAdmin, AdminHeader)
- Vérifier qu'ils ne cassent pas après suppression du context
- Si un composant utilise `users` du context ET le hook Supabase → supprimer la référence context

---

## ⏳ PHASE 3 - À FAIRE (3-4h)
**Objectif:** Migration des messages chat vers Supabase

### 🟡 Task 3.1 - Créer table chat_messages Supabase
**Priorité:** MOYENNE | **Temps estimé:** 1h

**Fichier à créer:** `supabase/create_chat_messages.sql`

**Schema:**
```sql
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  project_type TEXT NOT NULL,
  sender TEXT NOT NULL CHECK (sender IN ('pro', 'client')),
  text TEXT,
  file_url TEXT,
  file_name TEXT,
  form_id UUID REFERENCES public.client_form_panels(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX idx_chat_messages_prospect_project 
  ON public.chat_messages(prospect_id, project_type);

-- RLS Policies
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all messages"
  ON public.chat_messages FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM public.users));

CREATE POLICY "Clients can view their own messages"
  ON public.chat_messages FOR SELECT
  USING (prospect_id IN (SELECT id FROM public.prospects WHERE user_id = auth.uid()));
```

**Étapes:**
- [ ] Créer fichier SQL
- [ ] Exécuter dans Supabase Dashboard SQL Editor
- [ ] Activer Real-time pour table `chat_messages` (Supabase Dashboard > Database > Replication)
- [ ] Tester insertion manuelle dans SQL Editor

---

### 🟡 Task 3.2 - Créer hook useSupabaseChat.js
**Priorité:** MOYENNE | **Temps estimé:** 1-2h

**Fichier à créer:** `src/hooks/useSupabaseChat.js`

**Fonctionnalités requises:**
- [ ] Fetch initial messages filtrés par `prospect_id` et `project_type`
- [ ] Real-time subscription pour nouveaux messages
- [ ] Transform snake_case → camelCase
- [ ] `addMessage(messageData)` - INSERT
- [ ] `updateMessage(messageId, updates)` - UPDATE (pour forms)
- [ ] `deleteMessage(messageId)` - DELETE (si nécessaire)
- [ ] Loading states
- [ ] Error handling

**Pattern:** S'inspirer de `useSupabaseProspects.js` et `useSupabaseAgenda.js`

**Test:**
- [ ] Envoyer message depuis admin
- [ ] Vérifier réception temps réel
- [ ] Envoyer message depuis client (si implémenté)

---

### 🟡 Task 3.3 - Migrer ChatInterface component
**Priorité:** MOYENNE | **Temps estimé:** 1h

**Fichier:** `src/components/admin/ProspectDetailsAdmin.jsx`

**Changements:**
- [ ] Remplacer `getChatMessages(prospectId, projectType)` par `useSupabaseChat(prospectId, projectType)`
- [ ] Remplacer `addChatMessage()` context par `addMessage()` hook
- [ ] Gérer loading state pendant fetch
- [ ] Afficher erreurs si échec envoi

**Fichier:** `src/App.jsx`
- [ ] Supprimer `chatMessages` du state
- [ ] Supprimer `getChatMessages()` fonction
- [ ] Supprimer `addChatMessage()` fonction
- [ ] Nettoyer `localStorage.getItem('chatMessages')`

**Test:**
- [ ] Ouvrir fiche prospect
- [ ] Envoyer message texte
- [ ] Envoyer fichier (vérifier upload)
- [ ] Envoyer formulaire
- [ ] Vérifier scroll automatique
- [ ] Vérifier affichage avatar prospect

**Commit:** `"feat: Phase 3 - Migrate chat to Supabase real-time"`

---

## ⏳ PHASE 4 - À FAIRE (2-3h)
**Objectif:** Migration forms, prompts, project steps vers Supabase

### 🟢 Task 4.1 - Audit tables Supabase existantes
**Priorité:** BASSE | **Temps estimé:** 30 min

**Tables déjà en Supabase:**
- ✅ `client_form_panels` (formulaires dynamiques)
- ✅ `project_steps_status` (étapes projets)
- ❓ `prompts` - **À VÉRIFIER**

**Actions:**
- [ ] Lire `supabase/schema.sql` ligne par ligne
- [ ] Lister toutes les tables créées
- [ ] Vérifier quelles données sont encore dans localStorage:
  - [ ] `forms` context
  - [ ] `prompts` context
  - [ ] `projectsData` context
  - [ ] `projectStepsStatus` context
- [ ] Créer plan de migration pour chaque élément restant

**Commande:**
```bash
grep -n "CREATE TABLE" supabase/schema.sql
```

---

### 🟢 Task 4.2 - Créer hooks manquants
**Priorité:** BASSE | **Temps estimé:** 2h

**Hooks à créer (selon résultats Task 4.1):**

- [ ] **useSupabaseForms.js** - CRUD formulaires dynamiques
  - Fetch forms
  - Real-time updates
  - addForm, updateForm, deleteForm

- [ ] **useSupabasePrompts.js** - CRUD prompts automation (Charly AI)
  - Fetch prompts
  - Real-time updates
  - addPrompt, updatePrompt, deletePrompt
  - triggerPrompt (exécution automation)

- [ ] **useSupabaseProjectSteps.js** - CRUD étapes projets
  - Fetch project steps by prospect + project_type
  - Real-time updates
  - updateStepStatus, completeStep

**Pattern identique pour tous:**
1. useState pour données + loading
2. useEffect pour fetch initial
3. useEffect pour real-time subscription
4. Fonctions CRUD avec async/await
5. Transform snake_case ↔ camelCase
6. Error handling

---

### 🟢 Task 4.3 - Supprimer localStorage complètement
**Priorité:** BASSE | **Temps estimé:** 30 min

**Fichier:** `src/App.jsx`

**Actions:**
- [ ] Supprimer tous les `localStorage.getItem()` restants
- [ ] Supprimer tous les `localStorage.setItem()` restants
- [ ] Supprimer state initial localStorage (users, chatMessages, forms, prompts, etc.)
- [ ] Context devient simple passthrough pour Supabase hooks
- [ ] Nettoyer `useEffect` qui sync avec localStorage

**Vérification:**
```bash
# Chercher tous les usages localStorage
grep -rn "localStorage" src/
```

**Commit final:** `"feat: Phase 4 - Complete localStorage removal, full Supabase migration"`

**Test final:**
- [ ] Vider localStorage navigateur
- [ ] Recharger app
- [ ] Vérifier que tout fonctionne (données depuis Supabase)
- [ ] Tester real-time: ouvrir 2 onglets, modifier dans l'un, vérifier sync dans l'autre

---

## 🎯 RÉCAPITULATIF

### ✅ **TERMINÉ**
- **Phase 1:** Affichages utilisateurs (4 fichiers) ✅
- **Production:** Déployé sur Vercel ✅

### 🔄 **EN COURS**
- **Phase 2:** User management ProfilePage.jsx (À démarrer)

### ⏳ **PROCHAINES ÉTAPES**
1. Phase 2 (4-6h) - User management complet
2. Phase 3 (3-4h) - Chat migration
3. Phase 4 (2-3h) - Forms/prompts/steps

### ⏱️ **TEMPS ESTIMÉ**
- Phase 1: ✅ 40 min (FAIT)
- Phase 2: 🔄 4-6h
- Phase 3: ⏳ 3-4h
- Phase 4: ⏳ 2-3h
- **TOTAL:** ~10-14h restantes

---

## 📝 NOTES

### Commandes utiles
```bash
# Chercher usages localStorage users
grep -rn "users =\|users\[\|Object.values(users)" src/

# Chercher tous localStorage
grep -rn "localStorage" src/

# Lancer dev local
npm run dev

# Build production
npm run build

# Deploy Vercel (auto via GitHub push)
git push origin main
```

### Liens importants
- **Production:** https://evatime.vercel.app
- **Supabase Dashboard:** https://vvzxvtiyybilkswslqfn.supabase.co
- **GitHub Repo:** https://github.com/MYFIREDEAL/locasun-app
- **Documentation Supabase:** `supabase/` folder

### Principes de migration
1. ✅ Toujours créer hook Supabase AVANT de modifier composants
2. ✅ Tester en local avant commit
3. ✅ Commits incrémentaux (pas tout d'un coup)
4. ✅ Garder real-time en tête (éviter setState manuel)
5. ✅ Snake_case Supabase ↔ camelCase App

---

**Dernière modification:** 13 novembre 2025 - Phase 1 complétée 🎉
