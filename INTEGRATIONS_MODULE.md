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
- [ ] **Action 4** — Onglet "Développeur" : webhook in/out, API keys
- [ ] **Action 5** — Persistance Supabase des configs d'intégration
- [ ] **Action 6** — Tests E2E + validation UX
- [ ] **Action 7** — Documentation finale + release notes

---

## 📓 Journal des changements

| Date | Action |
|------|--------|
| 2 mars 2026 | **Action 1** — Scaffold initial : `INTEGRATIONS_MODULE.md`, page placeholder `/admin/integrations`, bouton dans Mon Profil, route ajoutée dans `App.jsx`, `PROJECT_GUIDE.md` et `PROGRESS_LOG.md` mis à jour. |
| 2 mars 2026 | **Action 2** — Onglet "Sans code" fonctionnel : liens globaux (inscription, espace client, connexion pro), liens par projet (depuis `useSupabaseProjectTemplates` filtré par org), `CopyButton` réutilisable, orgSlug dérivé de `affiliate_slug` (même source que Mon Profil). |
| 2 mars 2026 | **Action 3** — Pré-sélection projet sur `RegistrationPage` via `?project={slug}`. Validation org-scoped : le slug est comparé à `slugify(p.type)` des projets publics de l'org courante uniquement. Param invalide = ignoré silencieusement. |
