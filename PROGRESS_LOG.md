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

### 📦 Module Integrations — Checklist Actions
- [x] **Action 1** — Scaffold + docs + navigation + page placeholder
- [x] **Action 2** — Onglet "Sans code" : liens publics, liens par projet, CopyButton
- [x] **Action 3** — Pré-sélection projet via query param `?project=` sur `/inscription`
- [x] **Action 4** — Onglet "Make" : contrat officiel webhook, règles d'attribution, sécurité & mapping
- [ ] **Action 5** — Onglet "Développeur" : webhook in/out, API keys
- [ ] **Action 6** — Persistance Supabase des configs d'intégration
- [ ] **Action 7** — Tests E2E + validation UX
- [ ] **Action 8** — Documentation finale + release notes

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
