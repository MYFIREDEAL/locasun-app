# 📘 PROJECT_GUIDE — EVATIME

> **À LIRE AVANT DE TOUCHER AU CODE**
> Ce document explique **comment penser EVATIME**, pas comment coder.

---

## 🎯 C'EST QUOI EVATIME (EN 10 LIGNES)

EVATIME est un **moteur de gestion de projets orienté workflow**, utilisé pour piloter des projets clients complexes (solaire, finance, dossiers administratifs, etc.).

* Le **pipeline** est une **vue calculée**, jamais éditée à la main
* La **réalité métier** est portée par les **projets** et leurs **étapes**
* Les **workflows** déclenchent des actions humaines ou automatisées
* L'**IA (Charly)** est un **exécutant encadré**, jamais une autorité
* Tout est **traçable, déterministe et explicable**

---

## 🧱 ARCHITECTURE MENTALE (TRÈS IMPORTANT)

EVATIME repose sur **4 briques strictement séparées** :

### 1️⃣ Pipeline (vue)

* Vue globale de l'état commercial
* Colonnes configurables (MARKET, ÉTUDE, OFFRE, CLIENT…)
* ❌ **Jamais modifié manuellement**
* ✅ Reflète l'état réel des projets

👉 Si une card change de colonne, **c'est une conséquence**, pas une action.

---

### 2️⃣ Projets (source de vérité)

* Un prospect peut avoir **plusieurs projets**
* Chaque projet a :

  * des étapes
  * une étape courante
* Chaque étape est **mappée à une colonne pipeline**

👉 **Changer d'étape = changer de colonne pipeline**

---

### 3️⃣ Workflows (logique métier)

* Les workflows sont **déterministes**
* Ils déclenchent une **suite d'actions ordonnées**
* Les actions peuvent être :

  * associées au client
  * associées au commercial
  * associées à un partenaire
* Les validations peuvent être :

  * automatiques (IA)
  * humaines
  * conditionnelles

👉 Les workflows sont le **cœur du système**.

---

### 4️⃣ IA – Charly (outil, pas cerveau)

* Charly **exécute** ce qui est défini
* Elle ne décide jamais seule
* Elle agit **dans un cadre strict** :

  * projet actif
  * étape en cours
  * action unique proposée
* Toutes ses actions sont **simulables** et **désactivables**

---

## 👥 LES TYPES D'ACTEURS (NE PAS CONFONDRE)

### 🔹 Client

* Accès web / mobile
* Reçoit messages et formulaires
* Ne décide pas du workflow

---

### 🔹 Commercial

* Accès web complet
* Valide / refuse / commente
* Pilote la relation
* Peut débloquer ou bloquer un workflow

---

### 🔹 Partenaire (EXÉCUTANT)

* Accès **mobile uniquement**
* Voit **uniquement ses missions**
* Ne voit PAS :

  * le pipeline
  * les autres prospects
  * le CRM
* Peut :

  * exécuter une mission
  * répondre à 2–3 questions
  * marquer "fait / impossible"

👉 Le partenaire **n'influence jamais directement le pipeline**.

---

### 🔹 Contacts externes (SANS ACCÈS)

* Mairies, Enedis, banques, notaires, fournisseurs…
* ❌ Aucun accès EVATIME
* Utilisés comme **cibles de communication**
* Contactés par :

  * email
  * SMS
  * appel (IA ou humain)

👉 L'IA **ne contacte jamais quelqu'un hors de ce répertoire**.

---

## 📱 MISSIONS PARTENAIRES (LOGIQUE CLÉ)

Quand une action est **associée à un partenaire** :

1. EVATIME crée une **MISSION**
2. La mission est liée à :

   * un prospect
   * un projet
   * une étape
3. Le partenaire reçoit :

   * une instruction claire
   * des boutons simples (Oui / Non / Commentaire)
4. Quand la mission est terminée :

   * le workflow reprend
   * la décision revient au commercial ou à l'étape suivante

---

## 🚫 INTERDITS ABSOLUS (À RESPECTER)

* ❌ Déplacer une card de pipeline à la main
* ❌ Laisser l'IA agir sans cadre
* ❌ Donner accès CRM à un partenaire
* ❌ Mélanger partenaires et contacts externes
* ❌ Ajouter de la logique cachée ou implicite

👉 Toute violation = **BUG CONCEPTUEL**

---

## 🤖 PROMPT OBLIGATOIRE AVANT DE CODER

À copier-coller **AVANT TOUTE MODIFICATION** :

```
Tu travailles sur le projet EVATIME.

Règles absolues :
- Lis PROJECT_GUIDE.md
- Applique la logique pipeline calculé, jamais édité
- Respecte la séparation : vue / logique / automatisation
- Les workflows pilotent tout
- Les partenaires exécutent, ne décident pas
- L'IA est un outil, pas une autorité

Objectif :
Ne jamais casser la cohérence métier du système.
```

---

## 📌 SI TU VOIS UN BUG CHELOU

(page blanche, crash, comportement étrange)

👉 Lire :

* `evatime_kb/STABILITY.md`

👉 Ne JAMAIS bricoler sans ça.

---

## 🏁 PHILOSOPHIE FINALE

EVATIME n'est pas :

* un chatbot
* un CRM classique
* un outil "magique"

EVATIME est :

> **un moteur de workflow métier avec une IA encadrée**

Et c'est pour ça que ça marche.

---

# 🛠️ INSTRUCTIONS TECHNIQUES POUR IA/DÉVELOPPEUR

TU TRAVAILLES SUR LE PROJET EVATIME.

AVANT TOUTE ACTION :
- Lis intégralement PROJECT_GUIDE.md
- Applique STRICTEMENT les règles décrites ci-dessous
- Si une information manque, POSE DES QUESTIONS avant d'écrire du code

────────────────────────────────
## 🎯 CONTEXTE PRODUIT (À NE JAMAIS OUBLIER)

EVATIME est un moteur de gestion de projets orienté WORKFLOW.
Ce n'est PAS un CRM classique.

INVARIANTS MÉTIER ABSOLUS :
1) Le PIPELINE est une VUE CALCULÉE, jamais une source de vérité.
   → La vérité = Projets + Étapes.
2) Changer d'étape = conséquence métier → peut changer la colonne pipeline.
3) Les WORKFLOWS sont déterministes et pilotent les actions.
4) L'IA (Charly) EXÉCUTE dans un cadre strict, elle ne décide jamais.
5) Les PARTENAIRES exécutent des missions, n'influencent jamais le pipeline.
6) Multitenant STRICT : isolation par organization_id via RLS.
   → Aucun accès cross-organisation, jamais.

Toute violation = BUG CONCEPTUEL.

────────────────────────────────
## 🧱 ÉTAT ACTUEL DU LOGICIEL (NE PAS CASSER)

Les éléments suivants sont STABILISÉS et NON NÉGOCIABLES :

- bootStatus + gating auth / organization / user (anti race + timeout)
- ZÉRO page blanche grâce aux ModuleBoundary
- Données prospects & agenda chargées UNE SEULE FOIS (pas de hooks dupliqués)
- Transformations snake_case ↔ camelCase CENTRALISÉES
- Chargement perçu rapide (waterfall réduit, layout + skeletons tôt)
- Code splitting (React.lazy) actif
- Pipeline optimisé (React.memo + windowing soft)
- Base prête pour scaler (perf DB validée)

Tu ne dois JAMAIS :
- réintroduire double fetch
- réintroduire double realtime subscription
- refaire des transformations "vite fait"
- bloquer le rendu global
- casser le multi-tenant

────────────────────────────────
## 📋 PRs COMPLÉTÉES (25 JANVIER 2026)

| PR | Commit | Description |
|----|--------|-------------|
| PR-3 | - | Stop duplication hooks - 1 source de vérité |
| PR-4 | - | Transforms centralisés (snake_case ↔ camelCase) |
| PR-4.1 | 6b1aad0 | Fix création prospect (bug bloquant) |
| PR-4.2 | 00ba695 | Checkbox invitation client |
| PR-5 | 8c347c5 | Skeleton first paint (waterfall killer) |
| PR-6 | 02a5e93 | Code splitting React.lazy (bundle -52%) |
| PR-7 | 4f24aad | React.memo + windowing soft (1000+ prospects) |
| PR-8 | f127bf1 | DB perf: pagination RPC + filtre date + fix N+1 |

MIGRATIONS SQL ACTIVES :
- supabase/migrations/pr8_get_prospects_safe_pagination.sql ✅

GAINS MESURÉS :
- Bundle principal : 2.5MB → 1.2MB (-52%)
- Prospects/requête : illimité → max 500 (paginé)
- Appointments : tout l'historique → ±3 mois
- Requêtes N+1 ProspectCard : 1/carte → 0

────────────────────────────────
## 🛡️ RÈGLES TECHNIQUES (ANTI EFFETS DE BORD)

### DATA
- Si une donnée existe déjà dans le context → TU LA CONSOMMES.
- Nouvelle donnée = 1 hook + branché UNE fois dans le provider.
- Jamais de fetch direct dans plusieurs composants.

### REALTIME
- Subscriptions centralisées.
- Nettoyage obligatoire (unsubscribe).
- Pas de setState global inutile.

### UI / FIABILITÉ
- Chaque module/page : loading / empty / error explicites.
- Optional chaining obligatoire sur données async.
- Aucun spinner infini : timeout + message + action possible.
- Toute zone fragile peut être protégée par ModuleBoundary.

### PERFORMANCE
- Pas d'import lourd inutile au top-level.
- Listes longues : memo + windowing / virtualisation adaptée.
- Handlers stables (useCallback), calculs lourds mémorisés.

────────────────────────────────
## 🧪 DISCIPLINE DE TRAVAIL (OBLIGATOIRE)

- 1 réponse = 1 PR.
- Petit diff. Pas de refacto latéral.
- AVANT de coder :
  • objectif précis
  • fichiers impactés
  • risques
  • plan de rollback
- APRÈS :
  • patch/diff
  • résumé clair
  • checklist de vérification
- Build + SMOKE_TESTS.md obligatoires.
- Ne jamais inventer : cite les chemins de fichiers.
- Si doute : propose MAX 2 options + recommande la plus safe.

FORMAT DE RÉPONSE OBLIGATOIRE :
```
A) PR Title  
B) Objectif  
C) Fichiers impactés  
D) Plan d'implémentation  
E) Patch / instructions précises  
F) Vérifications (build + smoke tests)  
G) Rollback plan  
H) TODO / dettes restantes  
```

────────────────────────────────
## ❓ RÈGLE FONDAMENTALE

Si une information est manquante, floue ou ambiguë :
→ POSE DES QUESTIONS AVANT D'ÉCRIRE DU CODE.
→ NE FAIS AUCUNE SUPPOSITION SILENCIEUSE.

────────────────────────────────
## 📝 TEMPLATE DE DEMANDE

```
Je veux ajouter :
- Quoi : …
- Où : …
- Pour qui : …
- Ce que ça doit faire : …
- Ce que ça ne doit PAS casser : …
```
