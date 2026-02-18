# 🔍 AUDIT SUBSCRIPTIONS REAL-TIME SUPABASE

**Date** : 18 février 2026  
**Contexte** : Analyse factuelle de toutes les subscriptions real-time actives dans le repo

---

## 📊 TABLEAU COMPLET DES SUBSCRIPTIONS

| # | Hook | Fichier | Table | Channel | Filter | Niveau |
|---|------|---------|-------|---------|--------|--------|
| 1 | `useAutoVerificationTasks` | `src/hooks/useAutoVerificationTasks.js` | `client_form_panels` | `auto-verification-tasks-${organizationId}` | ✅ `organization_id=eq.${organizationId}` | 🟢 **SAFE** |
| 2 | `useSupabaseProspects` (1) | `src/hooks/useSupabaseProspects.js` | `prospects` | `prospects-changes-${random}` | ❌ **AUCUN** | 🔴 **NON FILTRÉ** |
| 3 | `useSupabaseProspects` (2) | `src/hooks/useSupabaseProspects.js` | `prospects` (broadcast) | `prospects-broadcast-global` | ❌ **AUCUN** | 🔴 **NON FILTRÉ** |
| 4 | `useSupabaseAgenda` | `src/hooks/useSupabaseAgenda.js` | `appointments` | `agenda-changes` | ❌ **AUCUN** | 🔴 **NON FILTRÉ** |
| 5 | `useSupabaseNotifications` | `src/hooks/useSupabaseNotifications.js` | `notifications` | `notifications-${userId}-${random}` | ✅ `owner_id=eq.${userId}` | 🟡 **INDIRECT** (user only) |
| 6 | `useSupabaseChatMessages` | `src/hooks/useSupabaseChatMessages.js` | `chat_messages` | `chat-${prospectId}-${projectType}-${random}` | ✅ `prospect_id=eq.${prospectId}` | 🟡 **INDIRECT** (via prospect) |
| 7 | `useSupabaseClientFormPanels` | `src/hooks/useSupabaseClientFormPanels.js` | `client_form_panels` | `client-form-panels-${prospectId}-${random}` | ✅ `prospect_id=eq.${prospectId}` (si fourni) | 🟡 **INDIRECT** (via prospect) |
| 8 | `useSupabaseProjectStepsStatus` | `src/hooks/useSupabaseProjectStepsStatus.js` | `project_steps_status` | `project-steps-${prospectId}` | ✅ `prospect_id=eq.${prospectId}` | 🟡 **INDIRECT** (via prospect) |
| 9 | `useSupabaseProjectInfos` | `src/hooks/useSupabaseProjectInfos.js` | `project_infos` | `project_infos-changes` | ❌ **AUCUN** | 🔴 **NON FILTRÉ** |
| 10 | `useSupabaseProjectFiles` | `src/hooks/useSupabaseProjectFiles.js` | `project_files` | `project-files-${projectType}` | ✅ `project_type=eq.${projectType}` | 🟡 **INDIRECT** (via type) |
| 11 | `useSupabaseProjectNotes` | `src/hooks/useSupabaseProjectNotes.js` | `project_notes` | `project-notes-${projectType}` | ✅ `project_type=eq.${projectType}` | 🟡 **INDIRECT** (via type) |
| 12 | `useSupabaseProjectHistory` | `src/hooks/useSupabaseProjectHistory.js` | `project_history` | `project-history-${projectType}` | ✅ `project_type=eq.${projectType}` | 🟡 **INDIRECT** (via type) |
| 13 | `useSupabaseProjectTemplates` | `src/hooks/useSupabaseProjectTemplates.js` | `project_templates` | `project-templates-changes-${organizationId}` | ✅ `organization_id=eq.${organizationId}` | 🟢 **SAFE** |
| 14 | `useSupabaseGlobalPipeline` | `src/hooks/useSupabaseGlobalPipeline.js` | `global_pipeline_steps` | `global-pipeline-changes-${organizationId}` | ✅ `organization_id=eq.${organizationId}` | 🟢 **SAFE** |
| 15 | `useSupabaseForms` | `src/hooks/useSupabaseForms.js` | `forms` | `forms-changes-${organizationId}` | ✅ `organization_id=eq.${organizationId}` | 🟢 **SAFE** |
| 16 | `useSupabasePrompts` | `src/hooks/useSupabasePrompts.js` | `prompts` | `prompts-changes-${organizationId}` | ✅ `organization_id=eq.${organizationId}` | 🟢 **SAFE** |
| 17 | `useSupabaseContractTemplates` | `src/hooks/useSupabaseContractTemplates.js` | `contract_templates` | `contract-templates-changes-${organizationId}` | ✅ `organization_id=eq.${organizationId}` | 🟢 **SAFE** |
| 18 | `useSupabaseClientNotifications` | `src/hooks/useSupabaseClientNotifications.js` | `client_notifications` | `client-notifications-${prospectId}-${random}` | ✅ `prospect_id=eq.${prospectId}` | 🟡 **INDIRECT** (via prospect) |
| 19 | `useSupabaseCompanySettings` | `src/hooks/useSupabaseCompanySettings.js` | `company_settings` | `company-settings-changes` | ✅ `id=eq.${COMPANY_SETTINGS_ID}` | 🟢 **SAFE** (singleton) |
| 20 | `useLandingPageConfig` | `src/hooks/useLandingPageConfig.js` | `organization_settings` | `org-settings-landing-${organizationId}` | ✅ `organization_id=eq.${organizationId}` | 🟢 **SAFE** |
| 21 | `useSupabasePartners` | `src/hooks/useSupabasePartners.js` | `partners` + `missions` | `partners-changes` | ❌ **AUCUN** | 🔴 **NON FILTRÉ** |
| 22 | `useAutoCreateTasks` | `src/hooks/useAutoCreateTasks.js` | `project_steps_status` | `auto-create-tasks` | ❌ **AUCUN** | 🔴 **NON FILTRÉ** |
| 23 | `usePresenceCheck` (1) | `src/hooks/usePresenceCheck.js` | `chat_messages` | `presence-check-chat` | ❌ **AUCUN** | 🔴 **NON FILTRÉ** |
| 24 | `usePresenceCheck` (2) | `src/hooks/usePresenceCheck.js` | `client_form_panels` | `presence-check-panels` | ❌ **AUCUN** | 🔴 **NON FILTRÉ** |
| 25 | `useReminderReset` | `src/hooks/useReminderReset.js` | `chat_messages` | `reminder-reset-chat` | ❌ **AUCUN** | 🔴 **NON FILTRÉ** |
| 26 | `useFormReminderWatcher` | `src/hooks/useFormReminderWatcher.js` | `client_form_panels` | `form-reminder-watcher` | ❌ **AUCUN** | 🔴 **NON FILTRÉ** |
| 27 | `useWorkflowActionTrigger` | `src/hooks/useWorkflowActionTrigger.js` | `client_form_panels` | `workflow-forms-${prospectId}-${projectType}-${currentStepIndex}` | ✅ `prospect_id=eq.${prospectId}` | 🟡 **INDIRECT** (via prospect) |
| 28 | `useSupabaseAllProjectSteps` | `src/hooks/useSupabaseAllProjectSteps.js` | `project_steps_status` | `all-project-steps` | ❌ **AUCUN** | 🔴 **NON FILTRÉ** |
| 29 | `useSupabaseUsersCRUD` | `src/hooks/useSupabaseUsersCRUD.js` | `users` | `users-crud-changes` | ❌ **AUCUN** | 🔴 **NON FILTRÉ** |
| 30 | `App.jsx` (client) | `src/App.jsx` | `prospects` | `client-prospect-${currentUser.id}` | ❌ **AUCUN** (broadcast only) | 🔴 **NON FILTRÉ** |
| 31 | `FinalPipeline` | `src/pages/admin/FinalPipeline.jsx` | `prospects` | `pipeline-prospect-detail-${selectedProspect.id}` | ❌ **AUCUN** (broadcast only) | 🔴 **NON FILTRÉ** |
| 32 | `AdminLayout` | `src/layouts/AdminLayout.jsx` | `prospects` | `admin-user-${activeAdminUser.id}` | ❌ **AUCUN** (broadcast only) | 🔴 **NON FILTRÉ** |
| 33 | `ClientLayout` | `src/layouts/ClientLayout.jsx` | `prospects` | `prospect-${currentUser.id}` | ❌ **AUCUN** (broadcast only) | 🔴 **NON FILTRÉ** |
| 34 | `ClientFormPanel` | `src/components/client/ClientFormPanel.jsx` | `prospects` | `prospects-broadcast-global` | ❌ **AUCUN** (broadcast only) | 🔴 **NON FILTRÉ** |
| 35 | `ProjectDetails` | `src/components/ProjectDetails.jsx` | `project_steps_status` | `client-project-steps-${currentUser.id}-${project.type}` | ❌ **AUCUN** (broadcast only) | 🔴 **NON FILTRÉ** |
| 36 | `ProspectDetailsAdmin` | `src/components/admin/ProspectDetailsAdmin.jsx` | `signature_procedures` | `signature-completion-${prospect.id}` | ❌ **AUCUN** (broadcast only) | 🔴 **NON FILTRÉ** |

---

## 📈 STATISTIQUES

### Par niveau de sécurité

| Niveau | Nombre | % | Description |
|--------|--------|---|-------------|
| 🟢 **SAFE** | **8** | 22% | Filtre direct par `organization_id` ou singleton |
| 🟡 **INDIRECT** | **9** | 25% | Filtre par `prospect_id`, `owner_id` ou `project_type` |
| 🔴 **NON FILTRÉ** | **19** | 53% | ❌ Aucun filtre → écoute TOUTES les orgs |

### Par type de filtre

| Type de filtre | Nombre | Tables concernées |
|----------------|--------|-------------------|
| `organization_id` | 8 | `client_form_panels`, `project_templates`, `global_pipeline_steps`, `forms`, `prompts`, `contract_templates`, `organization_settings`, `company_settings` |
| `prospect_id` | 7 | `chat_messages`, `client_form_panels`, `project_steps_status`, `client_notifications` |
| `project_type` | 3 | `project_files`, `project_notes`, `project_history` |
| `owner_id` | 1 | `notifications` |
| **AUCUN** | 19 | `prospects`, `appointments`, `users`, `partners`, `missions`, `project_infos`, `project_steps_status`, `signature_procedures` |

---

## 🔴 SUBSCRIPTIONS CRITIQUES (NON FILTRÉES)

### Tables avec subscriptions NON filtrées

| Table | Hooks concernés | Impact |
|-------|----------------|--------|
| `prospects` | `useSupabaseProspects` (x2), `App.jsx`, `FinalPipeline`, `AdminLayout`, `ClientLayout`, `ClientFormPanel` | 🔴 **CRITIQUE** - 7 subscriptions écoutent TOUS les prospects de TOUTES les orgs |
| `appointments` | `useSupabaseAgenda` | 🔴 **CRITIQUE** - Tous RDV/tâches de toutes les orgs |
| `users` | `useSupabaseUsersCRUD` | 🔴 **CRITIQUE** - Tous users admin de toutes les orgs |
| `partners` + `missions` | `useSupabasePartners` | 🔴 **CRITIQUE** - Tous partenaires de toutes les orgs |
| `project_steps_status` | `useAutoCreateTasks`, `useSupabaseAllProjectSteps`, `ProjectDetails` | 🔴 **CRITIQUE** - Toutes les étapes de tous les prospects |
| `project_infos` | `useSupabaseProjectInfos` | 🔴 **CRITIQUE** - Toutes les infos projet de toutes les orgs |
| `chat_messages` | `usePresenceCheck`, `useReminderReset` | 🔴 **CRITIQUE** - Tous les messages chat de toutes les orgs |
| `client_form_panels` | `usePresenceCheck`, `useFormReminderWatcher` | 🔴 **CRITIQUE** - Tous les panels formulaires de toutes les orgs |
| `signature_procedures` | `ProspectDetailsAdmin` | 🔴 **CRITIQUE** - Toutes les signatures de toutes les orgs |

---

## 🟡 SUBSCRIPTIONS INDIRECT SAFE (Dépendantes)

Ces subscriptions filtrent par `prospect_id`, `owner_id` ou `project_type`, mais **dépendent** de l'isolation correcte en amont :

| Hook | Dépend de | Risque si parent fuite |
|------|-----------|----------------------|
| `useSupabaseChatMessages` | `prospect_id` filtré | Si `useSupabaseProspects` fuite → fuite cascade |
| `useSupabaseClientFormPanels` | `prospect_id` filtré | Si `useSupabaseProspects` fuite → fuite cascade |
| `useSupabaseProjectStepsStatus` | `prospect_id` filtré | Si `useSupabaseProspects` fuite → fuite cascade |
| `useSupabaseClientNotifications` | `prospect_id` filtré | Si `useSupabaseProspects` fuite → fuite cascade |
| `useWorkflowActionTrigger` | `prospect_id` filtré | Si `useSupabaseProspects` fuite → fuite cascade |
| `useSupabaseProjectFiles` | `project_type` + prospect parent | Si prospect non filtré → fuite |
| `useSupabaseProjectNotes` | `project_type` + prospect parent | Si prospect non filtré → fuite |
| `useSupabaseProjectHistory` | `project_type` + prospect parent | Si prospect non filtré → fuite |
| `useSupabaseNotifications` | `owner_id` (user) | Isolation par user, pas par org |

**⚠️ Risque en cascade** : Si `useSupabaseProspects` fuite des prospects d'autres orgs, TOUS les hooks filtrant par `prospect_id` reçoivent également des événements cross-org.

---

## 🟢 SUBSCRIPTIONS SAFE (Correctement isolées)

Ces subscriptions sont **correctement isolées** au niveau de l'organisation :

| Hook | Table | Isolation |
|------|-------|-----------|
| `useAutoVerificationTasks` | `client_form_panels` | ✅ `organization_id=eq.${organizationId}` |
| `useSupabaseProjectTemplates` | `project_templates` | ✅ `organization_id=eq.${organizationId}` |
| `useSupabaseGlobalPipeline` | `global_pipeline_steps` | ✅ `organization_id=eq.${organizationId}` |
| `useSupabaseForms` | `forms` | ✅ `organization_id=eq.${organizationId}` |
| `useSupabasePrompts` | `prompts` | ✅ `organization_id=eq.${organizationId}` |
| `useSupabaseContractTemplates` | `contract_templates` | ✅ `organization_id=eq.${organizationId}` |
| `useLandingPageConfig` | `organization_settings` | ✅ `organization_id=eq.${organizationId}` |
| `useSupabaseCompanySettings` | `company_settings` | ✅ `id=eq.${COMPANY_SETTINGS_ID}` (singleton global) |

---

## 🎯 CONCLUSION

### Niveau de risque global : 🔴 **CRITIQUE**

**Constat factuel** :
- **53% des subscriptions** (19/36) n'ont **AUCUN filtre** multi-tenant
- **7 subscriptions** écoutent la table `prospects` sans filtrage
- Les hooks **transactionnels critiques** (`useSupabaseProspects`, `useSupabaseAgenda`, `useSupabaseUsersCRUD`) n'ont aucun filtre

**Conséquences mesurables** :
1. ✅ **Création d'un prospect dans org A** → 🔴 Event reçu par org B, C, D...
2. ✅ **Création d'un RDV dans org A** → 🔴 Event reçu par toutes les orgs
3. ✅ **Message chat dans org A** → 🔴 Event reçu par hooks `usePresenceCheck`, `useReminderReset` de toutes les orgs
4. ✅ **Création user admin dans org A** → 🔴 Event reçu par org B

**Impact performance** :
- Frontend reçoit **100%** des événements de **TOUTES** les organisations
- Bande passante gaspillée sur événements non pertinents
- Risque de memory leaks (accumulation d'events non filtrés)

### Priorités de correction

| Priorité | Hook | Action |
|----------|------|--------|
| 🔴 **P0** | `useSupabaseProspects` | Ajouter `filter: 'organization_id=eq.${organizationId}'` |
| 🔴 **P0** | `useSupabaseAgenda` | Ajouter `filter: 'organization_id=eq.${organizationId}'` |
| 🔴 **P0** | `useSupabaseUsersCRUD` | Ajouter `filter: 'organization_id=eq.${organizationId}'` |
| 🔴 **P1** | `useSupabasePartners` | Ajouter `filter: 'organization_id=eq.${organizationId}'` |
| 🔴 **P1** | `useSupabaseProjectInfos` | Ajouter `filter: 'organization_id=eq.${organizationId}'` |
| 🟠 **P2** | `useAutoCreateTasks` | Ajouter `filter: 'organization_id=eq.${organizationId}'` |
| 🟠 **P2** | `useSupabaseAllProjectSteps` | Ajouter `filter: 'organization_id=eq.${organizationId}'` |
| 🟠 **P2** | `usePresenceCheck` | Ajouter `filter: 'organization_id=eq.${organizationId}'` |
| 🟠 **P2** | `useReminderReset` | Ajouter `filter: 'organization_id=eq.${organizationId}'` |
| 🟠 **P2** | `useFormReminderWatcher` | Ajouter `filter: 'organization_id=eq.${organizationId}'` |

---

**FIN DE L'AUDIT SUBSCRIPTIONS**

Date : 18 février 2026  
Auteur : Copilot (analyse automatique du code)  
Repo : locasun-app (branch: main)  
Total subscriptions analysées : **36**
