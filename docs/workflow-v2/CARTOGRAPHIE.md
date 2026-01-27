# 🗺️ Workflow V2 — Cartographie Complète

> **Date**: 27 janvier 2026  
> **Objectif**: Audit complet avant implémentation V2 LIVE

---

## 1️⃣ MODÈLE DE DONNÉES — PROJETS & ÉTAPES

### Tables Supabase

| Table | Fichier | Rôle |
|-------|---------|------|
| `project_templates` | `schema.sql:274-347` | **Templates de projets** (ACC, Centrale, etc.) + définition des étapes |
| `project_steps_status` | `schema.sql:356-378` | **État d'avancement** par prospect + projet (source de vérité) |
| `global_pipeline_steps` | `schema.sql:735-751` | **Colonnes du pipeline** (MARKET, ÉTUDE, OFFRE, CONTRAT, CLIENT) |

### Structure JSONB `steps` (project_templates + project_steps_status)

```json
[
  {
    "id": "step-acc-1",
    "name": "Inscription",
    "status": "pending | in_progress | completed",
    "icon": "✅",
    "descriptions": {
      "pending": "En attente",
      "done": "Terminé",
      "blocked": "Bloqué"
    },
    "globalStepId": "uuid-of-global-pipeline-step"
  }
]
```

### Hooks Supabase (lecture)

| Hook | Fichier | Usage |
|------|---------|-------|
| `useSupabaseProjectStepsStatus` | `src/hooks/useSupabaseProjectStepsStatus.js` | Steps d'un prospect (CRUD + real-time) |
| `useSupabaseAllProjectSteps` | `src/hooks/useSupabaseAllProjectSteps.js` | Tous les steps (utilisé par pipeline) |
| `useSupabaseProjectTemplates` | `src/hooks/useSupabaseProjectTemplates.js` | Templates de projets |
| `useSupabaseGlobalPipeline` | `src/hooks/useSupabaseGlobalPipeline.js` | Colonnes pipeline |

---

## 2️⃣ STATUTS DES ÉTAPES

### Constantes (définies dans ProspectDetailsAdmin.jsx:34-53)

```javascript
const STATUS_COMPLETED = 'completed';
const STATUS_CURRENT = 'in_progress';
const STATUS_PENDING = 'pending';
```

### Config UI

```javascript
const statusConfig = {
  completed: { label: 'Terminé', badge: 'bg-green-100 text-green-700' },
  in_progress: { label: 'En cours', badge: 'bg-blue-100 text-blue-700' },
  pending: { label: 'En attente', badge: 'bg-gray-100 text-gray-700' }
};
```

### Fichiers utilisant les statuts

| Fichier | Lignes | Usage |
|---------|--------|-------|
| `src/App.jsx` | 1393-1425 | `completeStepAndProceed` (mutation) |
| `src/components/admin/ProspectDetailsAdmin.jsx` | 34-53, 949-1018 | Affichage + boutons changement statut |
| `src/pages/admin/FinalPipeline.jsx` | 392-393 | Déterminer étape courante pour colonne |
| `src/components/ProjectDetails.jsx` | 452 | Côté client |

---

## 3️⃣ PAGE PROSPECT ACTUELLE (V1)

### Fichier principal
**`src/components/admin/ProspectDetailsAdmin.jsx`** — 3807 lignes

### Structure
```
ProspectDetailsAdmin
├── ChatInterface (lignes 174-800)
│   ├── useSupabaseChatMessages
│   ├── handleSendMessage
│   ├── handleSelectPrompt ← 🔥 DÉCLENCHEUR V1
│   └── useWorkflowActionTrigger
├── StepsTimeline (lignes 920-1150)
│   ├── Affiche projectSteps
│   ├── Boutons "En cours" / "Terminé" / "En attente"
│   └── Actions V1 inline
├── Onglets (Tabs)
│   ├── Activité
│   ├── Fichiers
│   ├── Formulaires
│   ├── Contrats
│   └── RDV
└── Sidebar infos prospect
```

### Imports critiques (à NE PAS importer dans V2)
- `useWorkflowActionTrigger` — cascade auto
- `useWorkflowExecutor` — exécution auto actions
- `executeContractSignatureAction` — génération contrat

---

## 4️⃣ WORKFLOW V1 — UI + MOTEUR + TRIGGERS

### 🎨 UI Configuration (Admin)

| Fichier | Rôle |
|---------|------|
| `src/pages/admin/WorkflowsCharlyPage.jsx` (973 lignes) | Éditeur de prompts/actions par étape |
| `src/pages/admin/ProfilePage.jsx:1380+` | Autre éditeur de prompts (déprécié?) |

### ⚙️ Moteur d'exécution

| Fichier | Rôle | Status |
|---------|------|--------|
| `src/hooks/useWorkflowExecutor.js` (456 lignes) | Exécution AUTO des actions workflow | ❌ DÉSACTIVÉ (commenté dans ProspectDetailsAdmin:2463) |
| `src/hooks/useWorkflowActionTrigger.js` (111 lignes) | Cascade après formulaire approuvé | ✅ ACTIF |

### 🔗 Déclencheurs cascade "étape suivante"

| Trigger | Fichier | Lignes | Description |
|---------|---------|--------|-------------|
| **Bouton manuel** | `ProspectDetailsAdmin.jsx` | 996-1018 | Dropdown "En cours/Terminé/En attente" |
| **completeStepAndProceed** | `App.jsx` | 1401-1442 | Marque current=completed, next=in_progress |
| **autoCompleteStep** | `ProspectDetailsAdmin.jsx` | 400-416 | Si `prompt.stepsConfig[n].autoCompleteStep === true` après formulaire |
| **useWorkflowActionTrigger** | `useWorkflowActionTrigger.js` | 40-95 | Écoute `client_form_panels` UPDATE → `sendNextAction()` |

### Séquence cascade V1

```mermaid
sequenceDiagram
    Admin->>Chat: handleSelectPrompt(prompt)
    Chat->>Supabase: INSERT chat_message
    Chat->>Supabase: INSERT client_form_panels
    Client->>Supabase: UPDATE client_form_panels (status=approved)
    useWorkflowActionTrigger->>Chat: sendNextAction(completedActionId)
    Chat->>handleSelectPrompt: Execute next action
    Note: Si autoCompleteStep=true
    handleSelectPrompt->>App: completeStepAndProceed()
    App->>Supabase: UPDATE project_steps_status
```

---

## 5️⃣ SERVICES D'ACTIONS

### Types d'actions (WorkflowsCharlyPage.jsx + schema.sql:698-720)

| Type | Fichier exécution | Description |
|------|-------------------|-------------|
| `none` | - | Aucune action |
| `show_form` | `ProspectDetailsAdmin.jsx:483-533` | Envoie formulaire au client |
| `start_signature` | `useWorkflowExecutor.js:157-330` | Génère PDF + procédure signature |
| `request_document` | (log only) | Demande document |
| `open_payment` | (log only) | Lien paiement |
| `partner_task` | `useWorkflowExecutor.js:375-456` | Crée mission partenaire |

### Tables liées

| Table | Usage |
|-------|-------|
| `chat_messages` | Messages chat (sender, text, formId, promptId) |
| `client_form_panels` | Formulaires envoyés (status: pending/approved/rejected) |
| `signature_procedures` | Procédures de signature électronique |
| `project_files` | Fichiers uploadés |
| `project_history` | Événements projet |

---

## 6️⃣ ROUTES ACTUELLES (App.jsx:1780-1800)

### Routes Admin

```jsx
<Route path="/admin" element={<AdminLayout />}>
  <Route index element={<FinalPipeline />} />
  <Route path="pipeline" element={<FinalPipeline />} />
  <Route path="agenda" element={<Agenda />} />
  <Route path="contacts" element={<CompleteOriginalContacts />} />
  <Route path="charly" element={<CharlyPage />} />
  <Route path="configuration-ia" element={<ConfigurationIA />} />
  <Route path="workflows-charly" element={<WorkflowsCharlyPage />} />  ← V1 CONFIG
  <Route path="projects-management" element={<ProjectsManagementPage />} />
  <Route path="forms-management" element={<FormsManagementPage />} />
  <Route path="contract-templates" element={<ContractTemplatesPage />} />
  <Route path="partners" element={<PartnersListPage />} />
  <Route path="profil" element={<ProfilePage />} />
</Route>
```

---

## 7️⃣ RECOMMANDATIONS D'ISOLATION V2

### ✅ Emplacement proposé pour V2

```
src/
├── pages/
│   └── admin/
│       └── WorkflowV2Page.jsx         ← NOUVELLE PAGE
├── components/
│   └── admin/
│       └── workflow-v2/               ← NOUVEAU DOSSIER
│           ├── WorkflowV2Container.jsx
│           ├── ModulePanel.jsx
│           ├── ModuleNavigation.jsx
│           ├── ActionButtons.jsx
│           ├── ModuleInfoCard.jsx
│           └── constants.js
├── hooks/
│   └── useWorkflowV2.js               ← NOUVEAU HOOK (READ_ONLY)
└── lib/
    └── workflowV2Config.js            ← FEATURE FLAG + CONFIG
```

### Route V2

```jsx
// Dans App.jsx, AVANT les routes wildcard
<Route path="/admin/workflow-v2/:prospectId/:projectType" element={<WorkflowV2Page />} />
```

### 🚫 Imports à NE JAMAIS faire dans V2

| Import interdit | Raison |
|-----------------|--------|
| `useWorkflowExecutor` | Cascade auto |
| `useWorkflowActionTrigger` | Cascade auto |
| `executeContractSignatureAction` | Action réelle |
| `completeStepAndProceed` (pour action) | Update status |
| `handleSelectPrompt` | Trigger V1 |

### ✅ Imports autorisés pour V2 (READ_ONLY)

| Import autorisé | Raison |
|-----------------|--------|
| `useSupabaseProjectStepsStatus` | Lecture steps |
| `useSupabaseChatMessages` | Lecture messages |
| `useSupabaseClientFormPanels` | Lecture formulaires |
| `useSupabaseProjectFiles` | Lecture fichiers |
| `useSupabaseProjectHistory` | Lecture historique |
| Données depuis `AppContext` | Déjà chargées |

---

## 8️⃣ FEATURE FLAG

```javascript
// src/lib/workflowV2Config.js
export const WORKFLOW_V2_CONFIG = {
  enabled: true,              // Active/désactive V2
  readOnlyMode: true,         // Phase 1: lecture seule
  mockProceed: true,          // PROCEED = console.log, pas d'action
  allowedUsers: ['*'],        // Liste d'emails ou '*' pour tous
};
```

---

## 9️⃣ CHECKLIST ISOLATION

- [ ] V2 = nouveau dossier `workflow-v2/`
- [ ] V2 = nouvelle route `/admin/workflow-v2/:prospectId/:projectType`
- [ ] Aucun import de `useWorkflowExecutor` ou `useWorkflowActionTrigger`
- [ ] Aucun appel à `completeStepAndProceed` (phase 1)
- [ ] Feature flag vérifié avant rendu
- [ ] PROCEED = mock (console.log) en phase 1
- [ ] Données lues via hooks existants (pas de nouveau fetch)
