# 📊 PROGRESS_LOG — EVATIME

> **Journal de progression du projet. À lire par toute nouvelle session IA.**
> Mis à jour après chaque session de travail.

---

## 🔖 Convention

Chaque entrée contient :
- **Date** de la session
- **Features** ajoutées (✅)
- **Bugs fixés** (🐛)
- **Migrations SQL** exécutées (🗄️)
- **À faire** ensuite (🔜)

---

## 9 mars 2026 (session 4 — soirée)

### ✅ Features
- **Trigger DB 100% server-side** : Le trigger `fn_v2_action_chaining` gère TOUT le workflow V2 côté serveur : chaînage des actions, complétion d'étape, mise à jour des subSteps. Le frontend n'intervient plus du tout pour les panels V2.
- **Test end-to-end réussi** : FORM (decouverte) → approve → passage auto chiffrage → MESSAGE (chiffrage) → client Valider → passage auto connexion. Tout propre, pas de subSteps fantômes.

### 🐛 Bugs fixés (3 hotfixes)
- **Double complétion d'étape** : Le trigger DB ET le frontend `sendNextAction` faisaient la complétion d'étape → subSteps du module courant clonées sur l'étape suivante. Fix : supprimé la complétion d'étape frontend pour V2 (le trigger DB s'en charge).
- **subSteps marquées "Terminé" prématurément** : `useWorkflowActionTrigger` appelait encore `sendNextAction` pour les panels V2, qui exécutait l'action suivante ET marquait les subSteps completed avant que le client n'interagisse. Fix : ajout guard `action_id.startsWith('v2-')` → skip `sendNextAction`, le trigger DB gère tout.
- **Actions clonées sur étape non-configurée** : L'étape chiffrage recevait les subSteps de decouverte à cause du `sendNextAction` frontend qui créait les subSteps depuis `currentModuleConfig` (qui pointait sur le mauvais module après le switch d'étape par le trigger). Fix : même guard que ci-dessus.

### 📁 Fichiers modifiés
| Fichier | Modification |
|---------|-------------|
| `src/components/admin/ProspectDetailsAdmin.jsx` | Supprimé le bloc complétion d'étape frontend pour V2 (else dans sendNextAction). Remplacé par un simple return + log "complétion gérée par trigger DB". |
| `src/hooks/useWorkflowActionTrigger.js` | Ajout guard : si `action_id.startsWith('v2-')` → skip `sendNextAction`. Seuls les panels V1 déclenchent encore le chaînage frontend. |

### 🧪 Tests validés
| Test | Résultat |
|------|----------|
| FORM simple (1 action, decouverte) | ✅ Client remplit → admin approuve → étape Terminé |
| MESSAGE (1 action, chiffrage) | ✅ Admin lance robot → client Valider → étape Terminé |
| Passage d'étape auto (decouverte→chiffrage→connexion) | ✅ Trigger DB gère tout |
| Pas de subSteps fantômes sur étape suivante | ✅ connexion = "En cours" propre |
| Pas de double exécution frontend | ✅ Guard V2 dans useWorkflowActionTrigger |

### 🏗️ Architecture V2 — État actuel

```
Panel V2 approved
  ↓
Trigger DB fn_v2_action_chaining (SECURITY DEFINER)
  ├── CAS 1: Action suivante → crée panel + chat message + MAJ subSteps
  └── CAS 2: Dernière action → complète étape + active suivante

Frontend (useWorkflowActionTrigger)
  └── Panel V2 ? → SKIP (trigger DB gère)
  └── Panel V1 ? → sendNextAction (legacy)
```

### 🔜 Prochains sujets
- Tester multi-actions (FORM → MESSAGE dans la même étape) avec trigger DB
- Tester SIGNATURE en multi-actions
- Tester sans admin en ligne (l'IA envoie l'action puis "part")
- Nettoyer le code `sendNextAction` : le bloc de mise à jour subSteps (lignes 533-577) est maintenant dead code pour V2

---

## 9 mars 2026

### ✅ Features
- **Type d'action MESSAGE dans Workflow V2** : Nouveau type d'action permettant à l'admin/IA d'écrire dans le chat puis d'envoyer des boutons de validation au client. Le client clique "Valider" ou "Besoin d'infos" directement dans le chat. Validation → chaînage automatique vers l'action/étape suivante.

### 🐛 Bugs fixés (5 hotfixes en session)
- **`form_id NOT NULL`** : La colonne `form_id` de `client_form_panels` avait une contrainte NOT NULL → `ALTER COLUMN form_id DROP NOT NULL` pour accepter MESSAGE (pas de formulaire)
- **`organization_id` manquant** : Le panel MESSAGE était créé sans `organization_id` → RLS multi-tenant bloquait silencieusement l'UPDATE du client
- **Chaînage V2 inactif** : `useWorkflowActionTrigger` exigeait un prompt V1 → ajout `hasV2Actions` comme alternative + fallback V2 dans `sendNextAction`
- **Guard `> 1` au lieu de `>= 1`** : Avec 1 seule action dans l'étape, le bloc V2 n'était jamais atteint
- **`completeStepAndProceed` sans steps** : Le 4ème paramètre `currentSteps` est requis → fetch des steps depuis Supabase avant appel

### 🗄️ Migrations SQL exécutées
- `add_action_type_column_client_form_panels.sql` — `ALTER TABLE client_form_panels ADD COLUMN action_type TEXT DEFAULT 'form'`
- `make_form_id_nullable_client_form_panels.sql` — `ALTER COLUMN form_id DROP NOT NULL`

### 📁 Fichiers modifiés (10 fichiers)
| Fichier | Modification |
|---------|-------------|
| `src/lib/catalogueV2.js` | MESSAGE dans ACTION_TYPES |
| `src/lib/moduleAIConfig.js` | `button_click` trigger, exemptions MESSAGE |
| `src/components/admin/workflow-v2/ModuleConfigTab.jsx` | UI config MESSAGE, auto-force button_click |
| `src/lib/actionOrderV2.js` | `buttonLabels` dans build/validate/format |
| `src/lib/executeActionOrderV2.js` | `executeMessageAction()` + organization_id |
| `src/components/admin/workflow-v2/WorkflowV2RobotPanel.jsx` | Icône, labels, preview objectif/instructions/boutons |
| `src/components/admin/workflow-v2/ActionOrderSimulator.jsx` | Icône teal, preview boutons |
| `src/components/ProjectDetails.jsx` | Boutons Valider/Besoin d'infos côté client |
| `src/hooks/useWorkflowActionTrigger.js` | Support `hasV2Actions` sans prompt V1 |
| `src/components/admin/ProspectDetailsAdmin.jsx` | `sendNextAction` avec fallback V2 + complétion étape |

### 🔜 Prochains sujets
- Tester SIGNATURE en multi-actions (FORM + SIGNATURE dans une même étape) — nécessite création d'un panel pour SIGNATURE + mise à jour panel→approved quand signed

---

## 9 mars 2026 (session 2 — après-midi)

### ✅ Features
- **Multi-actions MESSAGE + FORM fonctionne de bout en bout** : Testé avec 3 actions (MESSAGE → FORM A → FORM B). Chaînage séquentiel, sous-étapes, et passage d'étape automatique.

### 🐛 Bugs fixés (4 hotfixes)
- **`shouldCompleteStep` bloqué par `button_click`** : En multi-actions, le `completionTrigger` module-level (`button_click` pour MESSAGE) empêchait le passage d'étape même quand toutes les actions étaient approved. Fix : en multi-actions, seul critère = `allActionsCompleted`.
- **SubSteps non mises à jour en temps réel** : `sendNextAction` ne mettait pas à jour les sous-étapes (elles n'existaient pas en Supabase, générées uniquement côté UI). Fix : `sendNextAction` crée les subSteps depuis le template V2 si absentes, puis met à jour les statuts (completed → in_progress).
- **`updateSupabaseSteps is not defined`** : Variable du composant parent utilisée dans `ProspectForms` (sous-composant). Fix : remplacé par appel Supabase direct.
- **Compteur "Formulaires soumis" comptait les MESSAGE** : Ajout de `actionType` dans la transformation du hook `useSupabaseClientFormPanels` + filtre `panel.actionType !== 'message'`.

### 📁 Fichiers modifiés
| Fichier | Modification |
|---------|-------------|
| `src/components/admin/ProspectDetailsAdmin.jsx` | `shouldCompleteStep` multi-actions, subSteps dans `sendNextAction` avec création si absentes, appel Supabase direct dans handleApprove |
| `src/hooks/useSupabaseClientFormPanels.js` | Ajout `actionType` et `actionId` dans `transformFromDB` |

### 🔜 Prochains sujets
- Tester SIGNATURE en multi-actions

---

## 9 mars 2026 (session 3 — fin d'après-midi)

### ✅ Features
- **SIGNATURE compatible multi-actions** : `executeSignatureAction` crée maintenant un `client_form_panels` avec `action_type: 'signature'` et `action_id`. Le listener `signature_procedures` met le panel à `approved` quand la signature est signée → le chaînage standard (`useWorkflowActionTrigger` → `sendNextAction`) prend le relais.
- **Listener signature V1/V2** : Si `signature_metadata.panelDbId` existe → met le panel à approved (V2 multi-actions). Sinon → fallback V1 (direct `completeStepAndProceed`).

### 📁 Fichiers modifiés
| Fichier | Modification |
|---------|-------------|
| `src/lib/executeActionOrderV2.js` | Panel `action_type: 'signature'` créé dans `executeSignatureAction` + `signature_metadata` mis à jour avec `actionId`/`panelDbId` |
| `src/components/admin/ProspectDetailsAdmin.jsx` | Listener signature : stratégie 1 (panel V2 → approved → chaînage) + stratégie 2 (fallback V1) |

### ✅ Vérification PARTENAIRE
- `action_id` déjà transmis dans les panels partenaire+FORM (ligne 277 de `executeActionOrderV2.js`)
- Cas edge : mission partenaire SANS formulaire → pas de panel → à traiter si besoin futur

### 📋 TODO FUTUR : Type PAIEMENT

> **Quand Stripe (ou autre) sera intégré, voici le plan d'implémentation :**

**Principe** : Même pattern universel que tous les autres types → `client_form_panels` + `action_id` + `approved` = chaînage.

**Fichiers à modifier :**
| Fichier | Quoi faire |
|---------|-----------|
| `src/lib/catalogueV2.js` | PAYMENT existe déjà (`isMock: true`). Retirer le flag `isMock` |
| `src/lib/moduleAIConfig.js` | Ajouter `completionTrigger: 'payment_confirmed'`, exemptions validation (pas de formIds/templateIds) |
| `src/components/admin/workflow-v2/ModuleConfigTab.jsx` | UI config PAIEMENT (montant, devise, description) + cacher modes inutiles |
| `src/lib/actionOrderV2.js` | Ajouter PAYMENT dans `validate` + `formatActionOrderForDisplay` |
| `src/lib/executeActionOrderV2.js` | `executePaymentAction()` : créer panel `action_type: 'payment'` + créer session Stripe/lien de paiement + envoyer lien dans le chat |
| `src/components/ProjectDetails.jsx` | Afficher bouton "Payer" côté client (si on veut) |
| Webhook Stripe (Edge Function) | Quand paiement confirmé → UPDATE panel `status: 'approved'` → chaînage standard |

**Flow complet :**
```
1. executePaymentAction → crée panel (action_type='payment', action_id, status='pending')
2. Crée session Stripe → envoie lien paiement dans le chat
3. Client paie → Stripe webhook → Edge Function
4. Edge Function → UPDATE client_form_panels SET status='approved' WHERE id=panelDbId
5. useWorkflowActionTrigger détecte → sendNextAction → action suivante ou passage étape
```

### 🔜 Prochains sujets
- Tester SIGNATURE en multi-actions (ex: MESSAGE → FORM → SIGNATURE)
- Implémenter PAIEMENT quand Stripe sera prêt (voir plan ci-dessus)
- Mission partenaire sans formulaire en multi-actions (edge case)

> **À lire avant de créer un nouveau type d'action ou de modifier le workflow.**

### Concepts clés

```
ÉTAPE (step)           = Phase du projet (Inscription, Collecte, Offre...)
  └── ACTION (action)  = Tâche dans l'étape (Formulaire, Signature, Message...)
       └── SOUS-ÉTAPE (subStep) = Visualisation admin de la progression d'une action
```

- Chaque étape peut avoir **1 ou N actions** configurées dans Workflow V2
- Les actions s'exécutent **séquentiellement** (une seule active à la fois)
- Le passage action → action suivante = **chaînage**
- Le passage étape → étape suivante = **complétion d'étape**

### Cycle de vie d'une action

```
1. Admin exécute l'action (via WorkflowV2RobotPanel)
   → executeActionOrderV2.js → crée un client_form_panel + chat_messages
   → panel.status = 'pending', panel.action_id = 'v2-{moduleId}-action-{index}'

2. Client interagit (remplit formulaire / clique Valider / signe)
   → panel.status = 'submitted' ou 'approved'

3. Si vérification humaine : Admin approuve
   → handleApprove dans ProspectDetailsAdmin → panel.status = 'approved'
   
4. Si clic bouton (MESSAGE) : Client approuve directement
   → handleActionValidate dans ProjectDetails.jsx → panel.status = 'approved'
```

### Mécanisme de chaînage (action → action suivante)

**Fichier clé : `useWorkflowActionTrigger.js`**

```
Real-time listener sur client_form_panels UPDATE
  ↓
Panel passe à 'approved' + a un action_id ?
  ↓ OUI
sendNextAction(completedActionId) dans ProspectDetailsAdmin.jsx
  ↓
Cherche l'action suivante :
  - D'abord dans prompt V1 (stepsConfig.actions) — legacy
  - Sinon dans template V2 (currentModuleConfig.actions) — actuel
  ↓
Si action suivante existe → buildActionOrder + executeActionOrder (chaînage)
Si c'est la dernière action → completeStepAndProceed (passage étape suivante)
```

### Mécanisme de complétion d'étape

**Fichier clé : `completeStepAndProceed` dans `App.jsx`**

```
Signature : completeStepAndProceed(prospectId, projectType, currentStepIndex, currentSteps)
                                                                              ↑ REQUIS !
  ↓
1. Si subSteps → marque la subStep active comme 'completed'
   - Si subStep suivante existe → l'active → NE passe PAS à l'étape suivante
   - Si toutes complétées → passe à l'étape suivante

2. Marque l'étape courante comme 'completed'
3. Active l'étape suivante ('in_progress')
4. Sauvegarde dans project_steps_status (Supabase)
```

### ⚠️ Points critiques pour un nouveau type d'action

| Élément | Obligatoire | Pourquoi |
|---------|-------------|----------|
| `organization_id` dans le panel | ✅ | RLS multi-tenant bloque le client sinon |
| `action_id` dans le panel | ✅ | Nécessaire pour le chaînage (`useWorkflowActionTrigger` vérifie `hasActionId`) |
| `action_type` dans le panel | ✅ | Distinguer form/signature/message |
| `form_id` dans le panel | ❌ nullable | MESSAGE n'a pas de formulaire |
| `completionTrigger` dans moduleAIConfig | ✅ | `form_approved`, `signature_completed`, `button_click` |
| Cas dans `executeActionOrderV2.js` switch | ✅ | Route vers la bonne fonction d'exécution |
| Whitelist dans `canExecuteActionOrder` | ✅ | Sinon l'exécution est bloquée |
| `sendNextAction` fallback V2 | ✅ | Chaînage fonctionne sans prompt V1 |
| `completeStepAndProceed` avec steps | ✅ | Fetch depuis `project_steps_status` avant appel |

### Fichiers impliqués dans le chaînage (ordre d'exécution)

```
1. executeActionOrderV2.js      → Crée le panel + chat (exécution initiale)
2. ProjectDetails.jsx           → Client interagit (boutons, formulaire)
   OU ProspectDetailsAdmin.jsx  → Admin approuve (handleApprove)
3. useWorkflowActionTrigger.js  → Real-time: détecte panel approved
4. ProspectDetailsAdmin.jsx     → sendNextAction() : chaîne ou complète
5. App.jsx                      → completeStepAndProceed() : passe à l'étape suivante
```

---

## 4 mars 2026 (session 2)

### ✅ Features
- **Webhook externe par organisation** : Après création d'un prospect via `webhook-v1`, si l'org a un `external_webhook_url` configuré dans `integration_keys`, un appel POST fire-and-forget est envoyé automatiquement avec les infos du prospect (`event: prospect.created`, `prospect_id`, `owner_id`, `nom`, `email`, `telephone`, `type_projet`, `tags`, `organization_id`, `magic_link_sent`, `created_at`). Ne bloque jamais la réponse 201.
- **Deploy Edge Function** : `webhook-v1` déployé en prod avec `--no-verify-jwt` (Bearer custom, pas JWT Supabase). Config `supabase/config.toml` ajouté.

### 🧪 Tests validés
| Test | Résultat |
|------|----------|
| Créer prospect via curl (Rosca Finance) | ✅ 201 — prospect créé |
| Webhook externe → webhook.site | ✅ POST reçu avec payload complet |
| **Flow complet EVATIME → Hangar 3D** | ✅ Prospect créé sur EVATIME → créé auto sur Hangar 3D → config bâtiment → URL envoyée au client dans le chat → client choisit offre → projet créé dans EVATIME |

### 🗄️ Migrations SQL exécutées
- `add_external_webhook_url_to_integration_keys.sql` — `ALTER TABLE integration_keys ADD COLUMN external_webhook_url TEXT DEFAULT NULL`

### 🔜 Prochains sujets
- Déployer webhook-v1 (`supabase functions deploy webhook-v1`)
- Tester avec webhook.site ou un endpoint réel
- Ajouter UI dans IntegrationsPage pour configurer l'URL webhook externe
- Reprendre config module Make (auth header issue)

---

## 4 mars 2026

### ✅ Features
- **validate_only mode** : `webhook-v1` supporte `{ "validate_only": true }` pour tester une connexion Make/Zapier sans créer de prospect. Retourne `200 { success: true, status: "valid" }` si la clé est bonne.
- **App EVATIME sur Make.com** : App custom configurée sur Make Developer Platform (v1.0.0, published). Module "Create Prospect" fonctionnel end-to-end. Connection Communication pointe sur `webhook-v1` avec `validate_only`.
- **Onglet Make 2 méthodes** : Refonte UX de l'onglet Make dans IntegrationsPage — sélecteur "App EVATIME" (recommandé, 3 étapes) + "Module HTTP" (avancé, 6 étapes). Boutons copie inversés (gros = clé brute pour app, petit = avec Bearer pour HTTP).
- **Action `add_project` dans webhook-v1** : Nouvelle action pour ajouter un projet à un prospect existant via webhook. Body : `{ "action": "add_project", "prospect_id": "UUID", "type_projet": "slug" }`. Ajoute le tag, initialise `project_steps_status` avec les étapes du template (1ère = `in_progress`, reste = `pending`).
- **RPC `add_project_to_prospect`** : Nouvelle fonction SQL SECURITY DEFINER. Vérifie prospect ∈ org, template existe, pas de doublon projet. Retourne `success + prospect_name + steps_count`.
- **Onglet Développeur — Section Add Project** : Documentation complète dans l'onglet Développeur d'IntegrationsPage : contrat JSON, réponse succès 201, exemples curl + fetch, table codes erreurs (MISSING_FIELDS, INVALID_PROSPECT, INVALID_PROJECT_TYPE, DUPLICATE_PROJECT).
- **Module Make "Add Project" (doc)** : Documentation `MAKE_ADD_PROJECT_MODULE.md` pour configurer le 2ème module sur Make Developer Platform (champs `prospect_id` + `type_projet`, Communication JSON, Output interface, tests).
- **Module Add Project dans onglet Make** : Section "Module 2 : Add Project" ajoutée dans la méthode App EVATIME de l'onglet Make, avec instructions et cas d'usage.
- **Diagnostic types Rosca Finance** : Les types `piscine-copie-*` n'existent plus — les 4 types actuels sont déjà propres : `baby`, `fenetre`, `piscine`, `solaire`. Aucun renommage nécessaire.

### 🐛 Bugs fixés
- **Fix `organization_id` manquant** : L'INSERT dans `project_steps_status` de la RPC `add_project_to_prospect` ne passait pas `organization_id` → violation NOT NULL. Corrigé.

### 🗄️ Migrations SQL exécutées
- `add_project_to_prospect.sql` — Nouvelle RPC (CREATE OR REPLACE + GRANT service_role)

### 📄 Fichiers créés
- `MAKE_ADD_PROJECT_MODULE.md` — Documentation 2ème module Make "Add Project"

### 🧪 Tests validés
| Test | Résultat |
|------|----------|
| `validate_only: true` | ✅ 200 — clé valide |
| Créer prospect via Make app EVATIME | ✅ 201 — prospect créé chez Rosca Finance |
| `add_project` fenetre → prospect josh | ✅ 201 — 8 steps initialisées |
| Mauvaise clé | ✅ 401 INVALID_KEY |
| Type projet inexistant | ✅ 400 INVALID_PROJECT_TYPE |
| Diagnostic types Rosca | ✅ 4 types propres (baby, fenetre, piscine, solaire) — aucun piscine-copie-* |

### 🔜 Prochains sujets
- **Configurer le module "Add Project"** sur Make Developer Platform (suivre `MAKE_ADD_PROJECT_MODULE.md`)
- **Action 9** : Tests E2E complets + documentation finale module Intégrations

---

## 2 mars 2026

### ✅ Features
- **Integrations module — Action 1** : Scaffold + docs + navigation + page placeholder `/admin/integrations`
- **Integrations module — Action 2** : Onglet "Sans code" fonctionnel — liens globaux + liens par projet avec `CopyButton` réutilisable
- **Correction Action 2** : Liens passés en org-level pur — suppression `affiliate_slug` / `useUsers` / `useAppContext`, liens basés sur `window.location.origin` uniquement
- **Integrations module — Action 3** : Pré-sélection projet sur `/inscription` via query param `?project={slug}` — validation org-scoped, param invalide ignoré
- **Correction liens** : Ajout liens landing page + partenaire, correction routes (client → `/client-access`, pro → `/login`) alignées sur `App.jsx`
- **Integrations module — Action 4** : Onglet "Make" finalisé — endpoint webhook, headers Bearer, contrat JSON officiel, règles d'attribution (owner_user_id → owner_email → fallback Global Admin), sécurité & mapping, CopyButton partout
- **Action 5.5 — Audit technique** : Analyse complète du flux webhook universel (multi-tenant, création contact/projet, attribution owner, magic link, project templates, risques). Fichier `AUDIT_WEBHOOK_UNIVERSEL.md`.
- **Action 6.1 — 🔒 Security fix** : Suppression UUID hardcodé Jack Luc dans `create_affiliated_prospect`. Fallback remplacé par lookup dynamique `Global Admin` par `organization_id` + exception si absent. Fonction 100% multi-tenant.
- **Action 6.2 — 🔒 Security fix** : `link_prospect_to_auth_user` corrigé multi-tenant. UPDATE limité au prospect le plus récent (`ORDER BY created_at DESC LIMIT 1`) au lieu de tous les prospects avec le même email. Fichier SQL dédié créé.
- **Action 6 — 🚀 Edge Function webhook-v1** : Table `integration_keys` (SHA-256, RLS, permissions), RPC `create_webhook_prospect` (SECURITY DEFINER, validation complète), Edge Function Deno (auth Bearer → org_id, contrat JSON, magic link optionnel, codes HTTP clairs).
- **Action 6 correctif — 🔒 Hardening prod** : `key_hash` UNIQUE, supprimé `updated_at`, pipeline step strict (erreur `NO_PIPELINE_STEP` au lieu de fallback fictif).
- **Correctif alignement webhook-v1** : Magic link revenu à `signInWithOtp` (aligné RegistrationPage.jsx), supprimé `auth.admin.generateLink`. Vérifié SELECT `integration_keys` = 6 colonnes alignées schéma réel.

### 📦 Module Integrations — Checklist Actions
- [x] **Action 1** — Scaffold + docs + navigation + page placeholder
- [x] **Action 2** — Onglet "Sans code" : liens publics, liens par projet, CopyButton
- [x] **Action 3** — Pré-sélection projet via query param `?project=` sur `/inscription`
- [x] **Action 4** — Onglet "Make" : contrat officiel webhook, règles d'attribution, sécurité & mapping
- [x] **Action 5** — Onglet "Développeur" : API keys, Edge Functions (webhook-v1, generate-integration-key)
- [x] **Action 6** — Persistance Supabase : table `integration_keys`, RPC `create_webhook_prospect`
- [x] **Action 7** — App EVATIME sur Make.com : module Create Prospect, validate_only, 2 méthodes UX
- [x] **Action 8** — Action `add_project` : RPC `add_project_to_prospect` + routage webhook-v1
- [ ] **Action 9** — Tests E2E complets + documentation finale

### 🔜 Prochains sujets
- Action 5 Integrations : onglet "Développeur"

---

## 22 février 2026

### ✅ Features
- **Auto-reload chunk obsolète** : `ModuleBoundary.jsx` + `ErrorBoundary.jsx` détectent les erreurs "dynamically imported module" / "Failed to fetch" / "Loading chunk" et rechargent automatiquement la page (sessionStorage anti-boucle 10s). Plus de crash screen après un deploy.

### 🐛 Bugs fixés
- **Crash Charly AI "Failed to fetch dynamically imported module"** : Après deploy, les anciens hashes de chunks n'existent plus → auto-reload transparent au lieu d'écran d'erreur

---

## 21 février 2026

### ✅ Features
- **Isolation chat multi-partenaire** : Colonne `partner_id` sur `chat_messages` + RLS + filtrage dans tous les hooks/pages
- **Dropdown partenaire admin** : Sélecteur orange dans `ProspectDetailsAdmin` fusionnant missions + templates V2
- **Chat partenaire après mission terminée** : Supprimé le filtre `.in('status', ['pending', 'in_progress'])` dans `PartnerCharlyPage` et `usePartnerUnreadCount`
- **Recherche + filtre récent Charly partenaire** : Barre de recherche, filtre "récent/tous", aperçu dernier message, timestamp relatif, highlight bleu unread
- **Tri chronologique Charly** : Sort pur par `lastMessageAt` (style WhatsApp), fix colonne `text` au lieu de `content`
- **Project type sur contacts partenaire** : Préfixe bleu `project_type` sur missions dans `PartnerContactsPage`
- **Commentaire partenaire sur formulaire** : Injection `__partner_comment__` dans `form_data`, affichage orange côté admin, persistence + prefill côté partenaire
- **Nettoyage fichier au remplacement (partenaire)** : Même pattern que client — fetch frais DB + suppression ancien fichier Storage + `project_files` avant upload nouveau

### 🐛 Bugs fixés
- **React Error #31** : Objets `File` rendus comme enfants React → safeguard `typeof value === 'object'` dans admin + partenaire
- **Sort cassé Charly** : Query utilisait `content` (inexistant) au lieu de `text` → `lastMsg` toujours null
- **Fichier orphelin après rejet** : Partenaire n'avait pas de policy RLS DELETE sur `project_files` + `storage.objects`

### 🗄️ Migrations SQL exécutées
- `add_partner_id_to_chat_messages.sql` — Colonne + RLS SELECT/INSERT/UPDATE
- `add_partner_delete_project_files_policy.sql` — RLS DELETE pour partenaires sur `project_files` + `storage.objects`

### 🔜 Prochains sujets potentiels
- Tester signature V2
- Génération PDF depuis `form_data`
- Notifications : tâches vérification humaine
- Nettoyage progressif localStorage → Supabase

---

## 19 février 2026

### ✅ Features
- **Formulaires partenaire** : Création mission → `form_ids` → partenaire voit/remplit formulaire → admin approuve/refuse
- **Validation/Refus admin** : Boutons Approuver/Refuser + raison de refus pour partenaire
- **`filled_by_role`** : Distinction client/partner sur `client_form_panels`

### 🗄️ Migrations SQL
- `add_form_ids_to_missions.sql`
- `add_filled_by_role_to_client_form_panels.sql`
- `add_rejection_reason_to_client_form_panels.sql`
- `add_partner_update_policy_client_form_panels.sql`
- `add_partner_project_files_policies.sql` (INSERT + SELECT)

---

## Janvier 2026

### ✅ Features
- **Workflow V2 Cockpit** : Config IA par module, catalogue V2, simulateur ActionOrder
- **Exécution V2→V1** : Bridge avec feature flags
- **Persistance Supabase** : Table `workflow_module_templates`
- **Signature V2** : Compatible schéma existant
- **Vérification humaine** : `verification_mode` sur `client_form_panels`

---

## ⚠️ Notes pour la prochaine session

- Le fichier `PROJECT_GUIDE.md` décrit la **philosophie** (pipeline calculé, workflows, IA encadrée)
- Le fichier `.github/copilot-instructions.md` décrit l'**architecture technique** (hooks, Supabase, dual-user)
- **CE FICHIER** (`PROGRESS_LOG.md`) décrit **où on en est** — à lire en premier pour comprendre le contexte récent
