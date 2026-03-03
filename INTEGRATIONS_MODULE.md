# 🔌 INTEGRATIONS_MODULE — EVATIME

> Documentation du module Intégrations EVATIME.

---

## 🎯 Objectif

Permettre aux admins EVATIME de connecter des services externes (EVATIME ↔ tiers) via **3 niveaux d'intégration** :

| Niveau | Nom | Public cible | Complexité |
|--------|-----|--------------|------------|
| 1 | **Sans code** | Admin non-technique | Aucune — liens cliquables, copier-coller |
| 2 | **Make** | Admin intermédiaire | Faible — scénarios Make prêts à l'emploi |
| 3 | **Développeur** | Dev / intégrateur | Moyenne — webhook, API key, endpoints |

---

## 🧠 Principe UX

> **« Compréhension en 10 secondes »**
>
> L'admin doit comprendre en un coup d'œil quel niveau lui correspond, et pouvoir configurer sans assistance.

---

## 🛣️ Route

```
/admin/integrations
```

Accessible depuis **Mon Profil** → bouton **"Gérer les intégrations"**.

---

## 📦 Sections prévues

### 1. Sans code
- Liens directs à copier-coller (ex: lien formulaire public, lien landing page)
- Widgets embed (iframe)
- QR codes

### 2. Make (ex-Integromat)
- Scénarios Make prêts à l'emploi
- Webhook URL à coller dans Make
- Templates de scénarios

### 3. Développeur
- Webhook entrant (recevoir des données dans EVATIME)
- Webhook sortant (envoyer des événements vers un service externe)
- API Key management
- Documentation endpoints

---

## ✅ Checklist TODO

- [x] **Action 1** — Scaffold + docs + navigation + page placeholder
- [x] **Action 2** — Onglet "Sans code" : liens publics, liens par projet, CopyButton
- [x] **Action 3** — Pré-sélection projet via query param `?project=` sur `/inscription`
- [x] **Action 4** — Onglet "Make" : contrat officiel webhook, règles d'attribution, sécurité & mapping
- [x] **Action 5** — Onglet "Développeur" : API keys, Edge Functions (webhook-v1, generate-integration-key)
- [x] **Action 6** — Persistance Supabase : table `integration_keys`, RPC `create_webhook_prospect`
- [x] **Action 7** — App EVATIME sur Make.com : module Create Prospect, validate_only, 2 méthodes UX
- [x] **Action 8** — Action `add_project` : RPC `add_project_to_prospect` + routage webhook-v1
- [ ] **Action 9** — Tests E2E complets + documentation finale

---

## 📓 Journal des changements

| Date | Action |
|------|--------|
| 2 mars 2026 | **Action 1** — Scaffold initial : `INTEGRATIONS_MODULE.md`, page placeholder `/admin/integrations`, bouton dans Mon Profil, route ajoutée dans `App.jsx`, `PROJECT_GUIDE.md` et `PROGRESS_LOG.md` mis à jour. |
| 2 mars 2026 | **Action 2** — Onglet "Sans code" fonctionnel : liens globaux (inscription, espace client, connexion pro), liens par projet (depuis `useSupabaseProjectTemplates` filtré par org), `CopyButton` réutilisable. |
| 2 mars 2026 | **Correction Action 2** — Liens passés en **org-level** pur : suppression `affiliate_slug` / `useUsers` / `useAppContext`. Liens basés uniquement sur `window.location.origin` (= sous-domaine multi-tenant). Liens par projet = `{origin}/inscription?project={slug}`. |
| 2 mars 2026 | **Action 3** — Pré-sélection projet sur `RegistrationPage` via `?project={slug}`. Validation org-scoped : le slug est comparé à `slugify(p.type)` des projets publics de l'org courante uniquement. Param invalide = ignoré silencieusement. |
| 2 mars 2026 | **Action 4** — Onglet "Make" finalisé : endpoint webhook (`POST https://api.evatime.fr/webhook/v1`), headers Bearer, contrat JSON officiel avec `type_projet` / `contact` / `project`, règles d'attribution (owner_user_id → owner_email → fallback Global Admin), sécurité & mapping (champs inconnus ignorés, validation obligatoires, isolation multi-tenant). CopyButton sur chaque bloc. Aucun secret réel exposé. |
| 2 mars 2026 | **Action 5.5** — Audit technique webhook universel : analyse multi-tenant, flux création contact/projet, attribution owner, magic link, project templates, risques identifiés. Fichier `AUDIT_WEBHOOK_UNIVERSEL.md` créé. |
| 2 mars 2026 | **Action 6.1** — 🔒 **Security fix** : Suppression UUID hardcodé Jack Luc (`v_default_jack_id`) dans `create_affiliated_prospect`. Remplacé par lookup dynamique `Global Admin` par `organization_id`. Exception levée si aucun Global Admin trouvé. Fonction 100% multi-tenant. |
| 2 mars 2026 | **Action 6.2** — 🔒 **Security fix** : `link_prospect_to_auth_user` corrigé pour multi-tenant. Ancien code faisait `UPDATE WHERE email = X AND user_id IS NULL` sans scope org → risque cross-org. Nouveau code : sélectionne le prospect le plus récent (`ORDER BY created_at DESC LIMIT 1`) et ne lie que celui-ci. Fichier SQL dédié créé : `supabase/functions/link_prospect_to_auth_user.sql`. |
| 2 mars 2026 | **Action 6** — 🚀 **Edge Function webhook-v1** : Table `integration_keys` (hash SHA-256, RLS, permissions granulaires), RPC `create_webhook_prospect` (SECURITY DEFINER, service_role only, validation type_projet + doublon + owner + fallback Global Admin), Edge Function `webhook-v1/index.ts` (auth Bearer → hash → org_id, contrat JSON flexible, magic link optionnel, codes erreur HTTP clairs). |
| 2 mars 2026 | **Action 6 correctif — Hardening prod** : `key_hash` UNIQUE, supprimé `updated_at`, pipeline step strict (plus de fallback fictif → erreur `NO_PIPELINE_STEP`), `use_count` propre dans select initial. |
| 2 mars 2026 | **Correctif alignement** : Magic link revenu à `signInWithOtp` (aligné RegistrationPage), supprimé `auth.admin.generateLink`. Vérifié que le SELECT `integration_keys` correspond exactement au schéma réel (6 colonnes lues, 2 colonnes écrites). |
| 3 mars 2026 | **validate_only** : Mode test connexion Make — `{ "validate_only": true }` → 200 + clé valide, sans créer de prospect. Déployé sur Edge Functions. |
| 3 mars 2026 | **App EVATIME sur Make.com** : App custom publiée (v1.0.0). Connection Communication pointe sur `webhook-v1` POST avec `validate_only`. Module "Create Prospect" avec champs `nom`, `email`, `telephone`, `type_projet`, `adresse`. Testé OK end-to-end. |
| 3 mars 2026 | **Onglet Make 2 méthodes** : Refonte UX — sélecteur App EVATIME (recommandé, 3 étapes) + Module HTTP (avancé, 6 étapes). Boutons copie inversés (gros = clé brute, petit = Bearer). |
| 4 mars 2026 | **Action `add_project`** : Nouvelle action webhook pour ajouter un projet à un prospect existant. RPC `add_project_to_prospect` (SECURITY DEFINER, vérifie prospect ∈ org, template existe, pas de doublon). Routage dans `webhook-v1` : `action` absent = create_prospect, `add_project` = nouvelle RPC. Fix `organization_id` manquant dans INSERT `project_steps_status`. Test OK : prospect josh + fenetre → 8 steps. |
