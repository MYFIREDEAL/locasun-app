# 📗 SOFTWARE_OVERVIEW — EVATIME

> **Présentation fonctionnelle du logiciel**
> Ce document explique **comment EVATIME s'utilise** et **à quoi servent les pages**.
> **Aucune règle technique ici.**

---

## ℹ️ État des fonctionnalités

Certaines fonctionnalités décrites dans ce document peuvent être :

* ✅ **Déjà disponibles**
* 🟡 **En cours de déploiement**
* 🔒 **Cible produit (non encore implémentée)**

👉 Ce document décrit **la cible fonctionnelle d'EVATIME**, même si tout n'est pas encore actif.

---

## 🎯 Vision d'EVATIME

EVATIME est un **logiciel de pilotage de projets clients** basé sur :

* des **projets**
* des **étapes**
* des **workflows**
* une **IA encadrée (Charly)**

Le **pipeline** est une **vue calculée** de l'avancement réel des projets.

---

## 👥 Rôles & Accès

### Client — ✅

* Accès web / mobile
* Reçoit messages, formulaires, documents
* Répond aux demandes
* Ne décide pas du workflow

---

### Commercial — ✅

* Accès web complet
* Pilote la relation client
* Valide / refuse / commente
* Débloque ou bloque l'avancement

---

### Partenaire (exécutant) — 🟡

* Accès **mobile uniquement**
* Voit **uniquement ses missions**
* Exécute des tâches terrain
* Ne voit ni pipeline ni CRM

> 🟡 *Fonctionnalité en cours de déploiement*

---

### Contacts externes (sans accès) — 🔒

* Mairies, Enedis, banques, fournisseurs, etc.
* Aucun accès EVATIME
* Utilisés comme **cibles de communication** (email / SMS / appel)

> 🔒 *Cible produit – non encore actif*

---

## 🧭 Parcours type (de bout en bout)

1. Création d'un **prospect** ✅
2. Création d'un ou plusieurs **projets** ✅
3. Avancement par **étapes projet** ✅
4. Déclenchement de **workflows** ✅
5. Actions :

   * client (formulaire) ✅
   * partenaire (mission) 🟡
   * commercial (validation) ✅
6. Passage automatique à l'étape suivante ✅
7. Le **pipeline se met à jour automatiquement** ✅

---

## 🧱 Pages principales (Admin)

### Pipeline — ✅

* Vue globale des prospects
* Filtrer / rechercher
* Ouvrir un prospect
* ❌ Pas de drag & drop

---

### Projets (Projects Management) — ✅

* Créer / gérer les projets
* Définir les étapes
* Mapper les étapes aux colonnes pipeline
* **Source de vérité**

---

### Workflows (Charly) — ✅

* Définir des actions conditionnelles
* Associer les actions à :

  * client
  * commercial
  * partenaire 🟡
* Automatiser le passage d'étapes

---

### Agenda — ✅

* RDV, tâches, rappels
* Liés aux projets et aux étapes

---

### Contacts (Prospects / Clients) — ✅

* Données relationnelles
* Base CRM

---

### Partenaires — 🟡

* Répertoire des exécutants
* Groupes / rôles
* Attribution de missions

> 🟡 *Fonctionnalité en cours de déploiement*

---

### Contacts externes — 🔒

* Répertoire de communication
* Groupes (Mairies, Enedis, Banques…)
* Utilisés par l'IA ou les humains

> 🔒 *Cible produit – non encore actif*

---

## 🤖 IA (Charly)

### Ce que l'IA fait — ✅

* Proposer **une action à la fois**
* Envoyer messages / formulaires
* Aider à faire avancer les projets

### Ce que l'IA ne fait pas — ❌

* Décider seule
* Modifier le pipeline directement
* Contacter des personnes hors répertoire

---

## 📱 Vue Partenaire (mobile) — 🟡

* Liste des missions
* Instructions claires
* Boutons simples (Fait / Impossible / Commentaire)
* Aucune navigation complexe

> 🟡 *UX validée – implémentation en cours*

---

## 📱 Interface Partenaire — Aperçu visuel

### Liste des missions
![Liste des missions](docs/screenshots/partners/missions-list.png)

### Détail mission
![Détail mission](docs/screenshots/partners/mission-detail.png)

### Annuaire
![Annuaire](docs/screenshots/partners/contacts.png)

### Chat Charly
![Chat Charly](docs/screenshots/partners/charly.png)

### Profil (à venir)
![Profil](docs/screenshots/partners/profile.png)

---

## 🧠 À retenir (essentiel)

* **Pipeline = vue**
* **Projet = réalité**
* **Workflow = logique**
* **IA = outil**

EVATIME est conçu pour être **compréhensible, traçable et scalable**.
