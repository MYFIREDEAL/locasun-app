# Guide de Test - Filtre Utilisateur Agenda

## ✅ Corrections apportées

### Fichier : `src/pages/admin/Agenda.jsx`

**Ligne 1466** : Dropdown utilise maintenant `user.user_id` au lieu de `user.id`
**Ligne 1474** : Vérification utilise `user.user_id` au lieu de `user.id`

---

## 🧪 Protocole de test

### Test 1 : Chargement initial
1. Ouvrir l'Agenda
2. **Vérifier** : Le dropdown utilisateur affiche le nom de l'utilisateur connecté (ex: "Jack LUC")
3. **Résultat attendu** : Affichage correct du nom

### Test 2 : Changement d'utilisateur
1. Cliquer sur le dropdown utilisateur
2. Sélectionner "Elodie" ou "Charly"
3. **Vérifier** : Les rendez-vous/appels/tâches se filtrent instantanément
4. **Résultat attendu** : Seules les activités assignées à l'utilisateur sélectionné sont visibles

### Test 3 : Vérification des activités affichées
1. Sélectionner "Jack LUC" dans le dropdown
2. Ouvrir la console navigateur (F12)
3. Exécuter :
```javascript
// Vérifier que selectedUserId correspond bien au user_id de Jack
console.log('Selected User ID:', selectedUserId);
console.log('Jack user_id:', '82be903d-fa16-4a64-8a95-c6c65982cba4');
```
4. **Résultat attendu** : Les deux IDs doivent être identiques

### Test 4 : Sidebar activités
1. Sélectionner un utilisateur dans le dropdown
2. **Vérifier** : La sidebar de droite (appels à venir, tâches) affiche uniquement les activités de cet utilisateur
3. Changer d'utilisateur
4. **Résultat attendu** : La sidebar se met à jour instantanément

### Test 5 : Calendrier hebdomadaire
1. Sélectionner "Jack LUC"
2. **Vérifier** : Les événements sur la grille horaire correspondent aux rendez-vous de Jack
3. Sélectionner "Elodie"
4. **Résultat attendu** : Les événements changent pour ceux d'Elodie

---

## 🔍 Tests SQL (Supabase Dashboard)

### Exécuter `test_agenda_filter.sql` :

1. Ouvrir Supabase Dashboard
2. Aller dans SQL Editor
3. Coller le contenu de `test_agenda_filter.sql`
4. Exécuter

**Ce que le script vérifie** :
- Liste tous les users avec leur `id` et `user_id`
- Affiche les rendez-vous de Jack (pour comparer avec l'UI)
- Affiche les appels de Jack
- Affiche les tâches de Jack
- **Détecte les bugs potentiels** : activités avec `assigned_user_id = users.id` au lieu de `users.user_id`

---

## ❌ Bugs à surveiller

### Symptôme : "Aucun rendez-vous" alors que l'utilisateur en a
**Cause probable** : `selectedUserId` contient `users.id` au lieu de `users.user_id`
**Diagnostic** :
```javascript
console.log('selectedUserId:', selectedUserId);
console.log('appointment.assignedUserId:', appointment.assignedUserId);
console.log('Match?', appointment.assignedUserId === selectedUserId);
```

### Symptôme : Dropdown affiche "Utilisateur" au lieu du nom
**Cause probable** : `supabaseUsers.find(u => u.user_id === selectedUserId)` ne trouve pas l'utilisateur
**Diagnostic** : Vérifier que `selectedUserId` est bien un UUID `auth.users.id`

---

## 🎯 Comparaison AVANT / APRÈS

### AVANT (bug)
```javascript
// Dropdown envoyait users.id (ex: cd73c227-...)
const userOptions = allowedUsers.map(user => ({ 
  value: user.id,  // ❌ Mauvais ID
  label: user.name 
}));

// Résultat: selectedUserId = "cd73c227-..."
// Comparaison: appointment.assignedUserId === "82be903d-..." → false ❌
```

### APRÈS (corrigé)
```javascript
// Dropdown envoie users.user_id (ex: 82be903d-...)
const userOptions = allowedUsers.map(user => ({ 
  value: user.user_id,  // ✅ Bon ID
  label: user.name 
}));

// Résultat: selectedUserId = "82be903d-..."
// Comparaison: appointment.assignedUserId === "82be903d-..." → true ✅
```

---

## 📊 Résultat attendu

Après correction, le filtre utilisateur de l'Agenda doit fonctionner **identiquement** au filtre du module Contacts :
- ✅ Changement instantané des activités affichées
- ✅ Sidebar se met à jour correctement
- ✅ Nom de l'utilisateur affiché dans le dropdown
- ✅ Pas d'erreur dans la console navigateur

---

**Date** : 19 novembre 2025  
**Testé par** : À compléter après tests
**Status** : 🟡 En attente de validation
