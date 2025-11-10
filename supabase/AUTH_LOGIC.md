# 🔐 Logique d'Authentification - Locasun

## 🎯 Architecture : 2 Types d'Utilisateurs

### 1️⃣ **USERS PRO** (Admin/Manager/Commercial)

**Stockage :**
- `auth.users` (authentification Supabase)
- `public.users` (profil PRO)

**Accès :**
- Routes : `/admin/*`
- Pages : Pipeline, Agenda, Contacts, Charly, Profil

**Rôles :**
- `Global Admin` : Voit tout, gère tout
- `Manager` : Voit son équipe + ses prospects
- `Commercial` : Voit uniquement ses prospects

**Connexion :**
```javascript
// Login Admin
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'jack.luc@icloud.com',
  password: 'password123'
})

// Vérifier que c'est un user PRO
const { data: userProfile } = await supabase
  .from('users')
  .select('*')
  .eq('id', data.user.id)
  .single()

if (!userProfile) {
  // Pas un user PRO → rediriger vers /dashboard
  navigate('/dashboard')
}
```

---

### 2️⃣ **CLIENTS** (Prospects inscrits)

**Stockage :**
- `auth.users` (authentification Supabase)
- `public.prospects` avec `user_id = auth.user.id`

**Accès :**
- Routes : `/dashboard/*`
- Pages : Mes Projets, Parrainage, Profil, Offres

**Permissions :**
- ✅ Consulter ses projets et étapes
- ✅ Voir les RDV partagés (share = TRUE)
- ✅ Envoyer des messages dans le chat
- ✅ Uploader des documents
- ✅ Modifier son profil (nom, téléphone, adresse)
- ❌ Voir les autres clients
- ❌ Accéder à /admin/*

**Connexion :**
```javascript
// Login Client
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'jean.dupont@example.com',
  password: 'password123'
})

// Récupérer le profil client
const { data: prospect } = await supabase
  .from('prospects')
  .select('*')
  .eq('user_id', data.user.id)
  .single()

if (!prospect) {
  // Pas un client inscrit → peut-être un admin?
  // Vérifier dans users
}
```

---

## 🔄 Workflows d'Inscription

### **A) Inscription Admin** (via /admin/profil)

```javascript
// 1. Créer le user dans auth.users
const { data: authData, error } = await supabase.auth.signUp({
  email: 'nouveau.commercial@locasun.com',
  password: 'password123'
})

// 2. Créer le profil dans public.users
const { error: profileError } = await supabase
  .from('users')
  .insert({
    id: authData.user.id,
    name: 'Nouveau Commercial',
    email: 'nouveau.commercial@locasun.com',
    role: 'Commercial',
    manager_id: 'uuid-du-manager'
  })
```

### **B) Inscription Client** (via /inscription)

```javascript
// 1. Créer le prospect dans public.prospects (sans user_id)
const { data: prospect, error } = await supabase
  .from('prospects')
  .insert({
    name: 'Jean Dupont',
    email: 'jean.dupont@example.com',
    phone: '06 12 34 56 78',
    owner_id: 'uuid-du-commercial', // Le commercial qui a créé le prospect
    status: 'Intéressé',
    tags: ['ACC']
  })
  .select()
  .single()

// 2. Si le client veut se connecter, créer son compte
const { data: authData } = await supabase.auth.signUp({
  email: 'jean.dupont@example.com',
  password: 'password123'
})

// 3. Lier le prospect au user
const { error: linkError } = await supabase
  .from('prospects')
  .update({ user_id: authData.user.id })
  .eq('id', prospect.id)
```

---

## 🛡️ Row Level Security (RLS)

### **Pour les USERS PRO :**

```sql
-- Voir ses propres prospects
CREATE POLICY "Users can view their prospects"
  ON prospects FOR SELECT
  USING (owner_id = auth.uid());

-- Manager voit son équipe
CREATE POLICY "Managers can view team prospects"
  ON prospects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = owner_id AND manager_id = auth.uid()
    )
  );

-- Global Admin voit tout
CREATE POLICY "Global Admin can view all"
  ON prospects FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'Global Admin'
    )
  );
```

### **Pour les CLIENTS :**

```sql
-- Voir ses propres données
CREATE POLICY "Clients can view own data"
  ON prospects FOR SELECT
  USING (user_id = auth.uid());

-- Voir ses propres messages
CREATE POLICY "Clients can view own chat"
  ON chat_messages FOR SELECT
  USING (
    prospect_id IN (
      SELECT id FROM prospects WHERE user_id = auth.uid()
    )
  );

-- Voir les RDV partagés
CREATE POLICY "Clients can view shared appointments"
  ON appointments FOR SELECT
  USING (
    share = TRUE AND
    contact_id IN (
      SELECT id FROM prospects WHERE user_id = auth.uid()
    )
  );
```

---

## 🔀 Logique de Routage

### **Hook useAuth() recommandé :**

```javascript
// src/hooks/useAuth.js
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useNavigate } from 'react-router-dom'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [userType, setUserType] = useState(null) // 'admin' | 'client' | null
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    // Vérifier la session au chargement
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        // Vérifier si c'est un admin
        const { data: adminProfile } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (adminProfile) {
          setUser(adminProfile)
          setUserType('admin')
        } else {
          // Sinon, c'est un client
          const { data: clientProfile } = await supabase
            .from('prospects')
            .select('*')
            .eq('user_id', session.user.id)
            .single()

          setUser(clientProfile)
          setUserType('client')
        }
      }
      setLoading(false)
    })

    // Écouter les changements d'auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null)
          setUserType(null)
          navigate('/')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return { user, userType, loading }
}
```

### **Protection des Routes :**

```javascript
// src/components/ProtectedRoute.jsx
import { useAuth } from '@/hooks/useAuth'
import { Navigate } from 'react-router-dom'

export function ProtectedRoute({ children, requiredType }) {
  const { user, userType, loading } = useAuth()

  if (loading) return <div>Chargement...</div>

  if (!user) return <Navigate to="/" />

  if (requiredType && userType !== requiredType) {
    // Si un admin essaie d'accéder à /dashboard, rediriger vers /admin
    if (userType === 'admin') return <Navigate to="/admin" />
    // Si un client essaie d'accéder à /admin, rediriger vers /dashboard
    if (userType === 'client') return <Navigate to="/dashboard" />
  }

  return children
}

// Utilisation dans App.jsx
<Route
  path="/admin/*"
  element={
    <ProtectedRoute requiredType="admin">
      <AdminLayout />
    </ProtectedRoute>
  }
/>

<Route
  path="/dashboard/*"
  element={
    <ProtectedRoute requiredType="client">
      <ClientLayout />
    </ProtectedRoute>
  }
/>
```

---

## 🔑 Gestion des Mots de Passe

### **Reset Password (Client & Admin) :**

```javascript
// Demander un reset
const { error } = await supabase.auth.resetPasswordForEmail(
  'user@example.com',
  { redirectTo: 'https://locasun.com/reset-password' }
)

// Changer le mot de passe
const { error } = await supabase.auth.updateUser({
  password: 'nouveauMotDePasse123'
})
```

---

## 📊 Tableau Récapitulatif

| Fonctionnalité | Admin/Commercial | Client |
|----------------|------------------|--------|
| Voir tous les prospects | ✅ (selon rôle) | ❌ |
| Voir ses propres projets | ❌ | ✅ |
| Créer des prospects | ✅ | ❌ |
| Modifier son profil | ✅ | ✅ |
| Envoyer des messages | ✅ | ✅ |
| Voir le pipeline | ✅ | ❌ |
| Voir les RDV partagés | ✅ | ✅ (seulement les siens) |
| Uploader des documents | ✅ | ✅ (pour ses projets) |
| Accéder à Charly AI | ✅ | ❌ |
| Parrainer des amis | ❌ | ✅ |

---

## 🎯 Points Clés à Retenir

1. **2 types d'utilisateurs complètement séparés**
2. **`prospects.user_id = NULL`** → Prospect non inscrit
3. **`prospects.user_id = UUID`** → Client inscrit (peut se connecter)
4. **RLS policies différentes** pour admin et client
5. **Routes protégées** : /admin/* vs /dashboard/*
6. **Hook useAuth()** pour détecter automatiquement le type d'utilisateur

---

**Prêt pour l'implémentation ! 🚀**
