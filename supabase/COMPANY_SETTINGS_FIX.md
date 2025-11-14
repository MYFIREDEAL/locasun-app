# Fix Company Settings Table

## 🐛 Problème
Erreur 406 lors de l'accès à `company_settings` :
- Le schéma SQL utilisait `company_logo` 
- Le hook React attend `logo_url`
- Mauvais ID singleton

## ✅ Solution

### 1️⃣ Exécuter le script de migration dans Supabase

**Dashboard Supabase** → **SQL Editor** → **New Query**

Copier-coller le contenu de `fix_company_settings_schema.sql` et exécuter.

### 2️⃣ Vérifications

Après exécution, tu dois voir :

```sql
-- Vérifier que la table existe avec le bon schéma
SELECT * FROM public.company_settings;
-- Résultat attendu: 1 ligne avec id = 9769af46-b3ac-4909-8810-a8cf3fd6e307

-- Vérifier le real-time
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' AND tablename = 'company_settings';
-- Résultat attendu: 1 ligne
```

### 3️⃣ Tester l'application

1. Recharger l'app : http://localhost:5173
2. Se connecter en **Global Admin**
3. Aller dans **Profil Admin**
4. Upload un logo → Devrait fonctionner sans erreur 406
5. Ouvrir un 2ème onglet → Le logo devrait apparaître en real-time

## 📋 Structure finale de la table

```sql
company_settings (
  id UUID PRIMARY KEY,           -- 9769af46-b3ac-4909-8810-a8cf3fd6e307
  logo_url TEXT,                 -- URL ou base64
  company_name TEXT,             -- "Evatime"
  settings JSONB,                -- Config générale
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

## 🔒 RLS Policies

- ✅ `company_settings_select` : Tous les users authentifiés peuvent lire
- ✅ `company_settings_update` : Seuls les Global Admin peuvent modifier

## 🔥 Real-time

- ✅ Table ajoutée à `supabase_realtime` publication
- ✅ Hook `useSupabaseCompanySettings` écoute les UPDATE events
