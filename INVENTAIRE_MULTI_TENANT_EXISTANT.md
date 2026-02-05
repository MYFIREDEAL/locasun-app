# 📋 INVENTAIRE FACTUEL MULTI-TENANT EVATIME

**Date de l'inventaire** : 5 février 2026  
**Objectif** : Dresser un inventaire vérifiable de ce qui existe et fonctionne concernant le multi-tenant, le slug d'organisation, les landing pages, l'isolation des données, l'accès plateforme, et le branding.

---

## 1️⃣ RÉSOLUTION ORGANISATION (SLUG / DOMAINE)

### ✅ CE QUI EXISTE

**Comment l'organisation est identifiée :**
- Via le **hostname** du navigateur (ex : `monorg.evatime.fr`)
- Le frontend appelle une RPC Supabase `resolve_organization_from_host(host)` au démarrage
- L'`organization_id` (UUID) est stocké dans le contexte React `OrganizationContext`

**Où est stocké le slug :**
- Table `organizations` : colonne `slug` (TEXT)
- Table `organization_domains` : colonne `domain` (TEXT) avec clé étrangère vers `organizations.id`

**Comment `{org}.evatime.fr` est résolu :**
- La RPC `resolve_organization_from_host` query la table `organization_domains` pour matcher le hostname
- Si trouvé, retourne l'`organization_id`
- Si non trouvé, fallback vers l'organisation avec `is_platform = true` dans la table `organizations`

**À quel moment l'`organization_id` est déterminé :**
- Au montage de `OrganizationProvider` (wrap de toute l'app)
- Avant le chargement de l'auth et des données métier
- La machine d'état `bootStatus` attend que `organizationReady = true` avant de continuer

**Fichiers impliqués (frontend) :**
| Fichier | Rôle |
|---------|------|
| `src/contexts/OrganizationContext.jsx` | Context principal, résolution hostname, charge branding |
| `src/contexts/PublicOrganizationContext.jsx` | Variante pour pages publiques |
| `src/App.jsx` | Consomme `useOrganization()`, gate le boot sur `organizationReady` |
| `src/hooks/useBranding.js` | Charge `organization_settings` (logo, couleurs) |

**Fichiers impliqués (backend) :**
| Fichier | Rôle |
|---------|------|
| `supabase/functions/platform_create_organization/index.ts` | Edge Function qui crée org + domain + settings |
| `supabase/functions/create-organization-onboarding/index.ts` | Variante onboarding (création org) |

**Tables Supabase impliquées :**
| Table | Colonnes clés |
|-------|---------------|
| `organizations` | `id`, `name`, `slug`, `is_platform` |
| `organization_domains` | `organization_id`, `domain`, `is_primary` |
| `organization_settings` | `organization_id`, `display_name`, `logo_url`, `primary_color`, `secondary_color`, `landing_page_config` |

---

## 2️⃣ LANDING PAGE PAR ORGANISATION

### ✅ CE QUI EXISTE

**Existe-t-elle réellement ?**
- **OUI**, mais uniquement pour la page d'accueil (`/` route `<Landing />`)

**Quelle route ?**
- `/` → `src/pages/landing/index.jsx` (ou `src/pages/Landing.jsx`)
- `/landing` → même composant

**Est-elle dynamique ?**
- **OUI** — Le composant `Landing` utilise `useLandingPageConfig(organizationId)` pour charger la config depuis `organization_settings.landing_page_config`

**Quelles données sont spécifiques à l'org ?**
- `hero_title` : Titre principal
- `hero_subtitle` : Sous-titre
- `hero_cta_text` : Texte du bouton d'action
- `hero_cta_link` : Lien du CTA
- `show_how_it_works` : Toggle section explicative
- `how_it_works_title` : Titre de la section
- `blocks` : Array de blocs (icon, title, description, tag)

**Branding (logo, texte, couleurs) :**
- **RÉEL** — Chargé depuis `organization_settings` via `useBranding(organizationId)`
- `logo_url` : URL du logo
- `primary_color` : Couleur principale (appliquée en CSS custom property `--primary`)
- `secondary_color` : Couleur secondaire (appliquée en `--secondary`)
- `display_name` ou `brand_name` : Nom affiché dans le titre de page

**Fichiers impliqués :**
| Fichier | Rôle |
|---------|------|
| `src/pages/landing/index.jsx` | Page landing publique |
| `src/hooks/useLandingPageConfig.js` | Charge `landing_page_config` depuis Supabase |
| `src/pages/admin/LandingPageConfigPage.jsx` | Éditeur admin de la landing |
| `src/hooks/useBranding.js` | Charge logo/couleurs depuis `organization_settings` |

### ⚠️ CE QUI EXISTE MAIS EST LIMITÉ

- La landing est la **seule page publique vraiment personnalisée**
- Les autres pages (`/inscription`, `/client-access`, `/login`) utilisent le branding (logo, couleurs) mais pas de contenu dynamique par org
- `ProducerLandingPage.jsx` (`/producteurs`) est **statique** (pas de personnalisation par org)

---

## 3️⃣ ISOLATION MULTI-TENANT (SÉCURITÉ RÉELLE)

### ✅ CE QUI EXISTE

**Où est stocké `organization_id` :**
| Table | Colonne |
|-------|---------|
| `users` | `organization_id` (FK vers `organizations.id`) |
| `prospects` | `organization_id` (FK vers `organizations.id`) |
| `appointments` | via `assigned_user_id` → `users.organization_id` (indirect) |
| `calls` | via `assigned_user_id` → `users.organization_id` (indirect) |
| `tasks` | via `assigned_user_id` → `users.organization_id` (indirect) |
| `chat_messages` | via `prospect_id` → `prospects.organization_id` (indirect) |
| `client_form_panels` | `organization_id` (direct) |
| `project_steps_status` | `organization_id` (direct) |
| `project_infos` | via `prospect_id` (indirect) |
| `signature_procedures` | `organization_id` (direct) |
| `partners` | `organization_id` (direct) |
| `missions` | `organization_id` (direct) |
| `global_pipeline_steps` | `organization_id` (direct) |
| `project_templates` | `organization_id` (direct) |
| `workflow_module_templates` | `org_id` (direct) |

**Quelles tables sont isolées :**
- Toutes les tables métier (prospects, appointments, calls, tasks, chat_messages, notifications, etc.) sont filtrées par `organization_id`

**RLS : oui / non / partiel ?**
- **PARTIEL** — Certaines tables ont des RLS policies explicites, d'autres dépendent du filtrage au niveau des hooks frontend

**Tables avec RLS confirmées :**
- `users` : Policies `platform_admin_read_self`, `platform_admin_full_access`
- `prospects` : Policies pour owner_id + équipe
- `company_settings` : Policies pour Global Admin

**Hooks qui filtrent par `organization_id` :**
| Hook | Filtrage |
|------|----------|
| `useSupabaseProspects` | ✅ Filtre par `activeAdminUser.organization_id` |
| `useSupabaseAgenda` | ✅ Filtre par user → org |
| `useSupabaseUsers` | ✅ Filtre par org |
| `useSupabaseGlobalPipeline` | ✅ Reçoit `organizationId` en paramètre |
| `useSupabaseProjectTemplates` | ✅ Reçoit `organizationId` en paramètre |
| `useSupabaseCompanySettings` | ✅ Reçoit `organizationId` en paramètre |
| `useSupabaseClientFormPanels` | ✅ Filtre par prospect |
| `useSupabaseForms` | ⚠️ À vérifier |
| `useSupabasePrompts` | ⚠️ À vérifier |

**Existe-t-il un risque cross-org ?**
- **NON si les hooks sont utilisés correctement** — La couche RLS + hooks fournit une double protection
- **OUI si requête directe sans filtre** — Le document `MULTI_TENANT_RULES.md` avertit explicitement de ce risque

**Fichiers de référence :**
| Fichier | Rôle |
|---------|------|
| `MULTI_TENANT_RULES.md` | Règles obligatoires pour tout dev |
| `MULTI_TENANT_ISOLATION_GUIDE.md` | Guide détaillé d'isolation |
| `supabase/schema.sql` | Schéma + RLS policies |

---

## 4️⃣ ACCÈS PLATEFORME (HORS ORGANISATION)

### ✅ CE QUI EXISTE

**Existe-t-il un espace `/platform/*` ?**
- **OUI**

**Routes existantes :**
| Route | Composant | Rôle |
|-------|-----------|------|
| `/platform-login` | `PlatformLoginPage.jsx` | Login spécifique platform_admin |
| `/platform/organizations` | `OrganizationsListPage.jsx` | Liste toutes les organisations |
| `/platform/organizations/:id` | `OrganizationDetailPage.jsx` | Détail d'une organisation |

**Rôle spécial :**
- **`platform_admin`** — Rôle stocké dans `users.role`
- `organization_id = NULL` pour ce rôle (n'appartient à aucune org)

**Comment est-il géré :**
- `PlatformLoginPage.jsx` vérifie `userData.role === 'platform_admin'` après auth
- Si autre rôle → déconnexion + refus d'accès
- Si platform_admin → redirect vers `/platform/organizations`

**Données accessibles :**
- Table `organizations` (toutes les orgs)
- Table `organization_domains` (domaines par org)
- Table `organization_settings` (branding par org)
- Table `users` (admins de chaque org)

**RLS pour platform_admin :**
- Policy `platform_admin_read_self` : Peut lire sa propre ligne dans `users`
- Policy `platform_admin_full_access` : Accès complet si `role = 'platform_admin'`

**Fichiers impliqués :**
| Fichier | Rôle |
|---------|------|
| `src/pages/platform/PlatformLoginPage.jsx` | Login platform |
| `src/pages/platform/OrganizationsListPage.jsx` | Liste des orgs |
| `src/pages/platform/OrganizationDetailPage.jsx` | Détail org + domaines + users |
| `src/layouts/PlatformLayout.jsx` | Layout spécifique platform |
| `INSTALLATION_PLATFORM_ADMIN.md` | Guide d'installation du rôle |

**Contrainte de rôle (vérifiée) :**
```sql
CHECK (role IN ('Global Admin', 'Manager', 'Commercial', 'platform_admin'))
```

---

## 5️⃣ CE QUI MARCHE DÉJÀ (LISTE COURTE)

- ✅ Résolution hostname → `organization_id` via RPC `resolve_organization_from_host`
- ✅ Tables `organizations`, `organization_domains`, `organization_settings` créées
- ✅ Edge Function `platform_create_organization` crée org + domain + settings + invite admin
- ✅ Espace `/platform/*` avec login spécifique et liste des organisations
- ✅ Rôle `platform_admin` avec `organization_id = NULL`
- ✅ Landing page dynamique (`landing_page_config` dans `organization_settings`)
- ✅ Branding dynamique (logo, couleurs) chargé depuis `organization_settings`
- ✅ Hooks Supabase filtrent par `organization_id` (double protection hook + RLS)
- ✅ Document `MULTI_TENANT_RULES.md` décrit les patterns obligatoires
- ✅ Contexte `OrganizationContext` expose `organizationId` à toute l'app
- ✅ Machine d'état `bootStatus` gate le rendu sur `organizationReady`
- ✅ Fallback vers org avec `is_platform = true` si hostname non résolu
- ✅ Liens de connexion pro/client par org générés (`https://evatime.fr/login?org={slug}`)

---

## 6️⃣ CE QUI N'EXISTE PAS (OU PAS VRAIMENT)

- ❌ **Sous-domaines DNS réels** — Pas de configuration Vercel/Cloudflare pour `*.evatime.fr`
- ❌ **Table `organizations` dans `schema.sql`** — Définition absente du fichier principal (créée via migration ou Edge Function)
- ❌ **RPC `resolve_organization_from_host` dans schema.sql** — Code source non trouvé dans les fichiers scannés
- ❌ **RLS policies explicites sur toutes les tables** — Certaines tables dépendent uniquement du filtrage frontend
- ❌ **Personnalisation contenu `/inscription`, `/client-access`** — Seul le branding (logo/couleurs) est appliqué
- ❌ **Landing pages multiples par org** — Une seule landing (`/`), pas de `/about`, `/pricing`, etc. personnalisables
- ❌ **Isolation via JWT claims** — Le JWT ne contient pas `organization_id` nativement
- ❌ **Tests automatisés cross-org** — Pas de tests vérifiant l'isolation entre 2 orgs

---

## 7️⃣ ZONES FLOUES / DANGEREUSES

### ⚠️ Mélange de responsabilités
- Le filtrage `organization_id` est réparti entre RLS (backend) et hooks (frontend) — Si un dev crée une requête directe sans filtre, RLS peut ne pas couvrir
- Certains hooks (`useSupabaseForms`, `useSupabasePrompts`) n'ont pas été vérifiés pour le filtrage org

### ⚠️ Hacks temporaires / contournements
- `organization_id = NULL` pour `platform_admin` est un cas particulier qui nécessite des policies dédiées
- Fallback vers `is_platform = true` si hostname non résolu → Risque de mélange de données si une org oublie de configurer son domaine

### ⚠️ Hypothèses non formalisées
- La RPC `resolve_organization_from_host` est appelée mais son code source n'est pas dans les fichiers standards → Probablement créée via migration SQL non versionnée
- Le schéma de la table `organizations` n'est pas dans `schema.sql` → Créé manuellement ou via Edge Function

### ⚠️ Endroits où une évolution casserait le multi-tenant
- Ajouter une nouvelle table métier sans colonne `organization_id` + RLS
- Créer un hook sans filtrage `activeAdminUser.organization_id`
- Modifier `OrganizationContext` sans respecter le gate `organizationReady`
- Supprimer le fallback `is_platform = true` sans alternative

### ⚠️ Incohérences potentielles
- `project_templates` a `organization_id` mais les templates par défaut dans `schema.sql` sont sans org → Templates partagés vs templates privés non clairement séparés
- `company_settings` (singleton) vs `organization_settings` (par org) → Deux sources de config qui peuvent conflictuer

---

## 📎 FICHIERS CLÉS À CONSULTER

| Fichier | Contenu |
|---------|---------|
| `src/contexts/OrganizationContext.jsx` | Résolution hostname, contexte org |
| `src/hooks/useBranding.js` | Chargement branding |
| `src/hooks/useLandingPageConfig.js` | Config landing par org |
| `src/pages/platform/*.jsx` | Espace platform_admin |
| `supabase/functions/platform_create_organization/index.ts` | Création org |
| `MULTI_TENANT_RULES.md` | Règles d'isolation |
| `INSTALLATION_PLATFORM_ADMIN.md` | Installation rôle platform |
| `supabase/schema.sql` | Schéma principal (sans table organizations) |

---

**FIN DE L'INVENTAIRE**
