# 🔬 AUDIT TECHNIQUE — Webhook Universel EVATIME

> **Date** : 2 mars 2026
> **Objectif** : Comprendre précisément le fonctionnement actuel d'EVATIME avant d'implémenter le webhook universel.
> **Règle** : Aucun code produit, aucune migration. Analyse uniquement.

---

## 1️⃣ Modèle multi-tenant

### Où est stocké `organization_id` ?

| Table | Colonne | Mode |
|-------|---------|------|
| `organizations` | `id` (PK) | Table maître |
| `organization_domains` | `organization_id` (FK) | Résolution hostname → org_id |
| `organization_settings` | `organization_id` (FK) | Branding, landing config |
| `users` | `organization_id` (FK, direct) | ✅ Direct |
| `prospects` | `organization_id` (FK, direct) | ✅ Direct |
| `project_templates` | `organization_id` (FK, direct) | ✅ Direct |
| `project_steps_status` | `organization_id` (direct) | ✅ Direct |
| `client_form_panels` | `organization_id` (direct) | ✅ Direct |
| `global_pipeline_steps` | `organization_id` (direct) | ✅ Direct |
| `signature_procedures` | `organization_id` (direct) | ✅ Direct |
| `partners` / `missions` | `organization_id` (direct) | ✅ Direct |
| `appointments` | `organization_id` (direct, via migration) | ✅ Direct + trigger auto-fill |
| `tasks` | `organization_id` (direct, via migration) | ✅ Direct |
| `chat_messages` | via `prospect_id` → indirect | ⚠️ Indirect |
| `notifications` | via `owner_id` → indirect | ⚠️ Indirect |

### Comment est appliqué le RLS ?

- **Toutes les tables métier ont RLS activé** (`ENABLE ROW LEVEL SECURITY`)
- Policies basées sur `auth.uid()` → lookup dans `public.users` (admin) ou `prospects.user_id` (client)
- **Les RPC `SECURITY DEFINER` contournent RLS** — C'est la stratégie choisie pour les insertions anonymes (inscription)
- `resolve_organization_from_host(host)` → déployée en DB, retourne `UUID` depuis `organization_domains`
- **Pas de JWT claims** avec `organization_id` — tout est résolu runtime

### Services server-side qui bypassent RLS

| Fonction | Mode | Usage |
|----------|------|-------|
| `create_affiliated_prospect` | `SECURITY DEFINER` | Inscription anonyme |
| `check_prospect_exists_in_org` | `SECURITY DEFINER` | Vérif doublon anonyme |
| `update_prospect_safe` | `SECURITY DEFINER` | Update admin scopé |
| `update_own_prospect_profile` | `SECURITY DEFINER` | Update client |
| `link_prospect_to_auth_user` | `SECURITY DEFINER` | Trigger sur `auth.users` INSERT |
| `auto_assign_prospect_owner` | `SECURITY DEFINER` | Trigger sur `prospects` INSERT |
| `resolve_organization_from_host` | `SECURITY DEFINER` | Résolution hostname |

---

## 2️⃣ Création contact (prospect)

### Flux d'inscription (`RegistrationPage.jsx`)

```
1. check_prospect_exists_in_org(email, org_id)  →  doublon? stop
2. create_affiliated_prospect(name, email, phone, ..., tags, host)  →  INSERT prospect
3. supabase.auth.signInWithOtp(email, shouldCreateUser: true)  →  Magic Link
```

### RPC `create_affiliated_prospect` — Paramètres

| Paramètre | Type | Rôle |
|-----------|------|------|
| `p_name` | text | Nom |
| `p_email` | text | Email |
| `p_phone` | text | Téléphone |
| `p_company` | text | Société |
| `p_address` | text | Adresse |
| `p_affiliate_slug` | text | Slug du commercial parrain |
| `p_tags` | text[] | Projets sélectionnés (ex: `['ACC', 'Centrale']`) |
| `p_status` | text | Pipeline step (null = auto first step) |
| `p_host` | text | Hostname pour résolution org |

### Logique interne de la RPC

1. `resolve_organization_from_host(p_host)` → `v_organization_id`
2. Si `p_affiliate_slug` fourni → lookup `users` WHERE `affiliate_slug` = slug AND `organization_id` = org → `v_owner_id`
3. **Fallback hardcodé** : `v_default_jack_id := '82be903d-...'` (UUID Jack Luc) ⚠️
4. Lookup first `global_pipeline_steps` ordered by `created_at` → `v_first_step_id`
5. INSERT prospect avec `organization_id`, `owner_id`, `tags`, `status`
6. Retourne `prospect_id` (UUID)

### Clé d'unicité

- **Email seul** → pas d'index UNIQUE sur `email` dans `prospects`
- **Vérification applicative** via `check_prospect_exists_in_org(email, org_id)` → `email + organization_id`
- **Même email peut exister dans 2 orgs différentes** ✅

### Création côté admin (`addProspect` dans `useSupabaseProspects.js`)

- INSERT direct via `supabase.from('prospects').insert(...)` — pas de RPC
- `owner_id` = `activeAdminUser.user_id` (le commercial connecté)
- `organization_id` = `organizationId` du contexte
- Passe par les RLS policies normales (user authentifié)

---

## 3️⃣ Création projet

### Comment un projet est "créé" pour un prospect

**Il n'y a pas de table "projet" dédiée.** Un projet = une entrée dans `project_steps_status` :

```
prospects.tags = ['ACC', 'Centrale']  →  2 entrées dans project_steps_status
```

### Mécanisme automatique

1. Le prospect est créé avec `tags: ['ACC', 'Centrale']`
2. Un **trigger PostgreSQL** `trigger_init_project_steps_on_tags_changed` détecte le changement de `tags`
3. Pour chaque tag ajouté, crée une entrée dans `project_steps_status` :
   - `prospect_id` = prospect.id
   - `project_type` = tag (FK → `project_templates.type`)
   - `steps` = JSONB copié depuis `project_templates.steps`

### Relation contact → projet

```
prospects.id  ←→  project_steps_status.prospect_id (1:N)
prospects.tags = ['ACC']  ↔  project_steps_status WHERE project_type = 'ACC'
```

### `owner_user_id` sur projet ?

**Il n'existe pas.** Le owner est sur le **prospect**, pas sur le projet. Un prospect a UN owner, et ses N projets héritent du même owner.

---

## 4️⃣ Attribution Owner actuelle

### Inscription via landing page (sans affiliation)

```
RegistrationPage → create_affiliated_prospect(p_affiliate_slug: null)
  → v_owner_id = NULL
  → fallback → v_default_jack_id = '82be903d-...' (Jack Luc hardcodé)
```

⚠️ **PROBLÈME CRITIQUE** : Le fallback est un UUID hardcodé (Jack Luc). Pour un webhook multi-tenant, ce fallback NE FONCTIONNE PAS car Jack Luc n'existe pas dans toutes les orgs.

### Inscription via affiliation (`/inscription/jack-luc`)

```
RegistrationPage → create_affiliated_prospect(p_affiliate_slug: 'jack-luc')
  → lookup users WHERE affiliate_slug = 'jack-luc' AND organization_id = org
  → v_owner_id = commercial trouvé
```

### Création admin (Pipeline/Contacts)

```
addProspect({ ownerId: activeAdminUser.user_id })
  → INSERT prospects SET owner_id = user_id du commercial connecté
```

### Trigger auto-assign

```sql
-- Si owner_id est NULL, assigner auth.uid()
auto_assign_prospect_owner() → NEW.owner_id := auth.uid()
```

Mais ce trigger ne s'applique PAS aux RPCs `SECURITY DEFINER` (pas d'`auth.uid()` dans ce contexte).

---

## 5️⃣ Magic Link

### Déclenchement

```javascript
supabase.auth.signInWithOtp({
  email: email.trim(),
  options: {
    shouldCreateUser: true,  // ⚠️ OBLIGATOIRE
    emailRedirectTo: `${window.location.origin}/dashboard`,
  }
})
```

### Trigger de liaison prospect ↔ auth user

```sql
CREATE TRIGGER after_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION link_prospect_to_auth_user();

-- La fonction :
UPDATE prospects SET user_id = NEW.id WHERE email = NEW.email AND user_id IS NULL;
```

⚠️ **RISQUE** : Ce trigger lie par **email seul** (pas par `organization_id`). Si un même email existe dans 2 orgs, seul le premier prospect non-lié sera associé.

### Séquence complète

```
1. create_affiliated_prospect  →  prospect créé (user_id = NULL)
2. signInWithOtp               →  auth.users INSERT → trigger
3. link_prospect_to_auth_user  →  UPDATE prospects SET user_id WHERE email = X
4. Client clique le lien       →  session Supabase → App.jsx loadAuthUser
5. loadAuthUser                →  SELECT prospects WHERE user_id AND organization_id
```

### Appel direct possible ?

Oui. `supabase.auth.signInWithOtp` est appelable depuis n'importe quel contexte JS. Pas de gate admin.

---

## 6️⃣ Project Templates / type_projet

### Table `project_templates`

| Colonne | Type | Rôle |
|---------|------|------|
| `type` | `TEXT UNIQUE NOT NULL` | **Clé de référence** (ex: `ACC`, `Centrale`) |
| `organization_id` | UUID | Scoped par org |
| `is_public` | BOOLEAN | Visibilité client |
| `steps` | JSONB | Structure des étapes |

### Résolution type → template

- Le `type` est un **texte libre** (pas un slug normalisé)
- La RPC `get_project_templates_for_org(p_organization_id)` retourne templates de l'org + templates globaux (NULL)
- Le hook `useSupabaseProjectTemplates` transforme snake_case → camelCase
- `slugify(template.type)` est utilisé uniquement côté frontend pour les URLs d'intégration

### Contrainte FK

```sql
project_steps_status.project_type → project_templates.type
```

Le `type` envoyé dans `tags[]` **doit exactement correspondre** à un `project_templates.type` existant dans l'org, sinon le trigger `init_project_steps` échoue.

---

## 7️⃣ Points de risque pour le webhook

### 🔴 Risque 1 : Fallback owner hardcodé

```sql
v_default_jack_id := '82be903d-9600-4c53-9cd4-113bfaaac12e';
```

Ce UUID existe dans l'org Locasun. Pour un webhook multi-tenant, il faut un **fallback dynamique** : Global Admin de l'org cible.

### 🔴 Risque 2 : `link_prospect_to_auth_user` ne scope pas par org

```sql
UPDATE prospects SET user_id = NEW.id WHERE email = NEW.email AND user_id IS NULL;
```

Si le webhook crée un prospect + envoie un magic link, et que le même email existe dans 2 orgs, le mauvais prospect pourrait être lié.

### 🟡 Risque 3 : `type_projet` inconnu

Si le webhook envoie `type_projet: "piscine"` et que ce type n'existe pas dans `project_templates` pour cette org, le trigger `init_project_steps` échouera silencieusement ou l'INSERT `project_steps_status` violera la FK.

### 🟡 Risque 4 : `global_pipeline_steps` vide

La RPC cherche le premier `global_pipeline_steps` par `created_at`. Si une org n'a pas de pipeline steps, `status` sera NULL → possible violation de CHECK constraint.

### 🟢 Risque 5 : `check_prospect_exists_in_org` non appelé

Si le webhook ne vérifie pas les doublons, il pourrait créer des prospects en double.

---

## A) Schéma simplifié des tables impliquées

```
organizations
  ├── organization_domains (hostname → org_id)
  ├── organization_settings (branding)
  ├── users (admins/commerciaux)
  │     └── affiliate_slug (pour attribution)
  ├── prospects (contacts)
  │     ├── owner_id → users.id
  │     ├── user_id → auth.users.id (NULL si pas inscrit)
  │     ├── tags[] (projets)
  │     └── organization_id
  ├── project_templates (modèles de projets)
  │     ├── type (TEXT UNIQUE, clé de référence)
  │     └── steps (JSONB)
  ├── project_steps_status (instance projet par prospect)
  │     ├── prospect_id → prospects.id
  │     └── project_type → project_templates.type
  └── global_pipeline_steps (colonnes pipeline)
        └── step_id, name, position
```

---

## B) Diagramme logique du flux actuel (inscription)

```
┌─────────────────┐
│ Client / Make   │
│ POST /inscription│
└────────┬────────┘
         │
         ▼
┌────────────────────────────────────────┐
│ check_prospect_exists_in_org(email, org)│  ← RPC SECURITY DEFINER
│ Doublon ? → STOP                        │
└────────┬───────────────────────────────┘
         │ Non
         ▼
┌────────────────────────────────────────┐
│ create_affiliated_prospect(            │  ← RPC SECURITY DEFINER
│   name, email, tags[], host            │
│ )                                      │
│                                        │
│ 1. resolve_organization_from_host(host)│
│ 2. Lookup affiliate_slug → owner_id   │
│ 3. Fallback → Jack Luc hardcodé ⚠️    │
│ 4. First global_pipeline_step → status │
│ 5. INSERT prospects                    │
│ 6. TRIGGER → init project_steps_status │
│ 7. Return prospect_id                 │
└────────┬───────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────┐
│ supabase.auth.signInWithOtp({          │
│   email, shouldCreateUser: true        │
│ })                                     │
│                                        │
│ → auth.users INSERT                    │
│ → TRIGGER link_prospect_to_auth_user   │
│   UPDATE prospects SET user_id = X     │
│   WHERE email = X AND user_id IS NULL  │
└────────────────────────────────────────┘
```

---

## C) Fonctions à réutiliser pour le webhook

| Fonction | Usage dans le webhook | Appel |
|----------|----------------------|-------|
| `resolve_organization_from_host(host)` | Résoudre l'org depuis un identifiant | Interne à la RPC |
| `check_prospect_exists_in_org(email, org_id)` | Vérif doublon avant création | RPC directe |
| `create_affiliated_prospect(...)` | Créer le prospect + projets | RPC directe (**à modifier** pour supporter owner_user_id / owner_email au lieu de affiliate_slug uniquement) |
| `signInWithOtp` | Envoyer magic link (optionnel) | API Supabase Auth |
| `get_project_templates_for_org(org_id)` | Valider que `type_projet` existe | RPC directe |

---

## D) Choses à ne surtout PAS faire

| ❌ Interdit | Raison |
|------------|--------|
| Appeler `supabase.from('prospects').insert()` depuis un user anonyme | RLS bloquera — seuls les admins authentifiés peuvent INSERT directement |
| Utiliser le fallback hardcodé Jack Luc pour d'autres orgs | UUID spécifique à Locasun |
| Envoyer un `type_projet` non validé contre `project_templates` | FK violation + trigger crash |
| Bypasser `check_prospect_exists_in_org` | Doublons possibles |
| Créer une Edge Function avec `service_role_key` exposée côté client | Bypass total de la sécurité RLS |
| Faire confiance au `owner_user_id` sans vérifier qu'il appartient à l'org | Cross-org owner injection |
| Envoyer le magic link sans vérifier que le prospect a été créé | auth.users orphelin |

---

## E) Proposition d'architecture webhook basée sur l'existant

```
┌──────────────────────────────────────────────────┐
│ POST https://api.evatime.fr/webhook/v1           │
│ Headers: Authorization: Bearer <integration_key> │
│ Body: { type_projet, contact, project, ...}      │
└─────────────────────┬────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────┐
│ Supabase Edge Function: webhook-universal        │
│                                                  │
│ 1. Valider Bearer → lookup integration_keys      │
│    WHERE key = token → org_id + permissions      │
│    (⚠️ nouvelle table `integration_keys`)        │
│                                                  │
│ 2. Valider type_projet                           │
│    → RPC get_project_templates_for_org(org_id)   │
│    → type_projet ∈ templates ? sinon → 400       │
│                                                  │
│ 3. Check doublon                                 │
│    → RPC check_prospect_exists_in_org(email, org)│
│    → existe ? → 409 Conflict                     │
│                                                  │
│ 4. Résoudre owner                                │
│    → owner_user_id fourni ? verify ∈ org → use   │
│    → owner_email fourni ? lookup users ∈ org     │
│    → sinon → SELECT user_id FROM users           │
│      WHERE org_id AND role = 'Global Admin'      │
│      LIMIT 1 (⚠️ fallback dynamique, PAS Jack)  │
│                                                  │
│ 5. Créer prospect                                │
│    → Variante de create_affiliated_prospect      │
│    OU nouvelle RPC create_webhook_prospect(       │
│      name, email, phone, tags, owner_id, org_id  │
│    ) SECURITY DEFINER                            │
│                                                  │
│ 6. (Optionnel) Envoyer magic link                │
│    → supabaseAdmin.auth.admin.generateLink(...)  │
│    OU signInWithOtp si le flow le justifie        │
│                                                  │
│ 7. Retourner { prospect_id, status: "created" }  │
└──────────────────────────────────────────────────┘
```

### Pourquoi cette architecture

- **Pas de modification de `create_affiliated_prospect`** — trop de risque de casser l'inscription existante
- **Nouvelle RPC `create_webhook_prospect`** — similaire mais avec `owner_id` direct (pas `affiliate_slug`) et fallback Global Admin dynamique
- **Edge Function** — seul endroit sûr pour valider le Bearer token (le frontend n'a jamais accès aux clés)
- **Nouvelle table `integration_keys`** — `org_id`, `key_hash`, `permissions`, `created_by`, `expires_at`
- **Pas de `service_role_key` exposée** — l'Edge Function utilise `SUPABASE_SERVICE_ROLE_KEY` en interne uniquement

---

> **FIN DE L'AUDIT — Aucun code produit. Aucune migration proposée.**
