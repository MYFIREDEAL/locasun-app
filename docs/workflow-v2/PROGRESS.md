# Workflow V2 - Progress

## Guardrails (à ne jamais casser)
- [x] Aucune modification du workflow V1 (UI + moteur)
- [ ] V2 = nouvelle page / nouveau dossier / feature flag
- [ ] Mode initial READ_ONLY: pas de cascade, pas de routing auto, pas d'update statut
- [ ] 2 boutons max (PROCEED / NEED_DATA), texte libre
- [ ] NEED_DATA = discussion + base d'info module
- [ ] PROCEED = aucun effet (mock) tant que non activé

## Status board

### ✅ Done
- [x] **Étape 1 - Audit/Cartographie** — Voir `CARTOGRAPHIE.md`
- [x] **Étape 2 - Plan de tickets** — Voir `TICKETS.md`
- [x] **T1 - Feature Flag + Config** — `src/lib/workflowV2Config.js`
- [x] **T2 - Route + Page Skeleton** — `WorkflowV2Page.jsx` + route
- [x] **T3 - Hook useWorkflowV2 (READ_ONLY)** — `src/hooks/useWorkflowV2.js`
- [x] **T4 - Navigation Modules** — `src/components/admin/workflow-v2/ModuleNavigation.jsx`
- [x] **T5 - Panel Module (lecture)** — `src/components/admin/workflow-v2/ModulePanel.jsx`
- [x] **T6 - Boutons PROCEED/NEED_DATA** — `src/components/admin/workflow-v2/ActionButtons.jsx`
- [x] **ModuleLiveCard** — `src/components/admin/workflow-v2/ModuleLiveCard.jsx` + doc `02_pattern_module_live.md`
- [x] **ProspectDetailsV2** — `src/components/admin/ProspectDetailsV2.jsx` (page prospect V2 isolée)
- [x] **Vision V1/V2** — `docs/workflow-v2/01_vision.md` (séparation architecturale documentée)
- [x] **Lecture données module** — Client infos + Formulaires + Documents/Contrats/PDB (READ_ONLY hardcodé ON)
- [x] **Base d'info module** — `src/lib/moduleInfoBase.js` + `src/lib/aiStubModule.js` + doc `03_base_info.md`
- [x] **Garde-fous techniques** — `guardWriteAction`, `safeProceed`, `safeNeedData`, logs dev + doc `04_plan_connexion.md`
- [x] **Migrations Supabase préparées** — `docs/workflow-v2/05_supabase_migrations.md` (non exécutées)
- [x] **Config IA par module** — `src/lib/moduleAIConfig.js` + `ModuleConfigPanel.jsx` + doc `06_module_config.md`
- [x] **Wiring config → ModuleLiveCard** — Labels, instructions, knowledgeKey connectés (zéro changement UX)
- [x] **Actions possibles (READ_ONLY)** — Affichage collapsible des `allowedActions` avec descriptions
- [x] **Garde-fous finaux + tests** — `assertNoWrite`, `assertNoRouting`, `generateSecurityReport` + doc `07_tests.md`
- [x] **Onglet Config IA** — `ModuleConfigTab.jsx` intégré dans `ModulePanel.jsx` (tabs Contact/Workflow V2)
- [x] **T7 - Lien depuis Pipeline** — Bouton "Workflow V2" ajouté dans `ProspectCard.jsx` (feature-flagged)

### 🔜 Prêt à exécuter (Phase 2 — Config V2)
- [x] **PROMPT 1 - Audit V1** — `docs/workflow-v2/08_audit_v1_actions.md`
- [x] **PROMPT 2 - Catalogue read-only** — `src/lib/catalogueV2.js`
- [x] **PROMPT 3 - Enrichir moduleAIConfig** — `src/lib/moduleAIConfig.js` (actionConfig ajouté)
- [x] **PROMPT 4 - UI config actions** — Sélecteurs dans `ModuleConfigPanel.jsx` ✅
- [x] **PROMPT 5 - Validateur config** — `isModuleConfigComplete()` + badge UI ✅
- [x] **PROMPT 6 - Simulation ActionOrder** — `buildActionOrder()` + `ActionOrderSimulator.jsx` ✅
- [x] **PROMPT 7 - Connexion V2→V1** — `executeActionOrder()` + flag `EXECUTION_FROM_V2` ✅

### ✅ Phase 3 — Éditeur IA (PROMPT 8)
- [x] **PROMPT 8 - UI Éditeur** — `ModuleConfigTab.jsx` entièrement éditable ✅

### ✅ Phase Finale — READY TO PLAY
- [x] **Branchement Supabase** — Formulaires et templates chargés depuis Supabase ✅
- [x] **Activation exécution preview** — `EXECUTION_FROM_V2` activé en localhost/preview/dev ✅

### ⏸️ En attente (Supabase)
- [ ] **Migration `module_info_base`** — Table pour mémoire IA par module
- [ ] **Migration `ai_interaction_logs`** — Historique des interactions IA
- [ ] **Migration `workflow_module_templates`** — Config par (project_type, module_id)

###  Backlog (7 tickets) — TOUS TERMINÉS ✅
| # | Ticket | Effort | Status |
|---|--------|--------|--------|
| T1 | Feature Flag + Config | XS | ✅ Done |
| T2 | Route + Page Skeleton | S | ✅ Done |
| T3 | Hook useWorkflowV2 (READ_ONLY) | S | ✅ Done |
| T4 | Navigation Modules | M | ✅ Done |
| T5 | Panel Module (lecture) | M | ✅ Done |
| T6 | Boutons PROCEED/NEED_DATA | S | ✅ Done |
| T7 | Lien depuis Pipeline (ProspectCard) | XS | ✅ Done |

### ⛔ Blocked / Questions
- Aucune question bloquante

## Ordre d'exécution
```
T1 → T2 → T3 → T4 → T5 → T6 → T7
     └── T7 peut être fait en parallèle après T2
```

## Risques identifiés
| Risque | Mitigation |
|--------|------------|
| Import accidentel V1 | Liste interdits dans T1 + grep avant merge |
| Double fetch | T3 réutilise hooks existants |
| Cascade déclenchée | Aucun import de trigger hooks |

## Fichiers de référence
- `docs/workflow-v2/CARTOGRAPHIE.md` — Map complète du système
- `docs/workflow-v2/TICKETS.md` — Détail des 7 tickets

## Notes / décisions
- 2026-01-27: Création du fichier PROGRESS.md
- 2026-01-27: **Audit terminé** — Cartographie complète créée
- 2026-01-27: **Plan de tickets créé** — 7 tickets, effort estimé 2-3 jours
  - Priorité: READ_ONLY sans cascade
  - T1-T3 = fondations (feature flag, route, hook)
  - T4-T6 = UI (navigation, panel, boutons)
  - T7 = intégration pipeline (optionnel en parallèle)
- 2026-01-27: **T3 terminé** — Hook `useWorkflowV2.js` créé
  - Centralise toute la logique READ_ONLY
  - Aucun import V1 (vérifié par grep)
  - Build OK (warnings chunk size uniquement)
  - Page utilise le hook au lieu de MOCK_MODULES
- 2026-01-27: **T4 terminé** — Composant `ModuleNavigation.jsx` créé
  - Navigation isolée avec props (steps, activeStepIndex, onSelectStep)
  - Cliquable: completed + in_progress
  - Lecture seule: pending (icône cadenas, cursor-not-allowed)
  - Auto-scroll vers module actif
  - Barre de progression
  - Aucun import V1, aucun update DB
  - Build OK, intégré dans WorkflowV2Page
- 2026-01-27: **T5 terminé** — Composant `ModulePanel.jsx` créé
  - Panneau central avec 4 sections READ_ONLY:
    - 👤 Client (nom, email, téléphone, société)
    - 📝 Formulaires (liste avec status badges)
    - 📁 Documents (liste avec liens externes)
    - 💬 Chat (5 derniers messages preview)
  - Sous-composants exportés: ClientInfoCard, FormsList, DocumentsList, ChatPreview
  - Props: step, prospect, forms, documents, messages, isReadOnly
  - Slot children pour boutons (T6)
  - Aucun import V1, aucune écriture DB
  - Build OK
- 2026-01-27: **T6 terminé** — Composant `ActionButtons.jsx` créé
  - 2 boutons : PROCEED (🚀) + NEED_DATA (❓)
  - PROCEED = mock uniquement (console.log, aucun write DB)
  - NEED_DATA = ouvre discussion (pas d'état modifié)
  - Feedback visuel (loading → success animation)
  - Disabled si stepStatus === 'completed'
  - Labels customisables via props
  - Variantes exportées: Compact, ProceedOnly
  - Intégré dans ModulePanel via children slot
  - Aucun import V1, aucun effet DB/navigation
  - Build OK
- 2026-01-27: **ModuleLiveCard terminé** — Composant IA chat
  - Carte IA avec chat dynamique, indicateur de saisie, auto-scroll
  - Props: title, aiMessages, isTyping, onAskAI, onClose
  - Documentation: `docs/workflow-v2/02_pattern_module_live.md`
  - Build OK
- 2026-01-27: **ProspectDetailsV2 terminé** — Page prospect V2 isolée
  - ~650 lignes, duplication de ProspectDetailsAdmin sans imports V1
  - Route: `/admin/prospect-v2/:prospectId`
  - Bouton "Ouvrir Workflow V2" pour chaque projet
  - Aucun import V1 (vérifié par grep)
  - READ_ONLY: pas de useWorkflowExecutor, pas de useWorkflowActionTrigger
  - Build OK
- 2026-01-27: **01_vision.md créé** — Documentation V1/V2
  - Architecture de séparation V1/V2
  - Liste des imports interdits
  - Stratégie de migration READ_ONLY → WRITE
- 2026-01-27: **Lecture données module** — Infos complètes READ_ONLY
  - `useWorkflowV2.js`: Chargement fichiers via `useSupabaseProjectFiles`
  - `useWorkflowV2.js`: Chargement contrats/PDB via requête `signature_procedures`
  - `useWorkflowV2.js`: Flag `READ_ONLY = true` hardcodé ON
  - `ModulePanel.jsx`: Affichage combiné fichiers + contrats avec statut signature
  - `WorkflowV2Page.jsx`: Passage `projectDocuments` au ModulePanel
  - Contrats distingués visuellement (bordure bleue, icône signature)
  - Statuts contrat: En attente / Signé / Expiré
  - ⚠️ Aucun envoi, aucun update, aucun trigger
  - Build OK
- 2026-01-27: **Base d'info module** — IA stub avec base locale
  - `src/lib/moduleInfoBase.js`: Mapping JSON par moduleId
    - 5 modules documentés: appel-offre, pdb, etude-technique, raccordement, mise-en-service
    - Structure: title, description, checklist, faq, requiredDocuments, tips, contacts
  - `src/lib/aiStubModule.js`: IA stub avec logique de réponse
    - Détection d'intention (checklist, documents, contact, tips, général)
    - Recherche FAQ par mots-clés
    - Si info manquante → pose question de clarification (pas d'invention)
    - Types de réponse: ANSWER, CLARIFICATION, CHECKLIST, DOCUMENTS, TIPS, CONTACT, NO_INFO
  - `docs/workflow-v2/03_base_info.md`: Documentation complète
  - Build OK
- 2026-01-27: **Garde-fous techniques** — Sécurité READ_ONLY renforcée
  - `src/lib/workflowV2Config.js`: Nouvelles fonctions de garde
    - `guardWriteAction(action, context)`: Bloque toute écriture si READ_ONLY
    - `safeProceed(realAction, context)`: Wrapper sécurisé pour PROCEED
    - `safeNeedData(realAction, context)`: Wrapper sécurisé pour NEED_DATA
    - `runSecurityChecks()`: Vérifications au mount avec logs
    - `isFunctionAllowedReadOnly(name)`: Vérifie si fonction autorisée
    - `FORBIDDEN_FUNCTIONS_READ_ONLY`: Liste des 11 fonctions interdites
  - `src/hooks/useWorkflowV2.js`: Handlers mis à jour avec garde-fous
    - `handleProceed` utilise `safeProceed`
    - `handleNeedData` utilise `safeNeedData`
    - `runSecurityChecks()` appelé au mount
  - Logs dev avec préfixes: `[V2]`, `[V2 GUARD]`, `[V2 PROCEED]`, `[V2 SECURITY]`
  - `docs/workflow-v2/04_plan_connexion.md`: Tests manuels complets
    - 7 tests de validation + 2 tests de régression
    - Checklist avec commandes grep
    - URLs de test
  - Build OK
- 2026-01-28: **PROMPT 1 - Audit V1 terminé** — `08_audit_v1_actions.md`
  - Actions V1 identifiées: `show_form`, `start_signature`, `request_document`, `partner_task`
  - Cibles V1: `hasClientAction=true` (client), `false` (commercial), `null` (partenaire)
  - Formulaires: `useSupabaseForms` → table `forms` (audience: client/internal)
  - Templates: `useSupabaseContractTemplates` → table `contract_templates`
  - Trigger robot: `handleSelectPrompt()` dans `ProspectDetailsAdmin.jsx`
  - Auto-exécution: `useWorkflowExecutor.js` → `executeAction()`
  - Payload ActionOrder documenté
  - Aucun code modifié
- 2026-01-29: **PROMPT 2 - Catalogue read-only terminé** — `src/lib/catalogueV2.js`
  - Types d'actions: `FORM`, `SIGNATURE` avec mapping V1 (`show_form`, `start_signature`)
  - Cibles: `CLIENT`, `COMMERCIAL`, `PARTENAIRE` avec mapping V1 (`hasClientAction`)
  - Modes gestion: `AI`, `HUMAN` (automatic/manual)
  - Modes vérification: `AI`, `HUMAN` (ai/human)
  - Catalogue formulaires: `getFormsCatalogue()`, `getClientFormsCatalogue()`
  - Catalogue templates: `getContractTemplatesCatalogue()`, `getActiveContractTemplatesCatalogue()`
  - Helpers validation: `isValidActionType()`, `isValidFormId()`, `isValidTemplateId()`
  - Conversion: `v2TypeToV1Type()`, `v1TypeToV2Type()`
  - ❌ Aucune exécution, ❌ Aucune modif V1, ✅ Read-only strict
- 2026-01-29: **PROMPT 3 - Enrichir moduleAIConfig terminé**
  - Nouveau type `ActionConfig` avec 6 propriétés:
    - `targetAudience`: CLIENT | COMMERCIAL | PARTENAIRE
    - `actionType`: FORM | SIGNATURE | null
    - `allowedFormIds`: string[] (liste des formulaires autorisés)
    - `allowedTemplateIds`: string[] (liste des templates autorisés)
    - `managementMode`: AI | HUMAN
    - `verificationMode`: AI | HUMAN
  - `DEFAULT_ACTION_CONFIG` exporté (valeurs neutres)
  - `DEFAULT_MODULE_CONFIG` enrichi avec `actionConfig`
  - Module `pdb` = exemple complet avec actionConfig
  - Helpers ajoutés:
    - `getModuleActionConfig(moduleId)`
    - `updateModuleActionConfig(moduleId, updates)`
    - `addAllowedFormId()` / `removeAllowedFormId()`
    - `addAllowedTemplateId()` / `removeAllowedTemplateId()`
  - ❌ Aucune exécution, ❌ Aucune logique décisionnelle, ✅ Config déclarative
- 2026-01-29: **PROMPT 4 - UI config actions terminé** — `ModuleConfigPanel.jsx`
  - Props ajoutés: `availableForms`, `availableTemplates` (catalogue V2)
  - État `actionConfig` séparé avec persistence via `updateModuleActionConfig()`
  - Nouvelle section "Configuration Actions V2" avec badge V2
  - Composants UI ajoutés:
    - `TargetAudienceSelector`: checkboxes pour CLIENT/COMMERCIAL/PARTENAIRE
    - `ActionTypeSelector`: radio pour FORM/SIGNATURE
    - `MultiSelectIds`: sélection multiple formulaires ou templates
    - `ModeSelector`: sélecteur gestion/vérification (AI/HUMAN)
  - Affichage conditionnel: formulaires si FORM, templates si SIGNATURE
  - Résumé config V2 en lecture seule
  - ❌ Aucune exécution, ❌ Aucun appel V1, ✅ Config UI pure
- 2026-01-29: **PROMPT 5 - Validateur config terminé**
  - Fonction `isModuleConfigComplete(moduleId, projectType)` dans `moduleAIConfig.js`
  - Règles de validation:
    1. ≥ 1 cible sélectionnée (`targetAudience`)
    2. `actionType` défini (FORM ou SIGNATURE)
    3. Si FORM → `allowedFormIds.length ≥ 1`
    4. Si SIGNATURE → `allowedFormIds.length ≥ 1` (formulaire collecte)
    5. `managementMode` défini (AI ou HUMAN)
    6. `verificationMode` défini (AI ou HUMAN)
  - Type retour `ValidationResult`: `{ isComplete, errors[], warnings[] }`
  - Helpers ajoutés:
    - `getValidationSummary(validationResult)` → texte lisible
    - `isModuleReady(moduleId)` → boolean rapide
  - UI: Composant `ValidationBadge` dans `ModuleConfigPanel.jsx`
    - Badge vert "Configuration complète" + avertissements
    - Badge rouge "Configuration incomplète" + liste erreurs détaillée
  - Validation temps réel via `useMemo` sur `actionConfig`
  - ❌ Aucune exécution, ❌ Aucun appel V1, ❌ Aucune persistance DB, ✅ Pure validation UI
- 2026-01-29: **PROMPT 6 - Simulation ActionOrder terminé**
  - Nouveau helper: `src/lib/actionOrderV2.js`
  - Fonction principale: `buildActionOrder({ moduleId, projectType, prospectId, actionConfig, message })`
  - Structure ActionOrder générée:
    - `id`: UUID simulation (sim-xxx)
    - `version`: v2.0
    - `status`: PENDING (toujours en simulation)
    - `target`: CLIENT | COMMERCIAL | PARTENAIRE
    - `hasClientAction`: true | false | null (conversion V1)
    - `actionType`: FORM | SIGNATURE
    - `v1ActionType`: show_form | start_signature
    - `formIds`: liste des formulaires
    - `templateIds`: liste des templates (si SIGNATURE)
    - `signatureType`: yousign | null
    - `managementMode`: AI | HUMAN
    - `verificationMode`: AI | HUMAN
    - `message`: texte libre
    - `_meta`: { generatedBy, isSimulation, timestamp }
  - Helpers supplémentaires:
    - `formatActionOrderSummary(order)` → résumé textuel
    - `getActionOrderJSON(order)` → JSON formaté copiable
    - `validateActionOrder(order)` → validation de l'ordre
  - Fonctions de conversion ajoutées dans `catalogueV2.js`:
    - `v2TargetToV1HasClientAction(target)` → boolean|null
    - `v1HasClientActionToV2Target(hasClientAction)` → string
  - UI: Composant `ActionOrderSimulator.jsx`
    - Bouton "Simuler" (icône Zap/robot)
    - Affichage visuel: action, cible, formulaires, templates, message, modes
    - Zone JSON copiable (bouton "Copier")
    - Disclaimer "Simulation pure"
    - Affiché uniquement si config complète (validationResult.isComplete)
  - Intégration dans `ModuleConfigPanel.jsx` après ValidationBadge
  - ❌ Aucun appel V1, ❌ Aucune cascade, ❌ Aucune persistance DB, ✅ Simulation pure
- 2026-01-29: **PROMPT 7 - Connexion V2→V1 terminé**
  - Feature flag: `EXECUTION_FROM_V2` dans `workflowV2Config.js`
    - OFF par défaut (simulation seulement)
    - ON uniquement en preview/dev
    - Rollback immédiat = flag OFF
  - Helper: `isExecutionFromV2Enabled()` pour vérifier le flag
  - Nouveau fichier: `src/lib/executeActionOrderV2.js`
  - Fonction principale: `executeActionOrder(order, context)`
    - Point d'entrée UNIQUE V2 → V1
    - Gardes de sécurité:
      1. Vérifie flag EXECUTION_FROM_V2
      2. Vérifie `_meta.isSimulation === false`
      3. Valide l'ordre (prospectId, actionType)
    - Actions supportées:
      - FORM → crée `client_form_panels` + message chat
      - SIGNATURE → crée `signature_procedures` + message chat
    - Retourne `ExecutionResult`: `{ success, status, message, data }`
    - Status possibles: `executed`, `simulated`, `blocked`, `error`
  - Helper: `canExecuteActionOrder(order)` pour vérifier avant exécution
  - UI mise à jour dans `ActionOrderSimulator.jsx`:
    - Badge "EXEC ON" si flag activé
    - Bouton "Exécuter" (vert) si exécution possible
    - Spinner pendant exécution
    - Affichage résultat (succès/erreur avec détails)
    - Footer dynamique selon mode
  - Contraintes respectées:
    - ❌ Aucun changement dans ProspectDetailsAdmin V1
    - ❌ Aucune cascade automatique
    - ❌ Aucun déclenchement hors feature flag
    - ❌ Aucun impact sur les flows existants V1
    - ✅ Rollback immédiat = flag OFF

## 🎉 PHASE 2 COMPLÈTE — Tous les prompts 1-7 terminés

## 🎉 PHASE 3 COMPLÈTE — PROMPT 8 terminé

### PROMPT 8 - UI Éditeur de configuration IA par module
- **Objectif**: Rendre le panneau "Configuration Actions V2" entièrement éditable
- **Fichier modifié**: `src/components/admin/workflow-v2/ModuleConfigTab.jsx`
- **Composants UI ajoutés**:
  - `TargetCheckboxGroup`: Checkboxes CLIENT / COMMERCIAL / PARTENAIRE
  - `ActionTypeRadioGroup`: Radio FORM / SIGNATURE
  - `FormMultiSelect`: Multi-select formulaires (conditonnel si FORM)
  - `TemplateSelect`: Select template signature (conditionnel si SIGNATURE)
  - `ModeSelect`: Sélecteurs mode gestion (AI/HUMAN) et vérification (AI/HUMAN)
  - `KnowledgeKeySelect`: Multi-select accès données (knowledgeKey)
  - `ValidationBadge`: Badge temps réel config complète/incomplète
- **Mapping UI → Config**:
  | Champ UI | Bind |
  |----------|------|
  | Cibles autorisées | `actionConfig.targetAudience[]` |
  | Type action | `actionConfig.actionType` |
  | Formulaires autorisés | `actionConfig.allowedFormIds[]` |
  | Template signature | `actionConfig.templateId` |
  | Mode gestion | `actionConfig.managementMode` |
  | Mode vérification | `actionConfig.verificationMode` |
  | Accès données | `config.knowledgeKey[]` |
- **Comportement**:
  - Modifications en temps réel via `updateActionConfigField()` et `updateKnowledgeKey()`
  - Persistance en mémoire via `updateModuleActionConfig()` (pas de DB)
  - Badge validation réactif via `useMemo` sur `configValidation`
  - Simulateur reflète immédiatement les changements
- **Contraintes respectées**:
  - ❌ Aucun changement moteur
  - ❌ Aucune exécution
  - ❌ Aucune persistance DB
  - ❌ Aucune logique IA
  - ✅ Pure UI + wiring config existante

## 🎉 PHASE FINALE COMPLÈTE — READY TO PLAY

### Branchement Supabase + Activation exécution
- **Objectif**: Rendre l'outil utilisable en réel pour un admin
- **Fichiers modifiés**:
  - `src/pages/admin/WorkflowV2Page.jsx` — Appel hooks Supabase
  - `src/components/admin/workflow-v2/ModulePanel.jsx` — Props transmission
  - `src/lib/workflowV2Config.js` — Activation preview/dev
- **Hooks branchés**:
  - `useSupabaseForms(organizationId)` → formulaires réels
  - `useSupabaseContractTemplates(organizationId)` → templates réels
  - `useOrganization()` → ID organisation courante
- **Chemin des props**:
  ```
  WorkflowV2Page
    ├── useOrganization() → organizationId
    ├── useSupabaseForms(organizationId) → supabaseForms
    ├── useSupabaseContractTemplates(organizationId) → supabaseTemplates
    ├── Transform → availableForms[{id, name}], availableTemplates[{id, name}]
    └── ModulePanel
          └── ModuleConfigTab
                ├── FormMultiSelect(availableForms)
                └── TemplateSelect(availableTemplates)
  ```
- **Activation exécution**:
  - `executionFromV2` = **AUTO** selon environnement
  - `localhost` / `127.0.0.1` → ✅ ON
  - `*.vercel.app` / `*preview*` → ✅ ON
  - `*.github.io` → ✅ ON
  - `import.meta.env.DEV` → ✅ ON
  - Production → ❌ OFF
- **Résultat**:
  - ✅ Formulaires visibles dans l'éditeur
  - ✅ Templates visibles dans l'éditeur
  - ✅ Bouton 🚀 Exécuter présent en preview/dev
  - ✅ Sécurisé en production (flag OFF)