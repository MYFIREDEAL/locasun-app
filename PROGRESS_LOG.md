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
