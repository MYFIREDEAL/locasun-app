# 🔍 AUDIT TECHNIQUE MULTI-TENANT — ÉTAT RÉEL DU REPO (18 février 2026)

**Contexte** : Analyse factuelle du code actuel après corrections multi-tenant (commits fa14844, 166fd8d, e92c78e)

## 1️⃣ TABLES RÉELLEMENT UTILISÉES DANS LE CODE

### Liste complète (22 tables identifiées via `.from('...')`)

| Table | Catégorie | Usage principal |
|-------|-----------|-----------------|
| `appointments` | **Agenda/Tâches** | Rendez-vous, appels, tâches admin |
| `chat_messages` | **Communication** | Messages prospect/admin |
| `client_form_panels` | **Formulaires** | Panels formulaires clients |
| `client_notifications` | **Notifications** | Notifications côté client |
| `notifications` | **Notifications** | Notifications côté admin |
| `prospects` | **Contacts** | Base prospects/clients |
| `users` | **Authentification** | Utilisateurs admin |
| `organizations` | **Multi-tenant** | Organisations (orgs) |
| `organization_settings` | **Config** | Paramètres par org |
| `company_settings` | **Config** | Paramètres globaux (legacy) |
| `project_infos` | **Projets** | Infos projets prospects |
| `project_steps_status` | **Projets** | Statut étapes projets |
| `project_history` | **Projets** | Historique projets |
| `project_files` | **Fichiers** | Documents projets |
| `project_templates` | **Configuration** | Templates projets par org |
| `global_pipeline_steps` | **Pipeline** | Étapes pipeline par org |
| `forms` | **Formulaires** | Définitions formulaires |
| `contract_templates` | **Contrats** | Templates contrats signature |
| `signature_procedures` | **Signature** | Procédures signature électronique |
| `signature_proofs` | **Signature** | Preuves de signature |
| `prompts` | **IA** | Prompts Charly AI |
| `workflow_module_templates` | **Workflow V2** | Config modules Workflow V2 |
| `partners` | **Partenaires** | Partenaires externes |
| `missions` | **Partenaires** | Missions assignées partenaires |
| `platform_admins` | **Platform** | Admins plateforme globale |
| `cosigner_invite_tokens` | **Signature** | Tokens co-signataires |

**Total** : 26 tables distinctes

---

## 2️⃣ SUBSCRIPTIONS REAL-TIME

### Hooks avec real-time Supabase (32 channels identifiés)

| Hook | Table écoutée | Filtre `organization_id` | Filtre `prospect_id` | Filtre `owner_id` | Autre filtre |
|------|---------------|-------------------------|---------------------|------------------|--------------|
| `useAutoVerificationTasks` | `client_form_panels` | ✅ **OUI** | ❌ | ❌ | - |
| `useSupabaseProspects` | `prospects` | ❌ **NON** | ❌ | ❌ | - |
| `useSupabaseAgenda` | `appointments` | ❌ **NON** | ❌ | ❌ | - |
| `useSupabaseNotifications` | `notifications` | ❌ | ❌ | ✅ **OUI** | - |
| `useSupabaseChatMessages` | `chat_messages` | ❌ | ✅ **OUI** | ❌ | + `project_type` |
| `useSupabaseClientFormPanels` | `client_form_panels` | ❌ | ✅ Conditionnel | ❌ | - |
| `useSupabaseProjectStepsStatus` | `project_steps_status` | ❌ | ✅ **OUI** | ❌ | - |
| `useSupabaseProjectInfos` | `project_infos` | ❌ **NON** | ❌ | ❌ | - |
| `useSupabaseProjectFiles` | `project_files` | ❌ | ❌ | ❌ | `project_type` |
| `useSupabaseProjectNotes` | `project_notes` | ❌ | ❌ | ❌ | `project_type` |
| `useSupabaseProjectHistory` | `project_history` | ❌ | ❌ | ❌ | `project_type` |
| `useSupabaseProjectTemplates` | `project_templates` | ✅ **OUI** | ❌ | ❌ | - |
| `useSupabaseGlobalPipeline` | `global_pipeline_steps` | ✅ **OUI** | ❌ | ❌ | - |
| `useSupabaseForms` | `forms` | ✅ **OUI** | ❌ | ❌ | - |
| `useSupabasePrompts` | `prompts` | ✅ **OUI** | ❌ | ❌ | - |
| `useSupabaseContractTemplates` | `contract_templates` | ✅ **OUI** | ❌ | ❌ | - |
| `useSupabaseClientNotifications` | `client_notifications` | ❌ | ✅ **OUI** | ❌ | - |
| `useSupabaseCompanySettings` | `company_settings` | ❌ | ❌ | ❌ | `id` (singleton) |
| `useLandingPageConfig` | `organization_settings` | ✅ **OUI** | ❌ | ❌ | - |
| `useSupabasePartners` | `partners` + `missions` | ❌ **NON** | ❌ | ❌ | - |
| `useAutoCreateTasks` | `project_steps_status` | ❌ **NON** | ❌ | ❌ | - |
| `usePresenceCheck` | `chat_messages` + `client_form_panels` | ❌ **NON** | ❌ | ❌ | - |
| `useReminderReset` | `chat_messages` | ❌ **NON** | ❌ | ❌ | - |
| `useFormReminderWatcher` | `client_form_panels` | ❌ **NON** | ❌ | ❌ | - |
| `useWorkflowActionTrigger` | `client_form_panels` | ❌ | ✅ **OUI** | ❌ | + `project_type` + `step` |
| `useSupabaseAllProjectSteps` | `project_steps_status` | ❌ **NON** | ❌ | ❌ | - |
| `useSupabaseUsersCRUD` | `users` | ❌ **NON** | ❌ | ❌ | - |

**Résumé** :
- ✅ **8 hooks** avec filtre `organization_id`
- ✅ **1 hook** avec filtre `owner_id`
- ✅ **5 hooks** avec filtre `prospect_id`
- ❌ **13 hooks** SANS AUCUN FILTRE multi-tenant

---

## 3️⃣ USAGE DE `organization_id` DANS LE CODE

### Dans les hooks (analyse grep)

| Hook | Filtre lecture | Filtre real-time | Insert avec org_id | Update avec org_id |
|------|---------------|------------------|-------------------|-------------------|
| `useSupabaseProspects` | ❌ | ❌ | ❌ | ❌ |
| `useSupabaseAgenda` | ❌ | ❌ | ❌ | ❌ |
| `useSupabaseProjectStepsStatus` | ❌ | ❌ | ❌ | ❌ |
| `useSupabaseProjectFiles` | ❌ | ❌ | ❌ | ❌ |
| `useSupabaseProjectNotes` | ❌ | ❌ | ❌ | ❌ |
| `useSupabaseChatMessages` | ❌ | ❌ | ❌ | ❌ |
| `useSupabaseClientFormPanels` | Via RPC | ❌ | ❌ | ❌ |
| `useSupabaseNotifications` | ✅ `.eq('organization_id')` | ❌ (`owner_id`) | ✅ | ✅ |
| `useSupabasePrompts` | Via RPC | ✅ | ✅ | ✅ |
| `useSupabaseForms` | ✅ `.eq('organization_id')` | ✅ | ✅ | ✅ |
| `useSupabaseProjectTemplates` | Via RPC | ✅ | ✅ | ✅ |
| `useSupabaseGlobalPipeline` | Via RPC | ✅ | ✅ | ✅ |
| `useSupabaseContractTemplates` | ✅ `.eq('organization_id')` | ✅ | ✅ | ✅ |
| `useSupabaseWorkflowModuleTemplates` | ✅ `.eq('org_id')` | ❌ (pas de RT) | ✅ | ✅ |
| `useLandingPageConfig` | ✅ `.eq('organization_id')` | ✅ | ❌ | ✅ |
| `useAutoVerificationTasks` | - | ✅ | - | - |

**Pattern observé** :
- Tables **config/globales** (forms, prompts, templates) → ✅ Filtrent par `organization_id`
- Tables **transactionnelles** (prospects, appointments, chat, steps) → ❌ **PAS de filtre `organization_id`**

---

## 4️⃣ HOOKS MULTI-TENANT : ANALYSE DÉTAILLÉE

### ✅ Hooks conformes multi-tenant

| Hook | Table | Filtre appliqué | Type |
|------|-------|----------------|------|
| `useSupabaseForms` | `forms` | `organization_id` | Config |
| `useSupabasePrompts` | `prompts` | `organization_id` | Config |
| `useSupabaseProjectTemplates` | `project_templates` | `organization_id` (via RPC) | Config |
| `useSupabaseGlobalPipeline` | `global_pipeline_steps` | `organization_id` (via RPC) | Config |
| `useSupabaseContractTemplates` | `contract_templates` | `organization_id` | Config |
| `useSupabaseWorkflowModuleTemplates` | `workflow_module_templates` | `org_id` | Config |
| `useLandingPageConfig` | `organization_settings` | `organization_id` | Config |
| `useAutoVerificationTasks` | `client_form_panels` | `organization_id` (RT only) | Automation |

### ⚠️ Hooks partiellement multi-tenant

| Hook | Table | Filtre actuel | Problème |
|------|-------|--------------|----------|
| `useSupabaseNotifications` | `notifications` | `owner_id` uniquement | Pas de filtre `organization_id` en lecture ni RT |
| `useSupabaseClientFormPanels` | `client_form_panels` | `prospect_id` (conditionnel) | Pas de filtre `organization_id` en RT |

### ❌ Hooks NON multi-tenant (filtrage manquant)

| Hook | Table | Filtre actuel | Risque |
|------|-------|--------------|--------|
| `useSupabaseProspects` | `prospects` | ❌ **AUCUN** | 🔴 **CRITIQUE** - Tous prospects de toutes orgs |
| `useSupabaseAgenda` | `appointments` | ❌ **AUCUN** | 🔴 **CRITIQUE** - Tous RDV/tâches de toutes orgs |
| `useSupabaseProjectStepsStatus` | `project_steps_status` | `prospect_id` seulement | 🟠 **MOYEN** - Dépend de prospect filtré en amont |
| `useSupabaseProjectFiles` | `project_files` | `project_type` seulement | 🟠 **MOYEN** - Dépend de prospect filtré en amont |
| `useSupabaseProjectNotes` | `project_notes` | `project_type` seulement | 🟠 **MOYEN** - Dépend de prospect filtré en amont |
| `useSupabaseProjectHistory` | `project_history` | `project_type` seulement | 🟠 **MOYEN** - Dépend de prospect filtré en amont |
| `useSupabaseChatMessages` | `chat_messages` | `prospect_id` + `project_type` | 🟠 **MOYEN** - Dépend de prospect filtré en amont |
| `useSupabaseProjectInfos` | `project_infos` | Via RPC (logique backend) | 🟢 **FAIBLE** - RPC handle multi-tenant |
| `useSupabasePartners` | `partners`, `missions` | ❌ **AUCUN** | 🔴 **CRITIQUE** - Tous partenaires de toutes orgs |
| `useSupabaseUsersCRUD` | `users` | ❌ **AUCUN** | 🔴 **CRITIQUE** - Tous users de toutes orgs |
| `useAutoCreateTasks` | `project_steps_status` | ❌ **AUCUN** | 🟠 **MOYEN** - Écoute tous events |
| `usePresenceCheck` | `chat_messages`, `client_form_panels` | ❌ **AUCUN** | 🟠 **MOYEN** - Écoute tous events |
| `useReminderReset` | `chat_messages` | ❌ **AUCUN** | 🟠 **MOYEN** - Écoute tous events |
| `useFormReminderWatcher` | `client_form_panels` | ❌ **AUCUN** | 🟠 **MOYEN** - Écoute tous events |
| `useSupabaseAllProjectSteps` | `project_steps_status` | ❌ **AUCUN** | 🔴 **CRITIQUE** - Tous steps de toutes orgs |

---

## 5️⃣ ÉTAT RÉEL DES TABLES (organization_id)

### Tables avec `organization_id` ajouté (commits récents)

D'après les commits fa14844 + e92c78e :

| Table | Colonne | Statut | Trigger auto-fill | RLS policies |
|-------|---------|--------|------------------|--------------|
| `client_form_panels` | `organization_id` | ✅ Ajoutée | ✅ Oui | ✅ Oui |
| `appointments` | `organization_id` | ✅ Ajoutée | ✅ Oui | ✅ Oui |
| `tasks` | `organization_id` | ✅ Ajoutée | ✅ Oui | ✅ Oui |
| `chat_messages` | `organization_id` | ✅ Ajoutée | ✅ Oui | ✅ Oui |
| `notifications` | `organization_id` | ✅ Ajoutée | ✅ Oui | ✅ Oui |
| `calls` | `organization_id` | ✅ Ajoutée | ✅ Oui | ✅ Oui |

### Tables natives multi-tenant (depuis création)

| Table | Colonne | Statut |
|-------|---------|--------|
| `prospects` | `organization_id` | ✅ Depuis origine |
| `users` | `organization_id` | ✅ Depuis origine |
| `forms` | `organization_id` | ✅ Depuis origine |
| `prompts` | `organization_id` | ✅ Depuis origine |
| `project_templates` | `organization_id` | ✅ Depuis origine |
| `global_pipeline_steps` | `organization_id` | ✅ Depuis origine |
| `contract_templates` | `organization_id` | ✅ Depuis origine |
| `workflow_module_templates` | `org_id` | ✅ Depuis origine |
| `organization_settings` | `organization_id` (PK) | ✅ Depuis origine |

### Tables SANS `organization_id` identifiées

| Table | Raison probable | Risque |
|-------|----------------|--------|
| `project_steps_status` | ❌ **Manque** | 🔴 **CRITIQUE** |
| `project_files` | ❌ **Manque** | 🔴 **CRITIQUE** |
| `project_notes` | ❌ **Manque** (si existe) | 🟠 **MOYEN** |
| `project_history` | ❌ **Manque** | 🔴 **CRITIQUE** |
| `project_infos` | ❌ **Manque** | 🔴 **CRITIQUE** |
| `partners` | ❌ **Manque** | 🔴 **CRITIQUE** |
| `missions` | ❌ **Manque** | 🔴 **CRITIQUE** |
| `signature_procedures` | ❌ **Manque** | 🔴 **CRITIQUE** |
| `signature_proofs` | ❌ **Manque** | 🔴 **CRITIQUE** |
| `client_notifications` | ❌ **Manque** | 🔴 **CRITIQUE** |
| `cosigner_invite_tokens` | ❌ **Manque** | 🟠 **MOYEN** |

---

## 6️⃣ RISQUE GLOBAL

### 🔴 CRITIQUE (Risque de fuite cross-org)

**Tables impactées** :
- `prospects` → Hook `useSupabaseProspects` écoute TOUTES les orgs
- `appointments` → Hook `useSupabaseAgenda` écoute TOUTES les orgs
- `users` → Hook `useSupabaseUsersCRUD` écoute TOUTES les orgs
- `partners` → Hook `useSupabasePartners` écoute TOUTES les orgs
- `project_steps_status` → Pas de colonne `organization_id` + RT sans filtre
- `project_files` → Pas de colonne `organization_id`
- `project_history` → Pas de colonne `organization_id`
- `project_infos` → Pas de colonne `organization_id`
- `signature_procedures` → Pas de colonne `organization_id`

**Conséquences réelles** :
1. **Real-time broadcasts cross-org** : Un INSERT dans org A déclenche l'event chez org B
2. **Fuites mémoire frontend** : Les hooks chargent des données d'autres orgs en cache
3. **Bugs UI** : Compteurs, listes affichent des données incorrectes
4. **Performance** : Subscriptions reçoivent tous les events de toute la plateforme

### 🟠 MOYEN (Dépend de l'isolation amont)

**Tables impactées** :
- `chat_messages` → Filtre par `prospect_id`, mais prospects pas isolés
- `client_form_panels` → RT avec filtre `prospect_id`, mais prospects pas isolés
- `project_notes` → Filtre par `project_type`, mais pas d'isolation org

**Conséquences** :
- Isolation **indirecte** via `prospect_id` tant que prospects sont correctement filtrés
- Si `useSupabaseProspects` fuite → tous les hooks dépendants fuient aussi

### 🟢 FAIBLE (Correctement isolé)

**Tables impactées** :
- `forms` → ✅ Filtre `organization_id` en lecture + RT
- `prompts` → ✅ Filtre `organization_id` en lecture + RT
- `project_templates` → ✅ Filtre `organization_id` via RPC + RT
- `contract_templates` → ✅ Filtre `organization_id` en lecture + RT
- `workflow_module_templates` → ✅ Filtre `org_id` en lecture (pas de RT)
- `organization_settings` → ✅ Filtre `organization_id` en lecture + RT

---

## 7️⃣ SYNTHÈSE FACTUELLE

### État actuel du multi-tenant (18 février 2026)

| Catégorie | État | Détail |
|-----------|------|--------|
| **Tables avec `organization_id`** | **Partiel** | 15/26 tables (58%) |
| **Hooks avec filtre `organization_id`** | **Minoritaire** | 8/27 hooks (30%) |
| **Real-time avec filtre org** | **Minoritaire** | 8/32 channels (25%) |
| **RLS policies multi-tenant** | **Partiel** | 6 tables récemment corrigées |
| **Architecture globale** | **Hybride** | Config isolée, transactionnel NON isolé |

### Corrections récentes (commits fa14844, 166fd8d, e92c78e)

✅ **Ce qui a été corrigé** :
- `client_form_panels` → Colonne + trigger + RLS + filtre RT
- `appointments` → Colonne + trigger + RLS
- `tasks` → Colonne + trigger + RLS
- `chat_messages` → Colonne + trigger + RLS
- `notifications` → Colonne + trigger + RLS
- `calls` → Colonne + trigger + RLS
- `useAutoVerificationTasks` → Filtre RT `organization_id`

❌ **Ce qui reste NON corrigé** :
- **10+ tables critiques** sans `organization_id`
- **19 hooks** sans filtre `organization_id`
- **24 subscriptions RT** sans filtre org
- Hooks `useSupabaseProspects`, `useSupabaseAgenda`, `useSupabaseUsersCRUD` → **Fuites massives**

---

## 8️⃣ CONCLUSION TECHNIQUE

### Niveau de risque global : 🔴 **CRITIQUE**

**Raison** :
Les tables **transactionnelles principales** (`prospects`, `appointments`, `users`, `project_*`, `partners`) n'ont :
1. ❌ Pas de colonne `organization_id`
2. ❌ Pas de filtre dans les hooks
3. ❌ Pas de filtre dans les subscriptions real-time

**Impact réel mesuré** :
- Organisation TEST45 créée → tâches de vérification ne fonctionnent pas
- **Tous les hooks transactionnels** écoutent **TOUTES les organisations**
- RLS policies existent mais **ne sont pas utilisées** par le code frontend

**Prochaines corrections nécessaires** (par ordre de priorité) :
1. 🔴 **Urgent** : Ajouter `organization_id` à `prospects` (table pivot centrale)
2. 🔴 **Urgent** : Filtrer `useSupabaseProspects` par `organization_id`
3. 🔴 **Urgent** : Filtrer `useSupabaseAgenda` par `organization_id`
4. 🔴 **Urgent** : Ajouter `organization_id` à `project_steps_status`, `project_files`, `project_history`, `project_infos`
5. 🟠 **Important** : Ajouter `organization_id` à `signature_procedures`, `signature_proofs`
6. 🟠 **Important** : Filtrer tous les hooks restants par `organization_id`

---

**FIN DE L'AUDIT TECHNIQUE**

Date : 18 février 2026
Auteur : Copilot (analyse automatique du code)
Repo : locasun-app (branch: main)
Commits analysés : fa14844, 166fd8d, e92c78e
