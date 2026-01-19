# 🔐 CONFIGURATION SUPABASE - EMAIL D'INVITATION UTILISATEURS ADMIN

## 🎯 Objectif
Configurer Supabase pour que les utilisateurs invités (admin/commercial/manager) soient redirigés vers `/activate-account` au lieu de `/login`.

---

## 📋 ÉTAPES DE CONFIGURATION

### 1️⃣ Configurer les URLs de redirection

**Où** : Supabase Dashboard → Authentication → URL Configuration

**Ajouter ces URLs** :

#### Développement
```
http://localhost:5173/activate-account
```

#### Production
```
https://votre-domaine.com/activate-account
```

**Screenshot des sections à modifier** :
- **Site URL** : `http://localhost:5173` (dev) ou `https://votre-domaine.com` (prod)
- **Redirect URLs** : Ajouter `/activate-account` dans la liste autorisée

---

### 2️⃣ Modifier le template d'email d'invitation

**Où** : Supabase Dashboard → Authentication → Email Templates → **Invite User**

**Template actuel** (par défaut) :
```html
<h2>You have been invited</h2>
<p>Click this link to accept the invitation:</p>
<p><a href="{{ .ConfirmationURL }}">Accept invitation</a></p>
```

**Nouveau template** :
```html
<h2>Activation de votre compte</h2>
<p>Bonjour,</p>
<p>Vous avez été invité(e) à rejoindre l'équipe. Cliquez sur le lien ci-dessous pour activer votre compte et définir votre mot de passe :</p>
<p><a href="{{ .ConfirmationURL }}">Activer mon compte</a></p>
<p>Ce lien est valide pendant 24 heures.</p>
<p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
```

**⚠️ IMPORTANT** : Le lien `{{ .ConfirmationURL }}` **doit** pointer vers `/activate-account`. Configurez cela dans les **Email Template Settings** :

---

### 3️⃣ Configurer la redirection spécifique pour les invitations

**Problème** : Supabase utilise la même URL de confirmation pour tous les types d'emails (signup, magic link, invitation).

**Solution** : Utiliser l'API Admin pour spécifier l'URL de redirection

Dans `src/hooks/useSupabaseUsersCRUD.js`, modifier la fonction `addUser` pour utiliser `admin.inviteUserByEmail()` avec une `redirectTo` spécifique.

**Voir modifications dans le fichier** : `useSupabaseUsersCRUD.js` (commit suivant)

---

### 4️⃣ Variables d'environnement (optionnel)

Si vous voulez rendre l'URL de redirection configurable :

**.env.local** (dev) :
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_APP_URL=http://localhost:5173
```

**.env.production** (prod) :
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_APP_URL=https://votre-domaine.com
```

---

## 🧪 TESTS

### Test 1 : Invitation d'un nouvel utilisateur
1. Connecté comme Global Admin
2. Aller dans Profil → Inviter un utilisateur
3. Remplir le formulaire (nom, email, rôle)
4. Cliquer sur "Inviter"
5. ✅ **Attendu** : Email reçu avec lien vers `/activate-account`

### Test 2 : Activation du compte
1. Cliquer sur le lien dans l'email
2. ✅ **Attendu** : Arrivée sur `/activate-account` (pas `/login`)
3. Définir un mot de passe (min 6 caractères)
4. Confirmer le mot de passe
5. Cliquer sur "Activer mon compte"
6. ✅ **Attendu** : Compte activé + redirection vers `/admin/pipeline`

### Test 3 : Lien expiré (après 24h)
1. Attendre 24h ou invalider le token manuellement
2. Cliquer sur le lien d'invitation
3. ✅ **Attendu** : Message "Lien expiré" + bouton "Retour à la connexion"

### Test 4 : Mot de passe trop court
1. Entrer un mot de passe de moins de 6 caractères
2. ✅ **Attendu** : Toast d'erreur "Mot de passe trop court"

### Test 5 : Mots de passe différents
1. Entrer deux mots de passe différents
2. ✅ **Attendu** : Toast d'erreur "Les mots de passe ne correspondent pas"

---

## 🔍 VÉRIFICATION

### Lister les Redirect URLs autorisées
```sql
-- Dans Supabase SQL Editor
SELECT * FROM auth.config;
```

Chercher la clé `SITE_URL` et `REDIRECT_URLS`.

### Vérifier le template d'email
Dashboard → Authentication → Email Templates → Invite User

---

## 🚨 NOTES IMPORTANTES

### 1. Différence entre `signUp` et `inviteUserByEmail`

**`signUp()`** (ancien comportement) :
- ❌ L'admin définit le mot de passe lors de l'invitation
- ❌ Le mot de passe est transmis par email (INSECURE)
- ❌ Utilisateur arrive sur `/login` et doit se connecter

**`inviteUserByEmail()`** (nouveau comportement) :
- ✅ Aucun mot de passe défini à l'invitation
- ✅ L'utilisateur définit son propre mot de passe
- ✅ Utilisateur arrive sur `/activate-account`
- ✅ Connexion automatique après activation

### 2. Service Role Key requis

⚠️ `admin.inviteUserByEmail()` nécessite une **Edge Function** avec Service Role Key.

**Pourquoi** : Les opérations admin (invite) ne peuvent pas être faites depuis le frontend avec l'anon key.

**Solution** : Créer une Edge Function `invite-user` (voir modifications dans le commit suivant).

### 3. Compatibilité

Cette configuration affecte **uniquement** les invitations admin. Les flows suivants restent inchangés :
- ✅ Client signup (`/inscription`)
- ✅ Client activation (`/client/activation`)
- ✅ Admin login (`/login`)
- ✅ Reset password (`/reset-password`)

---

## 📤 PROCHAINES ÉTAPES

1. ✅ Créer la page `/activate-account` (déjà fait)
2. ✅ Ajouter la route dans `App.jsx` (déjà fait)
3. ⏳ Modifier `useSupabaseUsersCRUD.js` pour utiliser Edge Function
4. ⏳ Créer Edge Function `invite-user` (voir doc séparée)
5. ⏳ Configurer Supabase Dashboard (cette doc)
6. ⏳ Tester le flow complet

---

**Date** : 2026-01-19  
**Status** : ⏳ En attente configuration Supabase Dashboard
