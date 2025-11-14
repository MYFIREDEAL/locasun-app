# 🤖 Prompt pour l'IA Supabase Dashboard

> **À copier-coller dans le chat de l'IA Supabase pour obtenir de l'aide contextuelle**

---

## Mon Projet : Locasun - Gestion Projets Énergie

Application React + Vite avec **2 types d'utilisateurs distincts** :
- **Admins** (`public.users` liée à `auth.users`) → CRM/Pipeline
- **Clients** (`public.prospects` liée à `auth.users`) → Suivi projets

## Schéma Actuel

### Table `public.users` (Admins)
- `id` (uuid, pk)
- `user_id` (uuid, fk → `auth.users.id`)
- `email`, `name`, `phone`
- `role` (text : 'Global Admin' | 'Manager' | 'Commercial')
- `access_rights` (jsonb)
- `manager_id` (uuid, fk → `users.id`)

**RLS** : Les commerciaux voient uniquement leurs données + ceux de leur équipe

### Table `public.prospects` (Clients)
- `id` (uuid, pk)
- `user_id` (uuid nullable, fk → `auth.users.id`)
- `email`, `name`, `phone`
- `tags` (jsonb) - Liste des projets du client
- `owner_id` (uuid, fk → `users.id`) - Commercial assigné
- `project_steps_status` (jsonb)

**RLS** : Les clients voient uniquement leurs propres données (`user_id = auth.uid()`)

### Table `appointments`
- `id`, `title`, `start_time`, `end_time`
- `contact_id` (uuid, fk → `prospects.id`)
- `owner_id` (uuid, fk → `users.id`)
- `type`, `status`

## Flux Critique : Invitation Prospect par Magic Link

**Problème actuel** : Quand un admin crée un prospect, j'envoie un magic link avec :
```javascript
supabase.auth.signInWithOtp({
  email: prospect.email,
  options: { emailRedirectTo: 'http://localhost:5173/client/activation' }
})
```

**Questions fréquentes** :
1. Comment configurer les Redirect URLs autorisées ?
2. Comment personnaliser le template email du magic link ?
3. Comment lier automatiquement le `user_id` de `auth.users` au `prospect.user_id` après activation ?
4. Le magic link expire après combien de temps ?

## Real-Time Activé Sur

- ✅ `prospects`
- ✅ `appointments`
- ✅ `users`
- ⚠️ Besoin d'activer sur d'autres tables ?

## Problèmes Récurrents

### 1. "Permission Denied" sur INSERT/UPDATE
**Cause** : Politique RLS trop restrictive
**Solution habituelle** : Vérifier que la policy utilise `auth.uid()` correctement

### 2. Real-time ne se met pas à jour
**Cause** : Replication pas activée sur la table
**Solution** : Database → Replication → Enable pour la table

### 3. Magic Link redirige vers homepage au lieu de `/client/activation`
**Cause** : URL pas dans la whitelist
**Solution** : Authentication → URL Configuration → Ajouter l'URL

### 4. `user_id` reste NULL après signup
**Cause** : Pas de trigger ou logique pour lier `auth.users` et `prospects`
**Solution** : Créer un trigger ou gérer côté frontend après auth

---

## 📝 Question Type pour l'IA Supabase

**Exemple** :
> "J'ai une table `prospects` avec un champ `user_id` nullable qui référence `auth.users.id`. 
> Quand un admin crée un prospect, j'envoie un magic link avec `signInWithOtp()`.
> Comment puis-je automatiquement lier le `user_id` créé par Supabase Auth au prospect après que le client clique sur le magic link ?"
