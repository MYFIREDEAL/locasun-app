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
- **V1 (legacy)**: Actions et exécutions dans `WorkflowsCharlyPage.jsx` + `useWorkflowExecutor.js`
  - Le "petit robot" est déclenché depuis `ProspectDetailsAdmin.jsx`
  - Chaînage frontend via `sendNextAction` + `useWorkflowActionTrigger`
  - ⚠️ Toujours actif pour les anciens prompts V1
- **V2 (actuel — Trigger V4)**: Config globale + exécution manuelle + trigger DB pour le ménage
  - **L'admin/IA clique le robot pour CHAQUE action** (jamais de chaînage automatique)
  - Le trigger DB `fn_v2_action_chaining` fait UNIQUEMENT : subSteps MAJ + complétion d'étape
  - Le frontend a 3 guards qui empêchent toute intervention V1 sur les panels V2
  - ⚠️ La route `/admin/workflow-v2/:prospectId/:projectType` existe dans le code mais N'EST PLUS UTILISÉE (ancien design par prospect)

### Fichiers clés V2
| Fichier | Rôle |
|---------|------|
| `src/pages/admin/WorkflowV2ConfigPage.jsx` | ⭐ **LA PAGE WORKFLOW V2** (cockpit config globale) |
| `src/lib/moduleAIConfig.js` | Config IA par module (objectif, instructions, actionConfig) |
| `src/lib/catalogueV2.js` | Catalogue read-only (forms, templates, targets, modes) |
| `src/lib/actionOrderV2.js` | Build ActionOrder JSON (simulation pure) |
| `src/lib/executeActionOrderV2.js` | ⭐ **Moteur d'exécution** — appelé quand admin clique "Exécuter" sur le robot |
| `src/lib/workflowV2Config.js` | Feature flags (READ_ONLY, EXECUTION_FROM_V2) |
| `src/components/admin/workflow-v2/ActionOrderSimulator.jsx` | UI simulation + exécution |
| `src/components/admin/workflow-v2/ModuleConfigTab.jsx` | Éditeur UI config IA |
| `src/hooks/useSupabaseWorkflowModuleTemplates.js` | Persistance Supabase des configs |
| `src/hooks/useWorkflowActionTrigger.js` | Real-time listener panels — guard V2 (skip sendNextAction) |
| `fix_trigger_v4_simple.sql` | ⭐ **Trigger DB actuel** — subSteps MAJ + complétion d'étape |

### Page obsolète (code legacy)
| Fichier | Statut |
|---------|--------|
| `src/pages/admin/WorkflowV2Page.jsx` | ⚠️ OBSOLÈTE - Config par prospect (ancien design, plus utilisé) |
| `src/hooks/useWorkflowV2.js` | ⚠️ OBSOLÈTE - Hook pour page WorkflowV2Page |

### Persistance
| Phase | Mode | Détail |
|-------|------|--------|
| ~~Phase 3~~ | ~~Mémoire~~ | ~~Config perdue au refresh~~ |
| **Actuel** | **Supabase** | Table `workflow_module_templates` par `org_id` + `project_type` + `module_id` |

### Feature Flags (`workflowV2Config.js`)
- `READ_ONLY: false` → V2 écrit en DB (templates sauvegardés dans Supabase)
- `EXECUTION_FROM_V2: true` → Bouton "Exécuter" actif (admin lance les actions depuis le robot)

### 🆕 Types d'actions supportés (10 mars 2026)

| Type | Description | completionTrigger | Panel form_id | Qui valide ? |
|------|-------------|-------------------|---------------|-------------|
| **FORM** | Formulaire envoyé au client | `form_approved` | UUID du form | Client remplit → Admin valide |
| **SIGNATURE** | Procédure de signature électronique | `signature_completed` | UUID du template | Client signe |
| **MESSAGE** | Boutons Valider/Besoin d'infos dans le chat | `button_click` | `null` | Client clique Valider |
| **FORM+PARTENAIRE** | Formulaire envoyé au partenaire via mission | `form_approved` | UUID du form | Partenaire remplit → Admin valide |

### 🔗 Chaînage Actions ↔ Étapes — Trigger V4 (10 mars 2026)

> **Le chaînage est géré par le trigger DB `fn_v2_action_chaining` (SECURITY DEFINER).**
> **Le frontend ne chaîne JAMAIS les actions V2. L'admin clique le robot pour chaque action.**

#### Flow complet (exemple : étape avec 2 actions MESSAGE + FORM)
```
1. Admin clique 🤖 Robot → voit preview action-0 (MESSAGE)
   → Clique "Exécuter" → executeActionOrderV2 crée :
     • panel dans client_form_panels (action_id="v2-xxx-action-0")
     • message chat avec boutons Valider/Besoin d'infos

2. Client clique "Valider" → panel.status = 'approved'
   → TRIGGER DB se déclenche :
     • Crée subSteps si absentes (depuis template workflow_module_templates)
     • action-0 → completed ✅
     • action-1 → in_progress 🔄
     • RETURN et ATTEND que l'admin relance le robot

3. Admin clique 🤖 Robot → voit preview action-1 (FORM)
   → Clique "Exécuter" → envoie formulaire

4. Client remplit → Admin valide → panel.status = 'approved'
   → TRIGGER DB : c'est la DERNIÈRE action !
     • Toutes subSteps → completed ✅
     • Étape courante → completed ✅
     • Étape suivante → in_progress 🔄
```

#### 3 guards frontend (empêchent V1 d'interférer avec V2)
| Guard | Fichier | Logique |
|-------|---------|---------|
| `useWorkflowActionTrigger` | `src/hooks/useWorkflowActionTrigger.js` L83 | Si `action_id.startsWith('v2-')` → SKIP `sendNextAction` |
| `handleApprove` | `ProspectDetailsAdmin.jsx` L2080 | Si `isV2Panel` → SKIP `completeStepAndProceed` + subSteps |
| `sendNextAction` TENTATIVE 2 | `ProspectDetailsAdmin.jsx` L518 | Si `completedActionId.startsWith('v2-')` → return immédiat |

#### Trigger DB `fn_v2_action_chaining` (fix_trigger_v4_simple.sql)
| Étape trigger | Action |
|---------------|--------|
| **Gardes** | Seulement `status → approved` + `action_id LIKE 'v2-%'` |
| **Parse** | `action_id = "v2-{moduleId}-action-{index}"` → extrait module + index |
| **Template** | Charge config depuis `workflow_module_templates` (par org_id + project_type + module_id) |
| **SubSteps** | Crée les subSteps depuis template `actions[]` si absentes en DB |
| **Pas dernière action** | action courante → `completed`, suivante → `in_progress`, **STOP** |
| **Dernière action** | Toutes subSteps → `completed`, étape → `completed`, étape suivante → `in_progress` |

#### ⚠️ RÈGLE ABSOLUE
> **Le trigger ne clique JAMAIS sur le robot à la place de l'humain ou de l'IA.**
> C'est TOUJOURS l'admin qui décide quand lancer l'action suivante.
> Le trigger fait uniquement le "ménage" : mettre à jour les statuts des subSteps et compléter l'étape.

**Points critiques pour tout nouveau type d'action :**
- `organization_id` obligatoire dans le panel (RLS multi-tenant)
- `action_id` obligatoire dans le panel (format `v2-{moduleId}-action-{index}`)
- Le panel doit passer à `status = 'approved'` pour que le trigger se déclenche
- Ajouter le case dans `executeActionOrderV2.js` + whitelist `canExecuteActionOrder`

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
2. Admin clique 🤖 Robot → executeActionOrderV2 crée mission + client_form_panel (filled_by_role='partner')
3. Partenaire ouvre mission → voit formulaire → remplit → soumet
4. form_data sauvegardé dans client_form_panels.form_data
5. 🔔 Trigger DB notifie admin (🟠 Formulaire partenaire soumis)
6. Admin voit dans ProspectDetailsAdmin → Section "Formulaires soumis"
7. Admin valide → panel.status = 'approved' → Trigger V4 gère subSteps + complétion
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

## 🤖 Roadmap IA — Vision (pas encore implémenté)

### Principe
L'IA s'intègre dans le Workflow V2 existant. Toute la config est **déjà prête** dans les templates :
- `knowledgeKey` : quelles données l'IA peut lire (8 clés : prospect_info, contract_history, forms_submitted, chat_history, documents, client_projects_history, commercial_activity, partner_activity)
- `allowedActions` : quelles actions l'IA peut exécuter (respond, create_appointment, send_whatsapp, send_sms, send_email)
- `instructions` : prompt en langage naturel par module
- `documents IA` : documents privés uploadés par action (context)
- **Stocké dans** : `workflow_module_templates.config_json`
- **UI Config** : `src/components/admin/workflow-v2/ModuleConfigTab.jsx`

### Canal de communication : WhatsApp-first
```
WhatsApp = canal principal (IA discute avec le client en temps réel)
Espace client = canal d'action (formulaires, signature via magic link)
chat_messages = source de vérité (tout stocké ici, WhatsApp = transport)
```
- L'IA écrit dans `chat_messages`, un webhook envoie sur WhatsApp
- Pour les actions (formulaire, signature), l'IA envoie un **magic link** sur WhatsApp
- Le client clique → connecté auto (Supabase Auth OTP) → fait l'action → ferme → retourne sur WhatsApp
- Le magic link existe déjà côté admin (bouton dans ProspectDetailsAdmin), envoie par email → futur : WhatsApp

### Briques à ajouter
| Brique | Effort | Détail |
|--------|--------|--------|
| Edge Function OpenAI | Moyen | Lit config_json du template, appelle GPT, écrit dans chat_messages |
| `create_appointment` | Facile | Exposer `addAppointment()` de useSupabaseAgenda à l'IA |
| WhatsApp (Twilio) | Moyen | Edge Function send + webhook receive |
| SMS (Twilio) | Facile | Même Edge Function, canal différent |
| Email (Resend) | Facile | Edge Function + template |
| Magic link WhatsApp | Facile | Supabase Auth OTP, transport WhatsApp au lieu d'email |
| Appel vocal | Plus tard | Twilio Voice / Vapi.ai |

### Ce qui NE change PAS
- Le moteur V2 (`executeActionOrderV2.js`) reste identique
- Les triggers DB (V4 + signature + notifications) restent identiques
- Les 3 guards frontend restent identiques
- L'IA clique le robot comme un admin — même flow exact

---
**Before modifying database schema or auth**: Read `supabase/` documentation. For feature additions: Use existing Supabase hooks as templates.
