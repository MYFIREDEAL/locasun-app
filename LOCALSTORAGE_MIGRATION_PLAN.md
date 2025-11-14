# Audit LocalStorage → Supabase Migration

## ✅ Déjà migrés vers Supabase

| localStorage | Table Supabase | Status |
|-------------|----------------|--------|
| `evatime_company_logo` | `company_settings.logo_url` | ✅ Migré + Real-time |
| `evatime_form_contact_config` | `company_settings.settings.form_contact_config` | ✅ Migré + Real-time |
| `evatime_prospects` | `prospects` | ✅ Dans Supabase (hook useSupabaseProspects) |
| `evatime_appointments` | `appointments` | ✅ Dans Supabase (hook useSupabaseAgenda) |
| `evatime_calls` | `appointments` (type='call') | ✅ Dans Supabase |
| `evatime_tasks` | `appointments` (type='task') | ✅ Dans Supabase |
| `activeAdminUser` | `users` | ✅ Dans Supabase |
| `currentUser` | `prospects` (client) | ✅ Dans Supabase |

## 🔄 À migrer PRIORITÉ HAUTE

### 1. `GLOBAL_PIPELINE_STORAGE_KEY` (evatime_global_pipeline_steps)
**Destination**: `company_settings.settings.global_pipeline_steps`

**Structure actuelle** (localStorage):
```javascript
[
  {
    id: "uuid",
    name: "Centrale",
    steps: [
      { id: "uuid", name: "Contact initial", status: "completed", ... },
      { id: "uuid", name: "RDV technique", status: "in-progress", ... }
    ]
  },
  {
    id: "uuid", 
    name: "ACC",
    steps: [...]
  }
]
```

**Action**: 
- Ajouter `updateGlobalPipelineSteps()` dans `useSupabaseCompanySettings`
- Migrer au démarrage
- Real-time sync

**Fichiers concernés**:
- `src/App.jsx` (lignes 504-525, 641-647)
- `src/pages/admin/ProfilePage.jsx` (gestion des pipelines)

### 2. `evatime_project_steps_status`
**Destination**: Table `project_steps_status` (DÉJÀ EXISTE!)

**Structure actuelle** (localStorage):
```javascript
{
  "prospect-123_Centrale": {
    steps: [
      { id: "uuid", completed: true, completedAt: "..." },
      { id: "uuid", completed: false }
    ]
  }
}
```

**Structure Supabase** (table existante):
```sql
project_steps_status (
  id UUID,
  prospect_id UUID,
  project_type TEXT,  -- "Centrale", "ACC", etc.
  steps JSONB,       -- Array d'objets steps
  created_at, updated_at
)
```

**Action**:
- Créer hook `useSupabaseProjectSteps.js`
- Méthodes: `getProjectSteps()`, `updateProjectSteps()`, `completeStepAndProceed()`
- Migrer localStorage → Supabase
- Real-time sync

**Fichiers concernés**:
- `src/App.jsx` (lignes 369-370, fonctions getProjectSteps/updateProjectSteps)

## ⚠️ À analyser (possiblement à migrer)

### 3. `evatime_projects_data`
**Usage**: Cache des données projets

**Options**:
- Option A: Garder en cache localStorage (données éphémères)
- Option B: Migrer vers Supabase si besoin de persistence

**Fichiers**: `src/App.jsx` (lignes 256-271)

### 4. `evatime_chat_messages`
**Destination potentielle**: Table `messages` (à créer)

**Complexité**: HAUTE (beaucoup de messages, structure complexe)

**Recommandation**: Migration future (pas urgent)

### 5. `evatime_notifications` + `evatime_client_notifications`
**Destination potentielle**: Table `notifications` (à créer)

**Recommandation**: Migration future (système de notif à revoir)

### 6. `evatime_forms` + `evatime_prompts`
**Destination potentielle**: Tables `forms` et `prompts` (EXISTENT déjà dans schema.sql !)

**Action**: Vérifier si déjà utilisées, sinon migrer

## 📋 Plan d'action recommandé

### Phase 1 (Aujourd'hui) : Pipelines Globaux
1. ✅ Vérifier SQL : `audit_localstorage_pipeline.sql`
2. ⚙️ Migrer `globalPipelineSteps` → `company_settings.settings.global_pipeline_steps`
3. ⚙️ Ajouter real-time sync

### Phase 2 (À faire) : Étapes par projet
1. ⚙️ Créer `useSupabaseProjectSteps.js`
2. ⚙️ Migrer `evatime_project_steps_status` → table `project_steps_status`
3. ⚙️ Real-time sync pour les étapes

### Phase 3 (Optionnel) : Forms & Prompts
1. Vérifier tables `forms` et `prompts` dans Supabase
2. Migrer si nécessaire
3. Real-time sync

### Phase 4 (Future) : Chat & Notifications
1. Créer tables dédiées
2. Architecture messaging
3. Migration progressive

## 🎯 Bénéfices attendus

- ✅ Plus de localStorage (sauf cache éphémère)
- ✅ Données centralisées
- ✅ Real-time sync partout
- ✅ Persistence garantie
- ✅ Collaboration temps réel
