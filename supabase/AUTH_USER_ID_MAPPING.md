# 🔑 Mapping entre `auth.uid()` et tables - CRITIQUE POUR RLS

## ⚠️  PROBLÈME IDENTIFIÉ

Les politiques RLS utilisent `auth.uid()` qui retourne l'UUID de `auth.users(id)`. 

**Dans le schéma actuel, la table `public.users` a :**
- `id` UUID PRIMARY KEY → clé interne pour relations (FK)
- `user_id` UUID REFERENCES `auth.users(id)` → lien vers Supabase Auth

**Donc :**
```sql
auth.uid() = users.user_id  ✅ CORRECT
auth.uid() = users.id       ❌ FAUX (sauf si on les synchronise)
```

---

## 🎯 DEUX SOLUTIONS POSSIBLES

### Solution 1 : Utiliser `user_id` dans toutes les politiques RLS ✅ RECOMMANDÉE

**Avantage :** Séparation claire entre PK interne (`id`) et authentification (`user_id`)

**Modifications nécessaires :**
Toutes les politiques RLS doivent comparer avec `user_id` :

```sql
-- ✅ CORRECT
CREATE POLICY "Users can view their own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = user_id);

-- ❌ FAUX
CREATE POLICY "Users can view their own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);
```

**Politiques à corriger :**
- ✅ `users` table : `auth.uid() = user_id` (déjà corrigé)
- ⚠️  Toutes les sous-requêtes : `WHERE user_id = auth.uid()` au lieu de `WHERE id = auth.uid()`

---

### Solution 2 : Synchroniser `id` avec `auth.users(id)` ❌ PAS RECOMMANDÉE

**Principe :** Utiliser l'UUID de `auth.users` comme PK de `public.users`

```sql
-- Supprimer user_id, utiliser id directement
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id), -- id = auth.users.id
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL,
  ...
);
```

**Inconvénients :**
- Perd la flexibilité (impossible d'avoir des users sans auth)
- Couplage fort avec Supabase Auth
- Difficile à tester en local

---

## ✅ CORRECTION APPLIQUÉE : Solution 1

### 1. Table `users` - Politiques RLS corrigées

```sql
-- ✅ CORRIGÉ
CREATE POLICY "Users can view their own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own info"
  ON public.users
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Global Admin can manage all users"
  ON public.users
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE user_id = auth.uid() AND role = 'Global Admin'
      --    ^^^^^^^^ CORRIGÉ : user_id au lieu de id
    )
  );
```

### 2. Autres tables - Sous-requêtes à corriger

**Pattern à rechercher et remplacer :**

```sql
-- ❌ AVANT
WHERE id = auth.uid()

-- ✅ APRÈS  
WHERE user_id = auth.uid()
```

**Tables concernées :**
- `users` → Vérifie si l'utilisateur existe
- `prospects` → Pas de changement (utilise `user_id` pour clients, `owner_id` pour users PRO)
- `appointments`, `calls`, `tasks` → `assigned_user_id` (FK vers `users.id`, pas `auth.uid()`)
- `chat_messages`, `notifications` → Utilise FK vers `users.id`

---

## 🔍 RÈGLES DE MAPPING

| Contexte | Bon champ | Mauvais champ |
|----------|-----------|---------------|
| **Auth.uid() comparé à users** | `user_id` | ~~`id`~~ |
| **Référence FK entre tables** | `id` | ~~`user_id`~~ |
| **Vérifier si user PRO existe** | `WHERE user_id = auth.uid()` | ~~`WHERE id = auth.uid()`~~ |
| **Lier appointment à user** | `assigned_user_id → users.id` | ~~`assigned_user_id → users.user_id`~~ |

---

## 📋 CHECKLIST DE CORRECTION

### ✅ Déjà corrigé
- [x] `CREATE POLICY "Users can view their own profile"` → `auth.uid() = user_id`
- [x] `CREATE POLICY "Users can update their own info"` → `user_id = auth.uid()`
- [x] `CREATE POLICY "Global Admin can manage all users"` → `WHERE user_id = auth.uid()`

### ⚠️  À corriger
- [ ] `CREATE POLICY "Managers can view their team"` → ligne 814 : `WHERE id = auth.uid()`
- [ ] Toutes les politiques avec `EXISTS (SELECT 1 FROM users WHERE id = auth.uid())`
- [ ] Politiques `project_infos`, `chat_messages` → `WHERE id = auth.uid()`

**Requête de recherche :**
```bash
grep -n "WHERE.*id = auth.uid()" supabase/schema.sql
grep -n "WHERE id = auth.uid()" supabase/schema.sql
```

---

## 🚀 MIGRATION DU CODE FRONTEND

**Le code actuel utilise :**
```javascript
// App.jsx ligne 363
{ id: 'user-1', name: 'Jack Luc', email: '...', role: 'Global Admin' }
```

**Après migration Supabase, il faudra :**

```javascript
// Lors du login avec Supabase Auth
const { data: { user }, error } = await supabase.auth.signInWithPassword({
  email: 'jack.luc@icloud.com',
  password: '...'
});

// user.id → c'est l'UUID de auth.users
// Récupérer le profil PRO depuis public.users :
const { data: userProfile } = await supabase
  .from('users')
  .select('*')
  .eq('user_id', user.id)  // ← IMPORTANT : user_id, pas id
  .single();

// userProfile contient :
// { id: 'uuid-interne', user_id: 'uuid-auth', name: 'Jack Luc', role: 'Global Admin' }
```

**Clé importante :**
- `auth.user.id` → UUID Supabase Auth
- `public.users.user_id` → Référence à `auth.user.id`
- `public.users.id` → Clé primaire interne pour les FK

---

## ✅ RÉSUMÉ

**La confusion vient de :**
- Code actuel : `users` avec `id` comme clé simple
- Schéma Supabase : `users` avec 2 UUIDs (`id` pour FK, `user_id` pour auth)

**Solution appliquée :**
- ✅ Utiliser `user_id` dans toutes les comparaisons avec `auth.uid()`
- ✅ Garder `id` pour les FK entre tables
- ⚠️  Corriger toutes les sous-requêtes qui utilisent `WHERE id = auth.uid()`

**Prochaine étape :**
Faire une recherche/remplacer globale dans `schema.sql` :
```sql
-- Rechercher : WHERE id = auth.uid()
-- Remplacer : WHERE user_id = auth.uid()
```
