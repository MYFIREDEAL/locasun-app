# 🚀 INSTALLATION PLATFORM ADMIN - GUIDE COMPLET

## 📋 PROBLÈME ACTUEL
- ❌ Connexion échoue avec erreur 400/406
- ❌ "User not found in public.users"
- ❌ RLS bloque l'accès à la table users pour platform_admin

---

## ✅ SOLUTION - ÉTAPES À SUIVRE

### 1️⃣ ACCÉDER AU DASHBOARD SUPABASE

1. Aller sur : https://supabase.com
2. Se connecter à votre projet
3. Aller dans **SQL Editor**

---

### 2️⃣ EXÉCUTER LE SCRIPT D'INSTALLATION

**Copier-coller le script suivant dans le SQL Editor :**

```sql
-- ============================================
-- 🔧 INSTALLATION COMPLÈTE PLATFORM ADMIN
-- ============================================

-- ÉTAPE 1 : Modifier la contrainte de rôle
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users
ADD CONSTRAINT users_role_check 
CHECK (role IN ('Global Admin', 'Manager', 'Commercial', 'platform_admin'));

-- ÉTAPE 2 : Rendre organization_id nullable
ALTER TABLE public.users 
ALTER COLUMN organization_id DROP NOT NULL;

-- ÉTAPE 3 : Créer/mettre à jour l'utilisateur platform_admin
INSERT INTO public.users (user_id, email, name, role, organization_id)
VALUES (
  '66adc899-0d3e-46f6-87ec-4c73b4fe4e26',
  'jack.luc2021@gmail.com',
  'Jack Luc',
  'platform_admin',
  NULL
)
ON CONFLICT (user_id) 
DO UPDATE SET 
  role = 'platform_admin',
  email = 'jack.luc2021@gmail.com',
  name = 'Jack Luc',
  organization_id = NULL;

-- ÉTAPE 4 : Créer la RLS policy pour platform_admin
DROP POLICY IF EXISTS "platform_admin_read_self" ON public.users;

CREATE POLICY "platform_admin_read_self"
ON public.users
FOR SELECT
TO authenticated
USING (
  -- Platform admin peut lire sa propre ligne
  (role = 'platform_admin' AND user_id = auth.uid())
  OR
  -- Admins normaux peuvent lire leur org
  (organization_id IS NOT NULL AND organization_id IN (
    SELECT organization_id FROM public.users WHERE user_id = auth.uid()
  ))
);

-- ÉTAPE 5 : Policy pour accès complet platform_admin
DROP POLICY IF EXISTS "platform_admin_full_access" ON public.users;

CREATE POLICY "platform_admin_full_access"
ON public.users
FOR ALL
TO authenticated
USING (
  -- Si l'utilisateur est platform_admin, accès total
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE user_id = auth.uid() 
    AND role = 'platform_admin'
  )
);

-- ÉTAPE 6 : Vérification
SELECT 
  id,
  user_id,
  email,
  name,
  first_name,
  last_name,
  role,
  organization_id,
  created_at
FROM public.users
WHERE user_id = '66adc899-0d3e-46f6-87ec-4c73b4fe4e26';
```

**Cliquer sur RUN pour exécuter.**

---

### 3️⃣ VÉRIFIER LE COMPTE AUTH

1. Dans Supabase Dashboard → **Authentication** → **Users**
2. Vérifier que l'utilisateur `jack.luc2021@gmail.com` existe
3. UUID doit être : `66adc899-0d3e-46f6-87ec-4c73b4fe4e26`

**Si l'utilisateur n'existe PAS** :
- Créer un nouveau compte via le dashboard
- Email : `jack.luc2021@gmail.com`
- Password : (choisir un mot de passe fort)
- Copier l'UUID généré
- Mettre à jour le script SQL ci-dessus avec le bon UUID

---

### 4️⃣ TESTER LA CONNEXION

1. Aller sur : https://evatime.vercel.app/platform-login
2. Email : `jack.luc2021@gmail.com`
3. Password : (votre mot de passe Supabase)
4. Cliquer "Se connecter"

**Résultat attendu :**
✅ Redirect vers `/platform/organizations`
✅ Liste des organisations visible

---

## 🔍 DÉPANNAGE

### Erreur 400/406 persiste ?
- Vérifier que les RLS policies ont été créées
- Vérifier dans Supabase Dashboard → Database → Policies (table users)
- Doit y avoir : `platform_admin_read_self` et `platform_admin_full_access`

### "User not found" ?
- Vérifier que l'UUID dans `auth.users` correspond à l'UUID dans `public.users`
- Exécuter : `SELECT * FROM auth.users WHERE email = 'jack.luc2021@gmail.com';`

### Mot de passe incorrect ?
- Réinitialiser le mot de passe dans Supabase Dashboard → Authentication → Users
- Ou utiliser la fonction "Reset Password"

---

## 📊 VÉRIFICATION FINALE

Exécuter ces requêtes dans SQL Editor pour confirmer :

```sql
-- 1. Vérifier l'utilisateur dans public.users
SELECT * FROM public.users 
WHERE email = 'jack.luc2021@gmail.com';

-- 2. Vérifier l'utilisateur dans auth.users
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'jack.luc2021@gmail.com';

-- 3. Vérifier les policies
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users' 
AND policyname LIKE '%platform_admin%';
```

**Tous doivent retourner des résultats.**

---

## ✅ CONFIRMATION SUCCÈS

Vous saurez que tout fonctionne quand :
1. ✅ Connexion sur /platform-login réussie
2. ✅ Redirect automatique vers /platform/organizations
3. ✅ Header affiche "Jack Luc" + badge "Platform Admin"
4. ✅ Liste des organisations visible

---

## 🆘 BESOIN D'AIDE ?

Si ça ne fonctionne toujours pas après ces étapes :
1. Copier les erreurs de la console navigateur
2. Copier le résultat des requêtes de vérification
3. Me les envoyer pour diagnostic
