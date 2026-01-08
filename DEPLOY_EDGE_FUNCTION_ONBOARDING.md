# Déploiement de l'Edge Function create-organization-onboarding

## 🎯 Objectif
Déployer la fonction Edge qui crée une organisation complète en un seul appel.

## 📋 Prérequis

1. **Supabase CLI installé**
   ```bash
   npm install -g supabase
   ```

2. **Se connecter à Supabase**
   ```bash
   supabase login
   ```

3. **Lier le projet**
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

## 🚀 Déploiement

### Option 1 : Déploiement direct (recommandé)

```bash
cd "/Users/jackluc/Desktop/LOCASUN  SUPABASE"
supabase functions deploy create-organization-onboarding
```

### Option 2 : Déploiement avec secrets

Si vous avez besoin de variables d'environnement spécifiques :

```bash
supabase secrets set MY_SECRET=value
supabase functions deploy create-organization-onboarding
```

## ✅ Vérification

1. **Dans le Dashboard Supabase** :
   - Aller dans `Edge Functions`
   - Vérifier que `create-organization-onboarding` apparaît
   - Statut doit être "Active"

2. **Test via Dashboard** :
   ```json
   {
     "companyName": "Test Company",
     "domain": "test.com",
     "adminEmail": "admin@test.com",
     "adminPassword": "test123456"
   }
   ```

3. **Test via front-end** :
   - Aller sur `/signup`
   - Remplir le formulaire
   - Vérifier la création dans les tables :
     - `organizations`
     - `organization_settings`
     - `organization_domains`
     - `auth.users`
     - `public.users`

## 🔍 Logs

Voir les logs en temps réel :
```bash
supabase functions logs create-organization-onboarding
```

Voir les logs des dernières heures :
```bash
supabase functions logs create-organization-onboarding --since 2h
```

## 🐛 Troubleshooting

### Erreur : "Function not found"
```bash
# Vérifier que la fonction est bien déployée
supabase functions list
```

### Erreur : "Missing environment variables"
```bash
# Les variables SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont automatiquement injectées
# Pas besoin de les configurer manuellement
```

### Erreur : "Permission denied"
```bash
# Vérifier les RLS policies pour platform_admin
# La fonction utilise SERVICE_ROLE_KEY qui bypass le RLS
```

## 📝 Notes importantes

- ✅ La fonction utilise `SUPABASE_SERVICE_ROLE_KEY` pour bypass le RLS
- ✅ Rollback automatique en cas d'erreur (pas de données orphelines)
- ✅ Le mot de passe admin doit contenir au moins 6 caractères
- ✅ Le domaine doit être unique
- ✅ L'email admin doit être unique
- ✅ Le rôle par défaut est "Global Admin" pour la nouvelle organisation

## 🔗 Endpoint

Une fois déployée, l'URL sera :
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/create-organization-onboarding
```

Accessible via :
```javascript
supabase.functions.invoke('create-organization-onboarding', {
  body: { companyName, domain, adminEmail, adminPassword }
})
```
