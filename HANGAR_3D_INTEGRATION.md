# ✅ Flow EVATIME ↔ Hangar 3D — Documentation complète

> **Date** : 6 mars 2026 (mis à jour)  
> **Statut** : Validé end-to-end (Rosca Finance = preuve vivante)  
> **⚠️ Ce fichier est de la documentation uniquement — aucune modification de code.**

---

## 🔥 0️⃣ EVATIME notifie Hangar 3D automatiquement via trigger PostgreSQL

### Découverte du 6 mars 2026

Un **trigger PostgreSQL `notify_hangar3d_prospect`** existe dans la base Supabase d'EVATIME. Il est déclenché automatiquement sur la table `prospects` et envoie les données vers Hangar 3D.

### Code source du trigger (lu via `pg_get_functiondef`)

```sql
CREATE OR REPLACE FUNCTION public.notify_hangar3d_prospect()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_owner_email text;
BEGIN
  -- 1. Récupère l'email du commercial (owner) depuis la table users
  SELECT email
  INTO v_owner_email
  FROM public.users
  WHERE user_id = NEW.owner_id
  LIMIT 1;

  -- 2. Envoie un HTTP POST vers l'API Hangar 3D via pg_net
  PERFORM net.http_post(
    url := 'https://locasun-invest.vercel.app/api/inbound/evatime',
    headers := jsonb_build_object(
      'Content-Type','application/json'
    ),
    body := jsonb_build_object(
      'prospect_id', NEW.id,
      'owner_email', v_owner_email,
      'nom', NEW.name,
      'email', NEW.email
    )
  );

  RETURN NEW;
END;
$function$
```

### Analyse du trigger

| Aspect | Détail |
|--------|--------|
| **Type** | Trigger PostgreSQL **AFTER INSERT** uniquement sur `prospects` (nom: `trigger_notify_hangar3d`) |
| **Mécanisme** | `pg_net` extension — HTTP POST asynchrone (fire-and-forget) |
| **URL cible** | `https://locasun-invest.vercel.app/api/inbound/evatime` |
| **Authentification** | ⚠️ **Aucune** — pas de Bearer token, pas de clé API, juste `Content-Type` |
| **Données envoyées** | `prospect_id`, `owner_email`, `nom`, `email` (4 champs seulement) |
| **Condition** | Se déclenche pour toute org dont la clé d'intégration est activée |

### Payload envoyé vers Hangar 3D

```json
{
  "prospect_id": "uuid-du-prospect",
  "owner_email": "commercial@org.com",
  "nom": "Jean Dupont",
  "email": "jean.dupont@email.com"
}
```

### Endpoint Hangar 3D récepteur

`POST https://locasun-invest.vercel.app/api/inbound/evatime`

C'est une **API route Next.js** (ou Vercel Serverless Function) côté Hangar 3D qui reçoit la notification et crée/synchronise le prospect dans son propre système.

### Tous les triggers sur la table `prospects`

> Requête : `SELECT trigger_name, event_manipulation, action_timing FROM information_schema.triggers WHERE event_object_table = 'prospects';`

| Trigger | Événement | Timing | Rôle |
|---------|-----------|--------|------|
| `auto_assign_owner_on_insert` | INSERT | BEFORE | Auto-assigne le `owner_id` |
| `trigger_init_project_steps_on_tags_changed` | INSERT | AFTER | Initialise les étapes projet |
| `trigger_init_project_steps_on_tags_changed` | UPDATE | AFTER | Réinitialise étapes si tags changent |
| **`trigger_notify_hangar3d`** | **INSERT** | **AFTER** | **Push prospect vers Hangar 3D** |
| `update_prospects_updated_at` | UPDATE | BEFORE | Met à jour `updated_at` |

### Ordre d'exécution sur INSERT

```
1. BEFORE INSERT : auto_assign_owner_on_insert (assigne owner_id)
2. INSERT effectif dans prospects
3. AFTER INSERT : trigger_init_project_steps_on_tags_changed (crée les étapes)
4. AFTER INSERT : trigger_notify_hangar3d (notifie Hangar 3D)
```

> ⚠️ Le trigger ne se déclenche **pas sur UPDATE** — seuls les nouveaux prospects sont envoyés à Hangar 3D. Si un prospect est modifié après création, Hangar 3D ne reçoit pas la mise à jour.

---

## 🔄 Flow bidirectionnel complet EVATIME ↔ Hangar 3D

```
┌─────────────────────────────────────────────────────┐
│              EVATIME → Hangar 3D (PUSH)             │
│                                                     │
│  Nouveau prospect INSERT dans table prospects       │
│       ↓                                             │
│  BEFORE: auto_assign_owner_on_insert                │
│       ↓                                             │
│  AFTER: trigger_init_project_steps_on_tags_changed  │
│  AFTER: trigger_notify_hangar3d                     │
│       ↓                                             │
│  pg_net HTTP POST → /api/inbound/evatime            │
│  Payload: prospect_id, owner_email, nom, email      │
│                                                     │
│  ⚠️ INSERT uniquement — pas d'UPDATE               │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              Hangar 3D → EVATIME (RETOUR)           │
│                                                     │
│  Commercial EVATIME configure le bâtiment 3D        │
│  sur Hangar 3D                                      │
│       ↓                                             │
│  Commercial envoie le lien config au client         │
│       ↓                                             │
│  Client choisit son offre sur Hangar 3D             │
│       ↓                                             │
│  Hangar 3D appelle webhook-v1 avec Bearer token     │
│       ↓                                             │
│  POST /functions/v1/webhook-v1                      │
│  { "action": "add_project", "prospect_id": "...",   │
│    "type_projet": "fenetre" }                       │
│       ↓                                             │
│  RPC add_project_to_prospect → projet ajouté        │
│  dans le prospect côté EVATIME                      │
└─────────────────────────────────────────────────────┘
```

---

## 1️⃣ ~~Hangar 3D lit les prospects directement depuis la même base Supabase~~

> ❌ **CORRECTION (6 mars 2026)** : Cette section était **fausse**. Hangar 3D a **sa propre base Supabase**, séparée de celle d'EVATIME. Les `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` dans Vercel pointent vers la base **Hangar 3D**, pas celle d'EVATIME.
>
> **Le lien entre les deux systèmes se fait uniquement via les webhooks HTTP** :
> - EVATIME → Hangar 3D : trigger `notify_hangar3d_prospect` (pg_net HTTP POST)
> - Hangar 3D → EVATIME : `webhook-v1` (Bearer `eva_live_xxx`)
>
> **Le `prospect_id` est la clé de liaison** entre les deux bases. C'est le seul identifiant partagé.

---

## 2️⃣ Hangar 3D ajoute un projet via `webhook-v1` avec `action: "add_project"`

Le code dans `supabase/functions/webhook-v1/index.ts` lignes 166-228 le confirme explicitement :

```
POST /functions/v1/webhook-v1
Authorization: Bearer eva_live_xxxxx
{
  "action": "add_project",
  "prospect_id": "uuid-du-prospect",
  "type_projet": "fenetre"
}
```

### Flow dans le code :

| Étape | Code | Détail |
|-------|------|--------|
| **Auth** | L.60-128 | Bearer token → SHA-256 → lookup `integration_keys` → récupère `organization_id` |
| **Routage** | L.164-167 | `if (action === 'add_project')` → branche dédiée |
| **RPC** | L.179-184 | Appel `add_project_to_prospect(p_prospect_id, p_organization_id, p_project_type)` |
| **SQL** | `add_project_to_prospect.sql` | Voir ci-dessous |
| **Retour** | L.218-228 | `201` avec `prospect_id`, `prospect_name`, `project_type`, `steps_count` |

### Détail de la RPC SQL (`add_project_to_prospect.sql`) :

- ✅ Vérifie prospect ∈ org
- ✅ Vérifie template existe
- ✅ Vérifie pas de doublon
- ✅ `array_append(tags, project_type)` → ajoute le tag
- ✅ `INSERT INTO project_steps_status` → initialise les étapes (1ère = `in_progress`, reste = `pending`)

---

## 3️⃣ Pour qu'une nouvelle org fonctionne comme Rosca Finance

Le code de `supabase/functions/generate-integration-key/index.ts` montre exactement ça :

1. **L'utilisateur EVATIME** clique "Générer une clé" → Edge Function crée `eva_live_xxxx`, hash en SHA-256, stocke dans `integration_keys` avec `permissions: ['webhook:create_prospect']`
2. **L'utilisateur copie la clé** (affichée une seule fois, L.172)
3. **L'utilisateur colle la clé dans Hangar 3D** à l'inscription
4. **Le commercial EVATIME** configure le bâtiment 3D sur Hangar 3D
5. **Le commercial envoie** le lien de configuration au client
6. **Le client choisit** son offre sur Hangar 3D
7. **Hangar 3D utilise la clé** comme `Bearer` pour appeler `webhook-v1` avec `action: "add_project"` → projet ajouté dans le prospect côté EVATIME

---

## 🎯 Conclusion

**Communication bidirectionnelle confirmée :**

| Direction | Mécanisme | Auth |
|-----------|-----------|------|
| **EVATIME → Hangar 3D** | Trigger PostgreSQL `notify_hangar3d_prospect` via `pg_net` | Aucune (endpoint public) |
| **Hangar 3D → EVATIME** | Edge Function `webhook-v1` avec `action: "add_project"` | Bearer `eva_live_xxx` (clé par org en DB Hangar 3D) |

> ⚠️ Les deux systèmes ont **des bases Supabase séparées**. Le `prospect_id` est la **seule clé de liaison** entre les deux. Toute la communication passe par des webhooks HTTP.

**D'un simple ajout de clé, boom, tout marche exactement comme Rosca Finance.**

Le trigger `notify_hangar3d_prospect` push les prospects automatiquement, et la clé `eva_live_xxx` permet le retour (ajout de projet).

---

## 🔐 Variables d'environnement Hangar 3D (Vercel `locasun-invest`)

> Source : Vercel → Project Settings → Environment Variables (6 mars 2026)

| Variable | Rôle | Usage |
|----------|------|-------|
| **`EVATIME_INTEGRATION_KEY`** | Fallback/legacy | ⚠️ N'est PAS utilisée pour le multi-tenant — voir ci-dessous |
| **`EVATIME_WEBHOOK_URL`** | URL de `webhook-v1` EVATIME | Fallback si pas d'URL custom par org |
| **`NEXT_PUBLIC_SUPABASE_URL`** | URL Supabase **Hangar 3D** (base séparée d'EVATIME) | Client Supabase côté frontend Hangar 3D |
| **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** | Anon key Supabase **Hangar 3D** (base séparée) | Client Supabase côté frontend |
| **`SUPABASE_SERVICE_ROLE_KEY`** | Service role key **Hangar 3D** | Utilisée dans les API routes serveur (ex: `/api/inbound/evatime`) — bypass RLS |
| **`PVGIS_API_URL`** | API PVGIS (Commission Européenne) | Calcul production photovoltaïque par géolocalisation |
| **`ENEDIS_API_URL`** | API Enedis | Données réseau électrique |

---

## 🏢 Multi-tenant : comment Hangar 3D gère la clé par org

> Source : Code GitHub `MYFIREDEAL/locasun-invest` — `lib/actions/evatime.ts` + `lib/actions/auth.ts`

### La clé est stockée PAR ORGANISATION dans la DB Hangar 3D

Hangar 3D a sa propre table `organizations` avec une colonne `evatime_integration_key`. **Chaque org a sa propre clé.**

### Flow d'inscription (1 fois par org)

```
1. Commercial s'inscrit sur Hangar 3D (signup/page.tsx)
2. Remplit : email, password, nom d'org, clé EVATIME (eva_live_xxx)
3. signUpActivateOrg() vérifie que la clé n'est pas déjà utilisée
4. Crée : auth user + organization (avec evatime_integration_key) + profil admin
```

Code (`lib/actions/auth.ts`) :
```ts
const { email, password, orgName, evatimeKey } = parsed.data;
// Vérifie pas de doublon
const { data: existingOrg } = await supabase
  .from("organizations")
  .select("id, name")
  .eq("evatime_integration_key", evatimeKey)
  .single();
```

### Flow retour (quand le client choisit une offre)

```
1. Client choisit offre sur page publique /share/[token]
2. sendOfferToEvatime(projectId) est appelée
3. Charge le projet → récupère project.org_id
4. Lit organizations.evatime_integration_key pour CETTE org
5. POST vers EVATIME_WEBHOOK_URL avec Bearer = clé de l'org
```

Code (`lib/actions/evatime.ts`) :
```ts
// Charge la clé de l'org du projet (pas une variable d'env globale !)
const { data: org } = await supabase
  .from("organizations")
  .select("evatime_integration_key, evatime_type_mapping")
  .eq("id", project.org_id)
  .single();

// Utilise la clé comme Bearer
Authorization: `Bearer ${org.evatime_integration_key}`
```

### Flow entrant (trigger EVATIME → Hangar 3D)

```
1. Trigger notify_hangar3d_prospect envoie : prospect_id, owner_email, nom, email
2. /api/inbound/evatime reçoit le payload
3. Cherche owner_email dans profiles → trouve org_id du commercial
4. Crée le projet dans l'org du commercial
```

Code (`app/api/inbound/evatime/route.ts`) :
```ts
// Trouve le commercial par email → récupère son org_id
for (const profile of allProfiles) {
  const { data: userData } = await supabase.auth.admin.getUserById(profile.user_id);
  if (userData?.user?.email?.toLowerCase() === owner_email.toLowerCase()) {
    commercialId = profile.user_id;
    orgId = profile.org_id;
    break;
  }
}
```

### Mapping des offres (configurable par org)

Chaque org peut mapper les offres Hangar 3D vers ses propres types EVATIME :

| Offre Hangar 3D | Type EVATIME (par défaut) | Configurable |
|-----------------|--------------------------|--------------|
| `tier_invest` | `tiers-invest` | ✅ via admin Hangar 3D |
| `investir` | `investir` | ✅ via admin Hangar 3D |
| `lld` | `lld` | ✅ via admin Hangar 3D |

Page admin : `/admin/evatime` → Mapping des offres → types EVATIME

### Résumé multi-tenant

| Donnée | Stockage | Scope |
|--------|----------|-------|
| `evatime_integration_key` | `organizations` table (Hangar 3D DB) | Par org |
| `evatime_type_mapping` | `organizations` table (Hangar 3D DB) | Par org |
| `evatime_project_types` | `organizations` table (Hangar 3D DB) | Par org |
| `EVATIME_WEBHOOK_URL` | Variable d'env Vercel | Global (même URL pour toutes les orgs) |

### Requête pour voir le trigger

```sql
-- Voir le code de la fonction trigger
SELECT pg_get_functiondef(p.oid)
FROM pg_proc p
WHERE p.proname = 'notify_hangar3d_prospect';

-- Voir sur quelle table/événement le trigger est attaché
SELECT trigger_name, event_manipulation, event_object_table, action_timing
FROM information_schema.triggers
WHERE trigger_name ILIKE '%hangar3d%';
```

### Fichiers de référence

| Fichier | Repo | Rôle |
|---------|------|------|
| `supabase/functions/webhook-v1/index.ts` | EVATIME | Auth Bearer + routage `add_project` + `create_prospect` |
| `supabase/functions/add_project_to_prospect.sql` | EVATIME | RPC SQL (SECURITY DEFINER) |
| `supabase/functions/generate-integration-key/index.ts` | EVATIME | Génération clé `eva_live_xxx` |
| Trigger `notify_hangar3d_prospect` | EVATIME (PostgreSQL) | Push auto prospect → Hangar 3D |
| `app/api/inbound/evatime/route.ts` | Hangar 3D | Reçoit le push EVATIME, crée projet dans l'org du commercial |
| `lib/actions/evatime.ts` | Hangar 3D | `sendOfferToEvatime()` — renvoie l'offre choisie vers EVATIME |
| `lib/actions/auth.ts` → `signUpActivateOrg()` | Hangar 3D | Inscription org + stockage clé `evatime_integration_key` |
| `lib/actions/evatime-config.ts` | Hangar 3D | Config admin : mapping offres → types EVATIME |
| `app/(app)/admin/evatime/page.tsx` | Hangar 3D | UI admin config EVATIME (mapping, statut connexion) |
| `docs/EVATIME_INTEGRATION.md` | Hangar 3D | Doc officielle côté Hangar 3D |
