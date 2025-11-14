# 📦 LocalStorage Encore Utilisés dans l'Application

**Date d'audit :** 14 novembre 2025  
**Objectif :** Identifier tous les localStorage restants à migrer vers Supabase

---

## ✅ DÉJÀ MIGRÉS VERS SUPABASE

### 1. **Prospects** ✅
- ❌ ~~`evatime_prospects`~~ → ✅ Table `prospects` + real-time
- Hook : `useSupabaseProspects.js`

### 2. **Appointments** ✅
- ❌ ~~`evatime_appointments`~~ → ✅ Table `appointments` + real-time
- Hook : `useSupabaseAgenda.js`

### 3. **Calls** ✅
- ❌ ~~`evatime_calls`~~ → ✅ Table `calls` + real-time
- Hook : `useSupabaseAgenda.js`

### 4. **Tasks** ✅
- ❌ ~~`evatime_tasks`~~ → ✅ Table `tasks` + real-time
- Hook : `useSupabaseAgenda.js`

### 5. **Chat Messages** ✅
- ❌ ~~`evatime_chat_messages`~~ → ✅ Table `chat_messages` + real-time
- Hook : `useSupabaseChatMessages.js`

### 6. **Notifications Admin** ✅
- ❌ ~~`evatime_notifications`~~ → ✅ Table `notifications` + real-time
- Hook : `useSupabaseNotifications.js`

### 7. **Notifications Client** ✅
- ❌ ~~`evatime_client_notifications`~~ → ✅ Table `client_notifications` + real-time
- Hook : `useSupabaseNotifications.js`

### 8. **Forms** ✅
- ❌ ~~`evatime_forms`~~ → ✅ Table `forms`
- Hook : `useSupabaseForms.js`

### 9. **Prompts (Charly AI)** ✅
- ❌ ~~`evatime_prompts`~~ → ✅ Table `prompts`
- Hook : `useSupabasePrompts.js`

### 10. **Project Steps Status** ✅
- ❌ ~~`evatime_project_steps_status`~~ → ✅ Table `project_steps_status`
- Hook : `useSupabaseProjectSteps.js`

### 11. **Company Logo** ✅
- ❌ ~~`evatime_company_logo`~~ → ✅ Table `company_settings.logo_url`
- Hook : `useSupabaseCompanySettings.js`

### 12. **Contact Form Config** ✅
- ❌ ~~`evatime_form_contact_config`~~ → ✅ Table `company_settings.settings.contact_form_config`
- Hook : `useSupabaseCompanySettings.js`

---

## ⚠️ ENCORE EN LOCALSTORAGE (À MIGRER)

### 1. **Global Pipeline Steps** ❌ PARTIEL
**Clé localStorage :** `global_pipeline_steps`  
**État actuel :**
- Table `global_pipeline_steps` créée dans schema.sql ✅
- Mais le code utilise `company_settings.settings.global_pipeline_steps` (JSONB) ⚠️
- Hook existant : `useSupabaseCompanySettings.js`
- Interface admin : ProfilePage > "Gestion des Pipelines Globales"

**Fichiers concernés :**
- `src/App.jsx` (lignes 30, 514-535, 676)
- `src/pages/admin/ProfilePage.jsx`
- `src/hooks/useSupabaseCompanySettings.js` (lignes 320-374)

**Action requise :**
- ✅ Table déjà créée
- ✅ Hook fonctionnel (mais stocke dans company_settings)
- ❌ Décider : utiliser table dédiée OU garder JSONB dans company_settings ?
- ❌ Si table dédiée : créer `useSupabaseGlobalPipeline.js`
- ❌ Activer real-time sur `global_pipeline_steps`

---

### 2. **Projects Data (Modèles de projets)** ❌ PARTIEL
**Clé localStorage :** `evatime_projects_data`  
**État actuel :**
- Table `project_templates` créée dans schema.sql ✅
- Mais le code continue d'utiliser localStorage ⚠️
- Pas de hook dédié créé ❌

**Fichiers concernés :**
- `src/App.jsx` (lignes 266-271, 544)
- `src/data/projects.js` (ancien système statique)

**Action requise :**
- ✅ Table créée avec données par défaut (ACC, Centrale, Autonomie, etc.)
- ❌ Créer `useSupabaseProjectTemplates.js`
- ❌ Migrer ProfilePage > "Gestion des Projets" pour utiliser le hook
- ❌ Supprimer `src/data/projects.js`

---

### 3. **User Projects (Tags du prospect)** ❌ 
**Clé localStorage :** `userProjects`  
**État actuel :**
- Stocké dans `prospects.tags` (array) ✅
- Mais le code synchronise encore avec localStorage ⚠️

**Fichiers concernés :**
- `src/App.jsx` (lignes 274-284, 355, 1025, 1076, 1090)
- `src/pages/ProducerLandingPage.jsx` (ligne 55)
- `src/components/admin/ProspectDetailsAdmin.jsx` (ligne 667)

**Action requise :**
- ✅ Déjà dans `prospects.tags`
- ❌ Supprimer toutes les sync localStorage (lecture/écriture)
- ❌ Utiliser uniquement `useSupabaseProspects.js`

---

### 4. **Current User (Utilisateur connecté)** ❌ 
**Clé localStorage :** `currentUser`  
**État actuel :**
- Auth gérée par Supabase Auth ✅
- Profil dans `prospects` (client) ou `users` (admin) ✅
- Mais le code stocke encore l'objet complet en localStorage ⚠️

**Fichiers concernés :**
- `src/App.jsx` (lignes 348, 1071, 1085, 1093)
- `src/pages/ProducerLandingPage.jsx` (ligne 59)

**Action requise :**
- ✅ Auth et profils déjà dans Supabase
- ❌ Supprimer localStorage, utiliser `supabase.auth.getUser()` + query `prospects`/`users`
- ❌ Créer un context global pour l'utilisateur courant (si pas déjà fait)

---

### 5. **Active Admin User** ❌ 
**Clé localStorage :** `activeAdminUser`  
**État actuel :**
- Stocké temporairement pour l'admin connecté ⚠️
- Redondant avec Supabase Auth

**Fichiers concernés :**
- `src/App.jsx` (lignes 221, 244, 449, 1103)
- `src/pages/admin/ProfilePage.jsx` (ligne 1338)

**Action requise :**
- ❌ Remplacer par `useSupabaseUser.js` (déjà existant)
- ❌ Query directe sur `users` table avec `auth.uid()`

---

### 6. **Project Infos (RIB, documents)** ❌ PARTIEL
**Clé localStorage :** `project_infos` + anciennes clés (`project-{id}-rib`, etc.)  
**État actuel :**
- Table `project_infos` créée dans schema.sql ✅
- Mais le code continue d'utiliser localStorage ⚠️
- Pas de hook dédié créé ❌

**Fichiers concernés :**
- `src/App.jsx` (lignes 471-511, 584)

**Action requise :**
- ✅ Table créée avec JSONB pour stocker ribFile, documents, notes, amount
- ❌ Créer `useSupabaseProjectInfos.js`
- ❌ Migrer lecture/écriture vers Supabase
- ❌ Supprimer toutes les sync localStorage

---

### 7. **Client Auth Token** ❌ 
**Clé localStorage :** `evatime_current_user`  
**État actuel :**
- Utilisé dans SettingsPage client pour déconnexion ⚠️
- Redondant avec Supabase Auth

**Fichiers concernés :**
- `src/pages/client/SettingsPage.jsx` (lignes 179, 191)

**Action requise :**
- ❌ Utiliser uniquement `supabase.auth.signOut()`
- ❌ Supprimer cette clé

---

## 📊 RÉSUMÉ DE LA MIGRATION

| Donnée | Table Supabase | Hook | localStorage restant | Status |
|--------|----------------|------|----------------------|--------|
| Prospects | `prospects` | ✅ `useSupabaseProspects` | ❌ Oui (sync) | 🟡 PARTIEL |
| Appointments | `appointments` | ✅ `useSupabaseAgenda` | ❌ Oui (sync) | 🟡 PARTIEL |
| Calls | `calls` | ✅ `useSupabaseAgenda` | ❌ Oui (sync) | 🟡 PARTIEL |
| Tasks | `tasks` | ✅ `useSupabaseAgenda` | ❌ Oui (sync) | 🟡 PARTIEL |
| Chat Messages | `chat_messages` | ✅ `useSupabaseChatMessages` | ❌ Oui (sync) | 🟡 PARTIEL |
| Notifications | `notifications` | ✅ `useSupabaseNotifications` | ❌ Oui (sync) | 🟡 PARTIEL |
| Client Notifications | `client_notifications` | ✅ `useSupabaseNotifications` | ❌ Oui (sync) | 🟡 PARTIEL |
| Forms | `forms` | ✅ `useSupabaseForms` | ❌ Oui (init) | 🟡 PARTIEL |
| Prompts | `prompts` | ✅ `useSupabasePrompts` | ❌ Oui (init) | 🟡 PARTIEL |
| Project Steps Status | `project_steps_status` | ✅ `useSupabaseProjectSteps` | ❌ Oui (sync) | 🟡 PARTIEL |
| Company Logo | `company_settings.logo_url` | ✅ `useSupabaseCompanySettings` | ❌ Oui (migration) | 🟡 PARTIEL |
| Contact Form Config | `company_settings.settings.contact_form_config` | ✅ `useSupabaseCompanySettings` | ❌ Oui (migration) | 🟡 PARTIEL |
| **Global Pipeline Steps** | `global_pipeline_steps` OU `company_settings.settings` | ✅ `useSupabaseCompanySettings` | ❌ **OUI** | 🔴 **À MIGRER** |
| **Project Templates** | `project_templates` | ❌ **MANQUANT** | ❌ **OUI** | 🔴 **À CRÉER** |
| **User Projects (tags)** | `prospects.tags` | ✅ `useSupabaseProspects` | ❌ **OUI** | 🔴 **À NETTOYER** |
| **Current User** | `prospects` / `users` | ✅ `useSupabaseUser` | ❌ **OUI** | 🔴 **À NETTOYER** |
| **Active Admin User** | `users` | ✅ `useSupabaseUser` | ❌ **OUI** | 🔴 **À NETTOYER** |
| **Project Infos** | `project_infos` | ❌ **MANQUANT** | ❌ **OUI** | 🔴 **À CRÉER** |
| **Client Auth Token** | Supabase Auth | - | ❌ **OUI** | 🔴 **À SUPPRIMER** |

---

## 🎯 PLAN D'ACTION PRIORITAIRE

### Phase 1 : Nettoyage localStorage (impact faible) 🟢
1. ✅ Supprimer sync `currentUser` → utiliser uniquement Supabase Auth
2. ✅ Supprimer sync `activeAdminUser` → utiliser `useSupabaseUser`
3. ✅ Supprimer sync `userProjects` → utiliser `prospects.tags`
4. ✅ Supprimer `evatime_current_user` → utiliser `supabase.auth`

### Phase 2 : Créer hooks manquants (impact moyen) 🟡
5. ✅ Créer `useSupabaseProjectTemplates.js` (CRUD sur `project_templates`)
6. ✅ Créer `useSupabaseProjectInfos.js` (CRUD sur `project_infos`)
7. ✅ Migrer ProfilePage > "Gestion des Projets" pour utiliser les hooks

### Phase 3 : Décider architecture pipelines (impact élevé) 🔴
8. ✅ Choisir : table `global_pipeline_steps` OU JSONB `company_settings` ?
   - **Option A** : Utiliser table dédiée → créer `useSupabaseGlobalPipeline.js`
   - **Option B** : Garder JSONB dans `company_settings` (actuel) → rien à faire
9. ✅ Activer real-time si table dédiée choisie
10. ✅ Supprimer toutes les références localStorage

### Phase 4 : Tests et validation 🧪
11. ✅ Tester chaque fonctionnalité migrée
12. ✅ Vérifier sync real-time admin ↔ client
13. ✅ Valider RLS policies
14. ✅ Nettoyer code mort (anciens imports, variables inutilisées)

---

## 🔍 COMMANDES POUR AUDIT FINAL

```bash
# Chercher tous les localStorage restants
grep -r "localStorage\." src/ --exclude-dir=node_modules

# Chercher les anciennes clés localStorage
grep -r "evatime_" src/ --exclude-dir=node_modules

# Vérifier les imports de projects.js (ancien système)
grep -r "from.*projects.js" src/ --exclude-dir=node_modules
```

---

## 📝 NOTES IMPORTANTES

### ⚠️ DOUBLE SYSTÈME DÉTECTÉ : Global Pipeline Steps

**Problème :**
- Table `global_pipeline_steps` créée dans `schema.sql`
- Mais le code utilise `company_settings.settings.global_pipeline_steps` (JSONB)
- Les 2 systèmes coexistent sans être synchronisés

**Recommandation :**
- **Option 1 (Recommandée)** : Utiliser la table dédiée
  - ✅ Meilleure structure (colonnes typées)
  - ✅ Index optimisés
  - ✅ Real-time natif
  - ✅ Évolutivité (ajout de colonnes facile)
  - ❌ Nécessite création hook + migration code

- **Option 2 (Plus rapide)** : Garder JSONB dans company_settings
  - ✅ Déjà fonctionnel
  - ✅ Pas de code à modifier
  - ❌ Moins performant pour requêtes complexes
  - ❌ Moins flexible (JSONB = structure libre)

**Décision à prendre avant de continuer la migration !**
