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
