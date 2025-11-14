# Configuration Supabase - Redirect URLs

## 🎯 Objectif
Permettre aux magic links (liens d'invitation) de rediriger correctement vers l'espace client.

## 📋 Étapes

### 1. Accéder à Supabase Dashboard
- Va sur https://supabase.com
- Connecte-toi et sélectionne ton projet **Locasun**

### 2. Configuration des Redirect URLs
1. Dans le menu de gauche, clique sur **Authentication** ⚙️
2. Clique sur **URL Configuration**
3. Dans la section **Redirect URLs**, ajoute ces URLs :

```
http://localhost:5173/client/activation
https://ton-domaine-production.com/client/activation
```

4. Clique sur **Save** 💾

### 3. Configuration Email Templates (Optionnel)
1. Va dans **Authentication** > **Email Templates**
2. Sélectionne **Magic Link**
3. Tu peux personnaliser le texte de l'email d'invitation

**Variables disponibles** :
- `{{ .ConfirmationURL }}` - Le lien magique
- `{{ .SiteURL }}` - L'URL de ton site

## ✅ Vérification

Une fois configuré, teste le flux :

1. **En tant qu'Admin** : Crée un nouveau prospect dans l'espace pro
2. **Le prospect reçoit** : Un email avec le magic link
3. **Clic sur le lien** : Redirige vers `/client/activation`
4. **ActivationPage** : Lie le `user_id` au prospect
5. **Redirection finale** : Dashboard client (`/dashboard`)

## 🔒 Sécurité

- ⚠️ **Important** : Ne jamais exposer la `SUPABASE_SERVICE_ROLE_KEY` dans le frontend
- ✅ Utilise uniquement `SUPABASE_ANON_KEY` dans `.env`
- ✅ Les RLS policies protègent les données automatiquement

## 📝 Notes

- Les magic links expirent après **1 heure** par défaut
- Un prospect ne peut activer son compte qu'une seule fois
- Le `user_id` est automatiquement lié lors de l'activation
