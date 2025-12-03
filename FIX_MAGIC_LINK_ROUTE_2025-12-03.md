# ✅ FIX - Page blanche Magic Link Client (3 décembre 2025)

## 🔴 Problème identifié

Quand un admin crée un prospect et envoie le magic link, le client obtient une **page blanche** avec l'erreur :
```
No routes matched location "/client/dashboard?code=26c79c4c-7bb7-4315-9cd4-47a430466263"
```

### Causes identifiées
1. **Route manquante** : La route `/client/dashboard` n'existait plus dans App.jsx (supprimée lors d'un nettoyage)
2. **Paramètre `?code=...` suspect** : Les magic links Supabase utilisent normalement `#access_token=...` (hash), pas `?code=...` (query)

## ✅ Corrections appliquées

### 1. Route `/client/dashboard` restaurée
**Fichier** : `src/App.jsx` (ligne ~1368)

**Ajout** :
```jsx
<Route path="/client/dashboard" element={<ClientLayout />}>
  <Route index element={<ClientDashboardPage />} />
  <Route path="parrainage" element={<ParrainagePage />} />
  <Route path="profil" element={<SettingsPage />} />
  <Route path="offres" element={<OffersPage />} />
</Route>
```

**Raison** : La route avait été supprimée lors d'un nettoyage, mais elle est nécessaire pour les magic links qui pointent vers `/client/dashboard`.

### 2. Route `/dashboard` conservée pour compatibilité
Les deux routes (`/dashboard` et `/client/dashboard`) coexistent maintenant pour supporter les différents flux d'authentification.

## 🧪 Test à effectuer

1. **Créer un nouveau prospect** depuis l'espace admin
2. **Cliquer sur le magic link** reçu par email
3. **Vérifier** : Le client doit arriver sur `/dashboard` (pas de page blanche)

## 📋 Vérification Supabase Dashboard

### Redirect URLs autorisées
Assurez-vous que les **Redirect URLs** incluent :
- ✅ `http://localhost:5173/client/dashboard` (dev)
- ✅ `https://votre-domaine.com/client/dashboard` (prod)

**Comment vérifier** :
1. Allez sur https://supabase.com
2. Projet Locasun → **Authentication** → **URL Configuration**
3. Section **Redirect URLs** : Ajouter les URLs si absentes

### ⚠️ Paramètre `?code=...` suspect
Le log montre `?code=26c79c4c-7bb7-4315-9cd4-47a430466263`. **C'est anormal** !

**Magic Links Supabase utilisent normalement** :
```
/client/dashboard#access_token=xxx&refresh_token=yyy
```

**Pas** :
```
/client/dashboard?code=xxx  ❌
```

**Action recommandée** :
1. Vérifiez dans Supabase Dashboard → **Authentication** → **Email Templates**
2. Template **"Magic Link"** doit utiliser `{{ .ConfirmationURL }}`
3. **Flow Type** dans Auth Settings doit être **"pkce"** (configuré dans `src/lib/supabase.js`)

## 🔍 Autres erreurs dans les logs

### Erreur 406 sur company_settings
```
Failed to load resource: the server responded with a status of 406 () (company_settings)
```

**Action recommandée** :
- Vérifier que la table `company_settings` existe dans Supabase
- Vérifier les RLS policies (Row Level Security) de cette table
- S'assurer que le client authentifié a accès en lecture

**Fichier concerné** : `src/hooks/useSupabaseCompanySettings.js`

## ✅ Résultat attendu

Après ce fix :
- ✅ Les **nouveaux** magic links pointent vers `/dashboard`
- ✅ Les **anciens** magic links (envoyés avant le fix) sont redirigés automatiquement
- ✅ Plus de page blanche pour les clients
- ✅ Le dashboard client se charge correctement

---

**Déployé le** : 3 décembre 2025  
**Testé** : ⏳ En attente de validation client
