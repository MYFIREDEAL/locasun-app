# 🧹 NETTOYAGE CODE STATIQUE - SUIVI DES ÉTAPES

**Date** : 25 novembre 2025  
**Objectif** : Supprimer le code statique `projects.js` et unifier l'utilisation de Supabase

---

## 📋 PLAN D'ACTION

### ✅ Étape 0 : Préparation (FAIT)
- ✅ Analyse complète du code
- ✅ Identification des fichiers à modifier
- ✅ Création de ce fichier de suivi

---

### ✅ Étape 1 : Corriger Agenda.jsx

**Status** : ✅ TERMINÉ

**Fichier** : `src/pages/admin/Agenda.jsx`

**Modifications effectuées** :
1. ✅ Ligne 20 : Supprimé `import { allProjectsData } from '@/data/projects';`
2. ✅ Ligne 1387 : Ajouté `projectsData` dans `useAppContext()`
3. ✅ Remplacé 4 occurrences de `allProjectsData` par `projectsData`
4. ✅ Passé `projectsData` comme prop aux composants `EventDetailsPopup` et `OtherActivityDetailsPopup`

**Tests à effectuer maintenant** :
- [ ] Ouvrir le module Agenda
- [ ] Vérifier que les événements s'affichent
- [ ] Cliquer sur un événement → vérifier que le titre du projet s'affiche
- [ ] Créer une activité → vérifier le select de projets
- [ ] Filtrer par projet → vérifier que ça fonctionne

**Commit si OK** : `git commit -m "♻️ Agenda: Utiliser projectsData du Context au lieu du fichier statique"`

**Rollback si KO** : `git checkout src/pages/admin/Agenda.jsx`

---

### 🔄 Étape 2 : Corriger ClientDashboard.jsx

**Status** : ⏳ EN ATTENTE (après validation Étape 1)

**Fichier** : `src/pages/client/ClientDashboard.jsx`

**Modifications à faire** :
1. Supprimer lignes 9-75 : Objet `allProjectsData` statique
2. Ligne 77 : Garder `const projectsToDisplay = userProjects.map(pId => projectsData[pId]).filter(Boolean);`
3. Vérifier que `projectsData` vient bien du Context (ligne 7)

**Tests à effectuer après** :
- [ ] Se connecter côté client
- [ ] Vérifier que le dashboard charge
- [ ] Vérifier que les projets s'affichent correctement
- [ ] Cliquer sur un projet → vérifier qu'il s'ouvre

**Commit si OK** : `git commit -m "♻️ ClientDashboard: Utiliser projectsData du Context au lieu du code statique"`

**Rollback si KO** : `git checkout src/pages/client/ClientDashboard.jsx`

---

### 🔄 Étape 3 : Vérifier les références restantes

**Status** : ⏳ EN ATTENTE (après validation Étape 2)

**Actions** :
1. Rechercher toutes les imports de `projects.js` :
   ```bash
   grep -r "from '@/data/projects'" src/
   ```
2. Vérifier qu'il ne reste QUE dans les fichiers de documentation/diagnostic

**Résultat attendu** :
- Aucune référence dans `src/**/*.{js,jsx}`
- Uniquement dans les fichiers `.md` (documentation)

---

### 🔄 Étape 4 : Supprimer projects.js

**Status** : ⏳ EN ATTENTE (après validation Étape 3)

**Fichier à supprimer** : `src/data/projects.js`

**Actions** :
1. Renommer le fichier en `.backup` d'abord (sécurité)
   ```bash
   mv src/data/projects.js src/data/projects.js.backup
   ```
2. Tester l'application complète
3. Si OK → Supprimer définitivement
   ```bash
   rm src/data/projects.js.backup
   ```

**Tests à effectuer après** :
- [ ] `npm run dev` → Aucune erreur de compilation
- [ ] Tester Agenda
- [ ] Tester ClientDashboard
- [ ] Tester ajout de projet (admin)
- [ ] Tester ajout de projet (client)

**Commit si OK** : `git commit -m "🗑️ Supprimer src/data/projects.js (obsolète, remplacé par Supabase)"`

**Rollback si KO** : `mv src/data/projects.js.backup src/data/projects.js`

---

## 📊 RÉSUMÉ

| Étape | Fichier | Status | Commit |
|-------|---------|--------|--------|
| 1 | Agenda.jsx | ⏳ À faire | - |
| 2 | ClientDashboard.jsx | ⏳ À faire | - |
| 3 | Vérification | ⏳ À faire | - |
| 4 | Suppression projects.js | ⏳ À faire | - |

---

## 🚨 EN CAS DE PROBLÈME

### Revenir en arrière complètement
```bash
# Revenir au dernier commit avant les modifications
git reset --hard HEAD

# Ou revenir à un commit spécifique
git reset --hard <commit-hash>
```

### Annuler juste la dernière étape
```bash
# Annuler le dernier commit (garder les modifs)
git reset --soft HEAD~1

# Annuler le dernier commit (supprimer les modifs)
git reset --hard HEAD~1
```

---

## 📝 NOTES

- **Toujours tester après chaque étape**
- **Ne passer à l'étape suivante QUE si la précédente fonctionne**
- **Faire un commit après chaque étape validée**
- **En cas de doute : STOP et analyser**

---

**Dernière mise à jour** : 25/11/2025 - Fichier créé
