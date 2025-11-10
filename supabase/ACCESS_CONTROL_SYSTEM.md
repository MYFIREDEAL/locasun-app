# 🔐 Système de Droits d'Accès et Filtrage Utilisateurs

## ✅ Vue d'ensemble

Le système de **droits d'accès granulaires** permet aux admins de contrôler précisément ce que chaque utilisateur peut voir et faire dans l'application. Il existe **2 niveaux de contrôle** :

1. **Accès aux modules** : Quels modules l'utilisateur peut utiliser (Pipeline, Agenda, Contacts)
2. **Filtrage par utilisateur** : Quelles données l'utilisateur peut voir (ses propres données + celles d'autres utilisateurs autorisés)

Ce système est configuré depuis **ProfilePage > Gestion des utilisateurs > Droits d'accès**.

## 🏗️ Architecture

### Hiérarchie des rôles

```
Global Admin (tout voir, tout faire)
    │
    ├──→ Manager (voir son équipe + users autorisés)
    │       │
    │       └──→ Commercial 1, Commercial 2, Commercial 3
    │
    └──→ Commercial (voir uniquement ses données + users autorisés)
```

### Table `users` avec `access_rights`

```sql
CREATE TABLE public.users (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT CHECK (role IN ('Global Admin', 'Manager', 'Commercial')),
  manager_id UUID REFERENCES public.users(id),
  access_rights JSONB DEFAULT '{"modules": ["Pipeline", "Agenda", "Contacts"], "users": []}'::jsonb,
  ...
);
```

### Structure de `access_rights` (JSONB)

```json
{
  "modules": ["Pipeline", "Agenda", "Contacts"],
  "users": ["user-uuid-1", "user-uuid-2", "user-uuid-3"]
}
```

| Champ | Type | Description |
|-------|------|-------------|
| `modules` | Array[String] | Liste des modules accessibles par l'utilisateur |
| `users` | Array[UUID] | IDs des utilisateurs dont on peut voir les données |

## 🎯 Cas d'usage

### Cas 1 : Commercial avec accès restreint

**Contexte** : Un commercial ne doit voir que ses propres clients et aucun autre.

**Configuration** :
```json
{
  "modules": ["Pipeline", "Contacts"],
  "users": []
}
```

**Résultat** :
- ✅ Peut accéder au Pipeline et Contacts
- ❌ **Ne peut PAS accéder à l'Agenda** (module non autorisé)
- ✅ Voit uniquement ses propres prospects/RDV/appels
- ❌ Ne voit pas les données des autres commerciaux

### Cas 2 : Commercial avec accès à l'agenda d'un collègue

**Contexte** : Commercial A doit pouvoir voir l'agenda du Commercial B (pour coordination).

**Configuration pour Commercial A** :
```json
{
  "modules": ["Pipeline", "Agenda", "Contacts"],
  "users": ["uuid-commercial-b"]
}
```

**Résultat** :
- ✅ Accès à tous les modules
- ✅ Voit ses propres prospects/RDV/appels
- ✅ **Voit aussi les RDV/appels du Commercial B** dans l'agenda
- ❌ Ne peut pas modifier les RDV du Commercial B (lecture seule)

### Cas 3 : Manager avec vue sur toute son équipe

**Contexte** : Un Manager gère 3 commerciaux et doit voir toutes leurs données.

**Configuration** :
```json
{
  "modules": ["Pipeline", "Agenda", "Contacts"],
  "users": ["uuid-comm-1", "uuid-comm-2", "uuid-comm-3"]
}
```

**Résultat** :
- ✅ Accès à tous les modules
- ✅ Voit ses propres données
- ✅ **Voit tous les prospects/RDV/appels de son équipe**
- ✅ Peut filtrer par commercial dans l'agenda
- ❌ Ne peut pas modifier les données des commerciaux (lecture seule)

### Cas 4 : Global Admin (accès total)

**Contexte** : Le Global Admin a tous les droits sans restriction.

**Configuration** :
```json
{
  "modules": ["Pipeline", "Agenda", "Contacts"],
  "users": []  // Pas besoin de spécifier, voit TOUT le monde
}
```

**Résultat** :
- ✅ Accès à tous les modules
- ✅ **Voit TOUTES les données de TOUS les utilisateurs**
- ✅ Peut tout modifier
- ✅ Contourne toutes les restrictions

## 🔄 Workflow de configuration

### 1️⃣ Ouvrir les droits d'accès (Admin)

**Interface** : `ProfilePage.jsx` > **Gestion des utilisateurs** > Bouton "Droits d'accès"

```javascript
// Récupérer l'utilisateur à configurer
const { data: user, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)
  .single();

// Afficher la configuration actuelle
console.log(user.access_rights);
// {
//   "modules": ["Pipeline", "Agenda", "Contacts"],
//   "users": ["uuid-1", "uuid-2"]
// }
```

### 2️⃣ Modifier les modules autorisés

```javascript
// L'admin coche/décoche les modules
const handleModuleChange = async (moduleName, checked) => {
  const currentModules = user.access_rights.modules || [];
  const newModules = checked 
    ? [...currentModules, moduleName]
    : currentModules.filter(m => m !== moduleName);

  const { data: updated } = await supabase
    .from('users')
    .update({
      access_rights: {
        ...user.access_rights,
        modules: newModules
      }
    })
    .eq('id', userId);
};
```

### 3️⃣ Ajouter des utilisateurs autorisés

```javascript
// L'admin sélectionne les utilisateurs dont ce user peut voir les données
const handleUsersChange = async (selectedUsers) => {
  const { data: updated } = await supabase
    .from('users')
    .update({
      access_rights: {
        ...user.access_rights,
        users: selectedUsers.map(u => u.value) // Array d'UUIDs
      }
    })
    .eq('id', userId);
};
```

### 4️⃣ Enregistrer la configuration

```javascript
const handleSave = async () => {
  const { error } = await supabase
    .from('users')
    .update({
      access_rights: {
        modules: ['Pipeline', 'Agenda', 'Contacts'],
        users: ['uuid-comm-1', 'uuid-comm-2']
      }
    })
    .eq('id', userId);

  if (!error) {
    toast({
      title: 'Droits d\'accès modifiés !',
      description: `Les droits de ${user.name} ont été mis à jour.`
    });
  }
};
```

## 🔒 Row Level Security (RLS)

### Policies pour `prospects` avec filtrage

```sql
-- L'utilisateur voit ses propres prospects + ceux des users autorisés
CREATE POLICY "Users can view their own and authorized prospects"
  ON public.prospects
  FOR SELECT
  USING (
    -- Ses propres prospects
    owner_id = auth.uid() OR
    -- Prospects des utilisateurs autorisés via access_rights.users
    owner_id IN (
      SELECT jsonb_array_elements_text(access_rights->'users')::UUID
      FROM public.users
      WHERE user_id = auth.uid()
    )
  );
```

### Policies pour `appointments` avec filtrage

```sql
-- L'utilisateur voit ses propres RDV + ceux des users autorisés
CREATE POLICY "Users can view their own and authorized appointments"
  ON public.appointments
  FOR SELECT
  USING (
    -- Ses propres RDV
    assigned_user_id = auth.uid() OR
    -- RDV des utilisateurs autorisés
    assigned_user_id IN (
      SELECT jsonb_array_elements_text(access_rights->'users')::UUID
      FROM public.users
      WHERE user_id = auth.uid()
    )
  );
```

### Policies pour `calls` et `tasks`

Les mêmes patterns s'appliquent pour `calls` et `tasks`.

## 📊 Application du filtrage dans le code

### Dans Agenda.jsx

```javascript
// Récupérer les IDs autorisés pour filtrer les données
const allowedIds = useMemo(() => {
  if (!activeAdminUser) return [];
  
  // Global Admin voit tout
  if (activeAdminUser.role === 'Global Admin' || activeAdminUser.role === 'Admin') {
    return null; // null = pas de filtre
  }
  
  // Autres rôles : ses données + users autorisés
  return [
    activeAdminUser.id,
    ...(activeAdminUser.access_rights?.users || [])
  ];
}, [activeAdminUser]);

// Filtrer les RDV visibles
const visibleAppointments = useMemo(() => {
  return appointments.filter(apt => {
    // Si allowedIds = null → Global Admin → tout voir
    if (allowedIds === null) return true;
    
    // Sinon, vérifier si le RDV appartient à un user autorisé
    return allowedIds.includes(apt.assigned_user_id);
  });
}, [appointments, allowedIds]);
```

### Dans FinalPipeline.jsx

```javascript
// Filtrer les prospects visibles
const visibleProspects = useMemo(() => {
  if (!activeAdminUser) return [];
  
  const allowedIds = (activeAdminUser.role === 'Global Admin' || activeAdminUser.role === 'Admin')
    ? null
    : [activeAdminUser.id, ...(activeAdminUser.access_rights?.users || [])];
  
  return prospects.filter(prospect => {
    if (allowedIds === null) return true;
    return allowedIds.includes(prospect.owner_id);
  });
}, [prospects, activeAdminUser]);
```

### Dans CompleteOriginalContacts.jsx

```javascript
// Même logique pour les contacts
const visibleContacts = useMemo(() => {
  const allowedIds = (activeAdminUser.role === 'Global Admin')
    ? null
    : [activeAdminUser.id, ...(activeAdminUser.access_rights?.users || [])];
  
  return contacts.filter(contact => {
    if (allowedIds === null) return true;
    return allowedIds.includes(contact.assigned_user_id);
  });
}, [contacts, activeAdminUser]);
```

## 🎯 Exemples de requêtes Supabase

### Récupérer les prospects visibles par l'utilisateur

```javascript
const { data: prospects, error } = await supabase
  .from('prospects')
  .select('*')
  // RLS policy gère automatiquement le filtrage
  // Pas besoin de filtrer manuellement côté client
  .order('created_at', { ascending: false });
```

### Récupérer les RDV visibles par l'utilisateur

```javascript
const { data: appointments, error } = await supabase
  .from('appointments')
  .select(`
    *,
    contact:prospects(id, name, email),
    assigned_user:users(id, name)
  `)
  // RLS policy gère le filtrage
  .gte('date', startDate)
  .lte('date', endDate)
  .order('date', { ascending: true });
```

### Vérifier si un utilisateur a accès à un module

```javascript
const hasModuleAccess = (user, moduleName) => {
  // Global Admin a toujours accès
  if (user.role === 'Global Admin') return true;
  
  // Vérifier access_rights.modules
  const modules = user.access_rights?.modules || [];
  return modules.includes(moduleName);
};

// Utilisation
if (hasModuleAccess(currentUser, 'Agenda')) {
  // Afficher le module Agenda
} else {
  // Rediriger vers une page d'erreur
}
```

## 🚀 Migration depuis localStorage

### Avant (localStorage)

```javascript
const users = JSON.parse(localStorage.getItem('evatime_users') || '{}');
const user = users['user-123'];

// Filtrage manuel dans le code
const allowedIds = [user.id, ...(user.accessRights?.users || [])];
const visibleProspects = allProspects.filter(p => 
  allowedIds.includes(p.ownerId)
);
```

### Après (Supabase avec RLS)

```javascript
// Récupération automatiquement filtrée par RLS
const { data: visibleProspects } = await supabase
  .from('prospects')
  .select('*');

// Pas besoin de filtrage manuel !
// Les RLS policies gèrent tout
```

## 📁 Fichiers concernés

### Backend (Supabase)
- ✅ `/supabase/schema.sql` - Table `users` avec `access_rights` JSONB
- ✅ RLS policies avec filtrage sur `access_rights.users`

### Frontend (à migrer)
- ⏳ `src/services/userService.js` - CRUD pour users et access_rights
- ⏳ `src/pages/admin/ProfilePage.jsx` - Interface de configuration (ligne 2458)
- ⏳ `src/pages/admin/Agenda.jsx` - Filtrage des RDV (ligne 598)
- ⏳ `src/pages/admin/FinalPipeline.jsx` - Filtrage des prospects (ligne 133)
- ⏳ `src/pages/admin/CompleteOriginalContacts.jsx` - Filtrage des contacts (ligne 235)
- ⏳ `src/hooks/useAccessControl.js` - Hook personnalisé (à créer)

## 🔍 Hook personnalisé recommandé

```javascript
// src/hooks/useAccessControl.js
import { useMemo } from 'react';
import { useAuth } from './useAuth';

export const useAccessControl = () => {
  const { user } = useAuth();

  const hasModuleAccess = useMemo(() => {
    return (moduleName) => {
      if (!user) return false;
      if (user.role === 'Global Admin') return true;
      
      const modules = user.access_rights?.modules || [];
      return modules.includes(moduleName);
    };
  }, [user]);

  const allowedUserIds = useMemo(() => {
    if (!user) return [];
    if (user.role === 'Global Admin') return null; // null = tous
    
    return [user.id, ...(user.access_rights?.users || [])];
  }, [user]);

  const canViewUserData = useMemo(() => {
    return (targetUserId) => {
      if (!user) return false;
      if (user.role === 'Global Admin') return true;
      if (allowedUserIds === null) return true;
      
      return allowedUserIds.includes(targetUserId);
    };
  }, [user, allowedUserIds]);

  return {
    hasModuleAccess,
    allowedUserIds,
    canViewUserData
  };
};
```

---

**✅ Le système de droits d'accès et filtrage utilisateurs est maintenant correctement intégré dans le schéma Supabase avec RLS policies !**
