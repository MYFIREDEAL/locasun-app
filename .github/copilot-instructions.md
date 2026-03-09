# Copilot Instructions for Locasun Supabase App

## ⚡ PREMIÈRE CHOSE À FAIRE
**Lis `PROGRESS_LOG.md`** à la racine du projet pour connaître l'état actuel de la progression (features faites, bugs fixés, prochains sujets).

## � RÈGLE D'ANALYSE OBLIGATOIRE (AVANT TOUTE MODIFICATION)

**Quand l'utilisateur demande une analyse ou une nouvelle feature sur un système existant :**

1. **Tracer AU MOINS UN flux réel de bout en bout** avec un exemple concret
   - Pas de théorie. Prendre un cas : "Le prospect X a 2 actions (FORM + SIGNATURE). L'admin clique sur le robot. Que se passe-t-il exactement dans le code ?"
   - Suivre le flux dans les fichiers : composant UI → builder → exécution → complétion → chaînage

2. **Identifier le modèle d'exécution AVANT de lister les risques**
   - Séquentiel ? Parallèle ? Événementiel ?
   - Chercher les guards, les boucles, les `findIndex`, les statuts (`pending`, `in_progress`, `completed`)
   - Vérifier : une seule chose active à la fois, ou plusieurs ?

3. **Ne JAMAIS théoriser sur des risques sans preuve dans le code**
   - ❌ "Il pourrait y avoir un conflit si..." → sans avoir vérifié
   - ✅ "Le code ligne X fait Y, donc ce risque n'existe pas" → avec preuve

4. **Résumer le modèle d'exécution en premier** dans toute analyse
   - Avant les fichiers impactés, avant la stratégie, avant les risques
   - Exemple : "Les actions d'une étape sont séquentielles. Une seule active à la fois. Le chaînage est automatique via subSteps."

> **Pourquoi** : Une erreur sur le modèle d'exécution se propage dans TOUTE l'analyse (risques inventés, stratégie sur-complexe, piéges inexistants).

## �📝 MISE À JOUR DE LA PROGRESSION
- **Quand l'utilisateur dit** "met à jour", "update progress", "on a bien avancé", ou en fin de session après du travail significatif → **mettre à jour `PROGRESS_LOG.md`** avec les features ajoutées, bugs fixés, migrations SQL exécutées, et prochains sujets.
- **Proposer proactivement** de mettre à jour `PROGRESS_LOG.md` après 3+ features/fixes dans une même session.
- **Format** : Ajouter une nouvelle section datée en haut du fichier (sous le header), avec les catégories ✅ Features, 🐛 Bugs fixés, 🗄️ Migrations SQL, 🔜 Prochains sujets.
- **Commit** le fichier mis à jour avec le message `docs: update PROGRESS_LOG.md`.

## Overview
React + Vite + Tailwind CSS + **Supabase** application for energy project management (solar, ACC, autonomy). Dual-user system: **Admins** (pipeline/CRM) and **Clients** (project tracking). Real-time sync with Supabase for prospects, appointments, and chat.

## Architecture

### **Critical: Dual-User System**
- **Admin Users** (`auth.users` + `public.users`): Access `/admin/*` routes (Pipeline, Agenda, Contacts, Charly AI, Profile)
  - Roles: `Global Admin`, `Manager`, `Commercial` (hierarchical permissions via RLS)
  - Stored in `public.users` with `user_id` linking to `auth.users`
- **Client Users** (`auth.users` + `public.prospects`): Access `/dashboard/*` routes (Project Dashboard, Parrainage, Profile)
  - Stored in `public.prospects` with `user_id` linking to `auth.users`
  - Can only see their own data (RLS enforced)

**Authentication Flow**: Check `supabase/AUTH_LOGIC.md` for complete login/signup logic. Always distinguish user type on auth by querying both `users` and `prospects` tables.

### **Directory Structure**
- **src/hooks/**: Custom Supabase hooks are the **data access layer**
  - `useSupabaseProspects.js`: CRUD + real-time for prospects
  - `useSupabaseAgenda.js`: CRUD + real-time for appointments/calls/tasks
  - `useSupabaseUser.js`: Get current authenticated user's UUID
  - `useSupabaseUsers.js`: List all admin users (for assignment/filtering)
  - **Pattern**: Hooks handle data transformation between Supabase snake_case and app camelCase (e.g., `start_time` ↔ `start`)
- **src/lib/supabase.js**: Supabase client initialization (requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`)
- **src/components/**: Role-separated (`admin/`, `client/`, shared)
- **src/pages/**: Route components split by `admin/` and `client/` folders
- **src/layouts/**: `AdminLayout.jsx` and `ClientLayout.jsx` wrap respective routes
- **supabase/**: **Critical documentation** - read before modifying database
  - `schema.sql`: Full database schema with RLS policies
  - `AUTH_LOGIC.md`: Admin vs Client authentication architecture
  - `DYNAMIC_FORMS_SYSTEM.md`: Form creation/submission via chat
  - `PROMPTS_AND_AUTOMATION.md`: Charly AI automation system
  - `ACCESS_CONTROL_SYSTEM.md`: Granular user access rights
  - `APPOINTMENT_RESCHEDULING.md`: Drag-and-drop appointment system

## Developer Workflows
- **Start dev**: `npm run dev` (requires `.env` with Supabase keys)
- **Build**: `npm run build`
- **Deploy**: `npm run deploy` (GitHub Pages via `gh-pages`)
- **Database**: Execute SQL scripts in Supabase Dashboard SQL Editor (see `supabase/DEPLOYMENT_GUIDE.md`)

## Critical Patterns

### **Data Transformation (Supabase ↔ App)**
Always transform between Supabase snake_case and app camelCase in hooks:
```javascript
// Supabase → App
const transformed = data.map(apt => ({
  id: apt.id,
  start: apt.start_time,  // NOT startTime
  end: apt.end_time,      // NOT endTime
  contactId: apt.contact_id
}))

// App → Supabase
const dbUpdates = {
  start_time: updates.startTime,
  end_time: updates.endTime,
  contact_id: updates.contactId
}
```

### **Real-Time Subscriptions**
All Supabase hooks use real-time channels. Pattern in `useSupabaseProspects.js`:
```javascript
const channel = supabase
  .channel('prospects-changes')
  .on('postgres_changes', { event: '*', table: 'prospects' }, (payload) => {
    // Handle INSERT/UPDATE/DELETE
  })
  .subscribe()

return () => supabase.removeChannel(channel)
```

### **Authentication & RLS**
- Always use `supabase.auth.getUser()` to get authenticated user
- Query `public.users` table to get user's role and permissions
- RLS policies filter data automatically - **never bypass with service role key in frontend**
- Example: Commercial users only see prospects where `owner_id = auth.uid()` or managed team members

### **State Management**
- **No Redux/Zustand**: Global state in `App.jsx` via `AppContext` (legacy localStorage migration in progress)
- **Supabase hooks are source of truth** for prospects/appointments/tasks
- `App.jsx` maintains complex state (projectStepsStatus, chatMessages, notifications) - gradually migrating to Supabase

### **Project-Specific Concepts**
- **Projects/Tags**: Each prospect has multiple project types (`ACC`, `Centrale`, `Investissement`, etc.) stored in `tags` array
- **Pipeline Steps**: Dynamic per-project steps stored in `project_steps_status` table
- **Chat System**: Messages linked to `prospect_id` + `project_type`, supports form submissions
- **Forms**: Admins create dynamic forms, send via chat, clients fill them, admins approve/reject (`client_form_panels` table)
- **Charly AI**: Automation system (prompts) that triggers actions based on project step completion

## Integration Points
- **Supabase**: All data persistence and real-time sync (see `supabase/README.md`)
- **Radix UI**: All `ui/` components use Radix primitives (`@radix-ui/react-*`)
- **@dnd-kit**: Drag-and-drop for pipeline cards and appointment rescheduling
- **date-fns**: Date manipulation (appointments, tasks)
- **Vite Plugins**: Custom iframe route restoration and visual editor (in `plugins/`)

## Common Pitfalls
- **Don't mix localStorage and Supabase**: Check if feature uses Supabase hooks before adding localStorage logic
- **UUID validation**: Ensure `contact_id`/`owner_id` are valid UUIDs before inserting (Supabase rejects invalid formats)
- **Real-time race conditions**: Don't manually update state after Supabase mutations - let real-time events handle it
- **Date formats**: Use ISO 8601 strings for Supabase (`new Date().toISOString()`)
- **RLS conflicts**: If queries fail with "permission denied", check RLS policies in `schema.sql`

## Key Files to Reference
- **Data layer**: `src/hooks/useSupabase*.js`
- **Auth logic**: `supabase/AUTH_LOGIC.md`
- **Database schema**: `supabase/schema.sql`
- **Admin pages**: `src/pages/admin/FinalPipeline.jsx` (pipeline), `Agenda.jsx` (calendar)
- **Client pages**: `src/pages/client/ClientDashboardPage.jsx`

## 🆕 Workflow V2 (état réel)

### ⚠️ IMPORTANT : Workflow V2 = UNE SEULE PAGE
**Quand on parle de "Workflow V2", on parle UNIQUEMENT de** :
```
http://localhost:5173/admin/workflow-v2-config
```
- **Cockpit de configuration globale** pour TOUS les clients
- Configure une fois les modules par project_type (centrale, ACC, piscine...)
- S'applique automatiquement à tous les prospects du même type

### Architecture V1 vs V2
- **V1 (exécution)**: Actions et exécutions dans `WorkflowsCharlyPage.jsx` + `useWorkflowExecutor.js`
  - Le "petit robot" est déclenché depuis `ProspectDetailsAdmin.jsx`
  - Exécute directement les actions (formulaires, signatures, etc.)
- **V2 (cockpit)**: Config + génération d'ActionOrder + simulation + exécution sous feature flag
  - Ne modifie PAS V1, génère des ordres que V1 exécute
  - ⚠️ La route `/admin/workflow-v2/:prospectId/:projectType` existe dans le code mais N'EST PLUS UTILISÉE (ancien design par prospect)

### Fichiers clés V2
| Fichier | Rôle |
|---------|------|
| `src/pages/admin/WorkflowV2ConfigPage.jsx` | ⭐ **LA PAGE WORKFLOW V2** (cockpit config globale) |
| `src/lib/moduleAIConfig.js` | Config IA par module (objectif, instructions, actionConfig) |
| `src/lib/catalogueV2.js` | Catalogue read-only (forms, templates, targets, modes) |
| `src/lib/actionOrderV2.js` | Build ActionOrder JSON (simulation pure) |
| `src/lib/executeActionOrderV2.js` | Bridge V2→V1 avec guards + feature flag |
| `src/lib/workflowV2Config.js` | Feature flags (READ_ONLY, EXECUTION_FROM_V2) |
| `src/components/admin/workflow-v2/ActionOrderSimulator.jsx` | UI simulation + exécution |
| `src/components/admin/workflow-v2/ModuleConfigTab.jsx` | Éditeur UI config IA |
| `src/hooks/useSupabaseWorkflowModuleTemplates.js` | Persistance Supabase des configs |

### Page obsolète (code legacy)
| Fichier | Statut |
|---------|--------|
| `src/pages/admin/WorkflowV2Page.jsx` | ⚠️ OBSOLÈTE - Config par prospect (ancien design, plus utilisé) |
| `src/hooks/useWorkflowV2.js` | ⚠️ OBSOLÈTE - Hook pour page WorkflowV2Page |

### Persistance
| Phase | Mode | Détail |
|-------|------|--------|
| Phase 3 (actuel) | **Mémoire** | Config perdue au refresh |
| Phase 9 (futur) | **Supabase** | Table `workflow_module_templates` par `org_id` + `project_type` + `module_id` |

### Feature Flags (`workflowV2Config.js`)
- `READ_ONLY: true` → Aucune écriture DB depuis V2
- `EXECUTION_FROM_V2: false` → Bouton "Exécuter" désactivé (simulation uniquement)

### 🆕 Fonctionnalités Partenaires (19 fév 2026)

#### ✅ Ce qui fonctionne maintenant
| Fonctionnalité | Statut | Détail |
|----------------|--------|--------|
| **Création mission partenaire** | ✅ | Workflow V2 → target PARTENAIRE → Mission créée |
| **Envoi formulaire au partenaire** | ✅ | Mission avec `form_ids` → Partenaire voit formulaire |
| **Remplissage formulaire** | ✅ | Partenaire remplit → `form_data` sauvegardé dans `client_form_panels` |
| **Visualisation admin** | ✅ | Admin voit réponses dans "Formulaires soumis" |
| **Validation/Refus** | ✅ | Admin peut Approuver ou Refuser le formulaire |

#### Flow complet Partenaire + Formulaire
```
1. Admin config Workflow V2 → Module X → Target: PARTENAIRE + Formulaire
2. Workflow V1 crée mission + client_form_panel (filled_by_role='partner')
3. Partenaire ouvre mission → voit formulaire → remplit → soumet
4. form_data sauvegardé dans client_form_panels.form_data
5. Admin voit dans ProspectDetailsAdmin → Section "Formulaires soumis"
6. Admin valide ou refuse
```

#### Fichiers clés Partenaires
| Fichier | Rôle |
|---------|------|
| `src/pages/partner/PartnerMissionDetailPage.jsx` | Page partenaire avec formulaires |
| `src/hooks/useSupabaseClientFormPanels.js` | Hook lecture/écriture panels (lecture directe `.from()`) |
| `src/components/admin/ProspectDetailsAdmin.jsx` | Admin voit `panel.formData` si `filledByRole='partner'` |

#### Colonnes importantes `client_form_panels`
- `filled_by_role` : `'client'` ou `'partner'` (qui a rempli)
- `form_data` : JSONB avec les réponses du formulaire
- `status` : `'pending'`, `'submitted'`, `'approved'`, `'rejected'`

## 🔔 Système de Relances Automatiques

### Architecture
Le système de relances fonctionne en **3 couches** :

| Couche | Fichier | Déclencheur | Horaires |
|--------|---------|-------------|----------|
| **Presence Check** | `usePresenceCheck.js` | Timer 10 min silence | 24h/24, 7j/7 |
| **Reminder Reset** | `useReminderReset.js` | Message client | 24h/24, 7j/7 |
| **Relances Cron** | `auto-form-reminders/index.ts` | Cron J+X | 08:00-20:00, lun-ven |

### Flow complet
```
Panel créé → Timer 10 min
     ↓
Silence 10 min → "Vous êtes toujours là ?" (1 seule fois)
     ↓
Client répond → Reset (reminder_count=0)
     ↓
Silence continue → Cron J+X → Relance 1, 2, 3 → Tâche
```

### Fichiers clés
| Fichier | Rôle |
|---------|------|
| `src/hooks/usePresenceCheck.js` | Message "Vous êtes toujours là ?" après 10 min |
| `src/hooks/useReminderReset.js` | Reset compteurs quand client répond |
| `src/hooks/useFormReminderWatcher.js` | Surveillance création tâche au seuil |
| `supabase/functions/auto-form-reminders/index.ts` | Cron relances J+X |

### Documentation complète
- `PRESENCE_CHECK_SYSTEM.md` — Message de présence
- `REMINDER_RESET_SYSTEM.md` — Reset des relances
- `ANALYSE_RELANCES_POUR_CHATGPT.md` — Analyse factuelle du système

## Environment Setup
```bash
# .env (required)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---
**Before modifying database schema or auth**: Read `supabase/` documentation. For feature additions: Use existing Supabase hooks as templates.
