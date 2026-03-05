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
