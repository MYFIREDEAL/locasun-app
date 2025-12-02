# 🧪 GUIDE DE TEST - INSCRIPTION INSTANTANÉE + MAGIC LINK

**Date** : 2 décembre 2025  
**Patch** : INSCRIPTION_INSTANTANEE_COMPLETE  

---

## 🎯 Tests à effectuer (par ordre de priorité)

### ✅ TEST 1 - Inscription client instantanée (FLUX 1)

**Objectif** : Vérifier que l'inscription client redirige DIRECTEMENT vers le dashboard sans attendre de Magic Link.

**Étapes** :
1. Ouvrir le navigateur en **mode navigation privée** (pour éviter les sessions existantes)
2. Aller sur : `http://localhost:5173/registration`
3. Remplir le formulaire :
   - **Nom complet** : `Eva Time`
   - **Email** : `evatime@test.com`
   - **Projet** : Cocher `ACC` (ou autre projet)
4. Cliquer sur **"Créer mon compte"**

**Résultat attendu** :
- ✅ Toast vert : "✅ Compte créé avec succès ! Redirection vers votre espace client..."
- ✅ Redirection automatique vers `/dashboard` en **1.5 secondes**
- ✅ Dashboard chargé avec le projet **ACC** visible
- ✅ **Console logs à vérifier** :
  ```
  ✅ Prospect créé: {...}
  ✅ Auth user créé + OTP envoyé: {...}
  ✅ Prospect trouvé par email, association user_id: [UUID]
  🧹 pendingSignup nettoyé du localStorage
  ```
- ✅ Aucune erreur console

**Vérification Supabase** (optionnel) :
1. Ouvrir Supabase Dashboard
2. Table `prospects` : Vérifier qu'un prospect `Eva Time` existe avec `user_id` renseigné
3. Table `auth.users` : Vérifier qu'un utilisateur `evatime@test.com` existe

---

### ✅ TEST 2 - Magic Link Admin (FLUX 2)

**Objectif** : Vérifier que le Magic Link envoyé par l'admin fonctionne et associe automatiquement le `user_id`.

**Étapes** :
1. **En tant qu'admin** :
   - Se connecter à l'espace PRO (`/admin/login`)
   - Aller sur le Pipeline (`/admin/pipeline`)
   - Créer un nouveau prospect :
     - **Nom** : `Jean Dupont`
     - **Email** : `jean.dupont@test.com`
     - **Projet** : `Centrale`
   - Cliquer sur **"Envoyer accès client"** (ou équivalent)

2. **En tant que client** :
   - Ouvrir la boîte mail de `jean.dupont@test.com`
   - Cliquer sur le **Magic Link** reçu

**Résultat attendu** :
- ✅ Redirection automatique vers `/dashboard`
- ✅ Dashboard chargé avec le projet **Centrale** visible
- ✅ **Console logs à vérifier** :
  ```
  ✅ Prospect trouvé par email, association user_id: [UUID]
  ```
- ✅ Aucune erreur console

**Vérification Supabase** (optionnel) :
1. Table `prospects` : Le prospect `Jean Dupont` doit avoir un `user_id` renseigné
2. Table `auth.users` : Un utilisateur `jean.dupont@test.com` doit exister

---

### ✅ TEST 3 - Reconnexion Magic Link (client existant)

**Objectif** : Vérifier qu'un client existant peut se reconnecter via Magic Link sans problème.

**Étapes** :
1. **Se déconnecter** du dashboard client (si connecté)
2. Aller sur `/client-access` (page de connexion client)
3. Entrer l'email : `evatime@test.com` (ou `jean.dupont@test.com`)
4. Cliquer sur **"Envoyer le lien de connexion"**
5. Ouvrir la boîte mail et cliquer sur le **Magic Link**

**Résultat attendu** :
- ✅ Redirection automatique vers `/dashboard`
- ✅ Dashboard chargé avec les projets corrects
- ✅ **Console logs à vérifier** :
  ```
  (Aucun log de création, car le prospect existe déjà)
  ```
- ✅ Aucune erreur console

---

### ✅ TEST 4 - Magic Link direct (sans prospect existant)

**Objectif** : Vérifier que si un utilisateur clique sur un Magic Link SANS avoir de prospect, l'app crée automatiquement un prospect.

**Étapes** :
1. **Supprimer le prospect** `Eva Time` dans Supabase (table `prospects`)
2. **Garder l'utilisateur Auth** `evatime@test.com` (table `auth.users`)
3. Demander un nouveau Magic Link pour `evatime@test.com`
4. Cliquer sur le Magic Link

**Résultat attendu** :
- ✅ Redirection automatique vers `/dashboard`
- ✅ Dashboard chargé (même si vide de projets)
- ✅ **Console logs à vérifier** :
  ```
  🔥 Aucun prospect trouvé, création automatique...
  ✅ Prospect créé automatiquement: {...}
  🧹 pendingSignup nettoyé du localStorage
  ```
- ✅ Aucune erreur console

**Vérification Supabase** :
1. Table `prospects` : Un nouveau prospect `evatime@test.com` doit avoir été créé automatiquement avec `user_id` renseigné

---

## 🐛 Erreurs possibles et solutions

### Erreur : "Prospect non reconnu"
**Cause** : `user_id` non associé au prospect  
**Solution** : Vérifier que `loadAuthUser()` exécute bien l'association par email (console log)

### Erreur : "Dashboard vide"
**Cause** : Les `tags` du prospect sont vides ou mal synchronisés  
**Solution** : Vérifier dans Supabase que le prospect a bien des `tags` renseignés

### Erreur : "Invalid email"
**Cause** : Email mal formaté ou domaine invalide  
**Solution** : Utiliser un email avec un domaine valide (ex: `@gmail.com`, `@test.com`)

### Erreur : "Permission denied"
**Cause** : RLS policies bloquent l'insertion/update  
**Solution** : Vérifier les RLS policies pour la table `prospects` (voir `schema.sql`)

---

## 📊 Console logs à surveiller

### Inscription instantanée (FLUX 1)
```
✅ Prospect créé: { id: "...", name: "Eva Time", email: "evatime@test.com", ... }
✅ Auth user créé + OTP envoyé: { ... }
✅ Prospect trouvé par email, association user_id: [UUID]
🧹 pendingSignup nettoyé du localStorage
```

### Magic Link Admin (FLUX 2)
```
✅ Prospect trouvé par email, association user_id: [UUID]
```

### Création automatique (FLUX 2 - cas sans prospect)
```
🔥 Aucun prospect trouvé, création automatique...
✅ Prospect créé automatiquement: { id: "...", name: "...", email: "...", ... }
🧹 pendingSignup nettoyé du localStorage
```

---

## ✅ Checklist finale

Après avoir effectué tous les tests, vérifier :

- [ ] **TEST 1** : Inscription instantanée fonctionne (redirection directe)
- [ ] **TEST 2** : Magic Link admin fonctionne (association automatique)
- [ ] **TEST 3** : Reconnexion Magic Link fonctionne (pas d'erreur)
- [ ] **TEST 4** : Création automatique de prospect fonctionne (cas sans prospect)
- [ ] Aucune erreur console sur aucun des tests
- [ ] `localStorage.pendingSignup` est bien nettoyé après chaque inscription
- [ ] Les projets sont bien synchronisés dans le dashboard
- [ ] Les données Supabase sont cohérentes (`prospects.user_id` renseigné)

---

## 🚀 Résultat final attendu

**Les 2 flux sont maintenant actifs, testés et propres.**

- ✅ Inscription client : **Instantanée**, sans friction
- ✅ Magic Link admin : **Détection automatique**, association automatique
- ✅ Reconnexion : **Aucun problème**, dashboard direct
- ✅ Plus de "prospect non reconnu"
- ✅ Plus de "dashboard vide"
- ✅ Plus de formulaires qui n'enregistrent rien
- ✅ Plus de friction

---

**Status** : 🧪 PRÊT POUR LES TESTS  
**Date** : 2 décembre 2025  

🎉 **Ready to test!**
