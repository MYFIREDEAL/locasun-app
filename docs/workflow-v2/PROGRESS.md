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

### 🔜 Prêt à exécuter (Phase 2)
- [ ] **Migration `module_info_base`** — Table pour mémoire IA par module
- [ ] **Migration `ai_interaction_logs`** — Historique des interactions IA

### 🟨 In progress
- [ ] **T7 - Lien depuis Pipeline** (en pause)

### 📋 Backlog (7 tickets)
| # | Ticket | Effort | Status |
|---|--------|--------|--------|
| T1 | Feature Flag + Config | XS | ✅ Done |
| T2 | Route + Page Skeleton | S | ✅ Done |
| T3 | Hook useWorkflowV2 (READ_ONLY) | S | ✅ Done |
| T4 | Navigation Modules | M | ✅ Done |
| T5 | Panel Module (lecture) | M | ✅ Done |
| T6 | Boutons PROCEED/NEED_DATA | S | ✅ Done |
| T7 | Lien depuis Pipeline | XS | ⏸️ Pause |

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

