# 🚀 Guide de Déploiement Supabase - Pas à Pas

## ⏱️ Temps estimé : 15-20 minutes

---

## ✅ ÉTAPE 1 : Créer un Compte Supabase (5 min)

### 1. Aller sur Supabase
```
https://supabase.com
```

### 2. S'inscrire / Se connecter
- Utilisez votre compte GitHub (recommandé)
- Ou créez un compte avec email/mot de passe

### 3. Créer un nouveau projet
- Cliquez sur **"New Project"**
- Choisissez un nom : `locasun-production` (ou `locasun-dev` pour les tests)
- Choisissez un mot de passe de base de données (notez-le !)
- Région : **Europe West (Frankfurt)** (pour la France)
- Plan : **Free** (suffisant pour démarrer)

⏳ **Attendez 2-3 minutes** que le projet soit créé...

---

## ✅ ÉTAPE 2 : Récupérer les Clés API (2 min)

### 1. Dans votre projet Supabase, allez dans :
```
Settings (⚙️) → API
```

### 2. Copiez ces valeurs :
- **Project URL** : `https://xxxxx.supabase.co`
- **anon / public key** : `eyJhbGciOi...` (longue chaîne)

### 3. Gardez-les de côté pour plus tard !

---

## ✅ ÉTAPE 3 : Exécuter le Schéma SQL (5 min)

### Option A : Via l'Interface Supabase (⭐ Recommandé)

1. Dans votre projet, allez dans :
   ```
   SQL Editor (icône </> )
   ```

2. Cliquez sur **"New query"**

3. Ouvrez le fichier `supabase/schema.sql` de ce projet

4. **Copiez TOUT le contenu** (Ctrl+A puis Ctrl+C)

5. **Collez-le** dans l'éditeur Supabase

6. Cliquez sur **RUN** (▶️) en bas à droite

7. Attendez quelques secondes...

8. ✅ Vous devriez voir :
   ```
   Success. No rows returned
   ```

### Option B : Via la CLI Supabase

```bash
# Installer la CLI
npm install -g supabase

# Se connecter
supabase login

# Lier votre projet
supabase link --project-ref YOUR_PROJECT_REF

# Exécuter le schéma
supabase db push
```

---

## ✅ ÉTAPE 4 : Vérifier l'Installation (3 min)

### 1. Aller dans l'onglet **Table Editor**

Vous devriez voir ces 16 tables :

- ✅ `users`
- ✅ `prospects`
- ✅ `projects` ← Contient déjà 5 projets !
- ✅ `project_steps_status`
- ✅ `project_infos`
- ✅ `appointments`
- ✅ `calls`
- ✅ `tasks`
- ✅ `chat_messages`
- ✅ `notifications`
- ✅ `client_notifications`
- ✅ `forms`
- ✅ `prompts`
- ✅ `global_pipeline_steps` ← Contient déjà 3 colonnes !
- ✅ `client_form_panels`
- ✅ `company_settings` ← Contient déjà "Locasun" !

### 2. Cliquez sur la table `projects`

Vous devriez voir 5 lignes :
- ACC
- Autonomie
- Centrale
- Investissement
- ProducteurPro

✅ **C'est bon !** Votre base de données est prête ! 🎉

---

## ✅ ÉTAPE 5 : Configurer l'Application React (5 min)

### 1. Créer le fichier `.env`

À la **racine** de votre projet React, créez un fichier `.env` :

```bash
# Dans le terminal
cd "/Users/jackluc/Desktop/LOCASUN  SUPABASE"
touch .env
```

### 2. Ajouter les clés Supabase

Ouvrez `.env` et collez ceci (en remplaçant par VOS clés) :

```env
VITE_SUPABASE_URL=https://VOTRE-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOi...
```

⚠️ **Remplacez** `VOTRE-PROJECT` et la clé par vos vraies valeurs !

### 3. Sécuriser le fichier `.env`

Ajoutez `.env` au `.gitignore` :

```bash
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
```

✅ **Vos clés sont maintenant sécurisées !**

---

## ✅ ÉTAPE 6 : Installer Supabase Client (1 min)

Dans votre terminal :

```bash
npm install @supabase/supabase-js
```

---

## ✅ ÉTAPE 7 : Créer le Client Supabase (2 min)

### 1. Créez le fichier `src/lib/supabase.js`

```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables!')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### 2. Testez la connexion

Ajoutez cette ligne dans `src/App.jsx` (temporairement) :

```javascript
import { supabase } from '@/lib/supabase'

// Dans le useEffect
useEffect(() => {
  console.log('Supabase client:', supabase)
  
  // Test de connexion
  supabase.from('projects').select('*').then(({ data, error }) => {
    if (error) {
      console.error('Erreur Supabase:', error)
    } else {
      console.log('✅ Connexion Supabase réussie !', data)
    }
  })
}, [])
```

### 3. Lancez l'application

```bash
npm run dev
```

### 4. Ouvrez la console du navigateur

Vous devriez voir :
```
✅ Connexion Supabase réussie ! [{...}, {...}, ...]
```

🎉 **Félicitations ! Votre app est connectée à Supabase !**

---

## ✅ ÉTAPE 8 : Activer Real-time (Optionnel, 3 min)

### 1. Dans Supabase, allez dans :
```
Database → Replication
```

### 2. Activez la réplication pour ces tables :
- ✅ `chat_messages`
- ✅ `notifications`
- ✅ `client_notifications`
- ✅ `appointments`
- ✅ `prospects`

### 3. Sauvegardez

✅ **Le real-time est maintenant actif !**

---

## ✅ ÉTAPE 9 : Créer le Premier Utilisateur (5 min)

### Option A : Via l'interface Supabase

1. Allez dans **Authentication** → **Users**

2. Cliquez sur **"Add user"** → **"Create new user"**

3. Remplissez :
   ```
   Email: jack.luc@icloud.com
   Password: VotreMotDePasse123!
   Auto Confirm User: ✅ Oui
   ```

4. Cliquez sur **"Create user"**

5. Copiez l'**UUID** de l'utilisateur (ex: `a1b2c3d4-...`)

6. Allez dans **SQL Editor** et exécutez :

```sql
INSERT INTO public.users (id, name, email, role)
VALUES (
  'a1b2c3d4-VOTRE-UUID-ICI',
  'Jack Luc',
  'jack.luc@icloud.com',
  'Global Admin'
);
```

✅ **Votre premier admin est créé !**

### Option B : Via l'API Supabase (dans votre app)

```javascript
// Dans un composant React
const { data, error } = await supabase.auth.signUp({
  email: 'jack.luc@icloud.com',
  password: 'VotreMotDePasse123!',
  options: {
    data: {
      name: 'Jack Luc',
      role: 'Global Admin'
    }
  }
})
```

---

## ✅ ÉTAPE 10 : Tester l'Authentification (3 min)

### 1. Dans votre app, créez une page de login simple :

```javascript
const handleLogin = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  if (error) {
    console.error('Erreur login:', error)
  } else {
    console.log('✅ Connecté !', data.user)
  }
}
```

### 2. Testez avec vos identifiants

✅ **Si ça marche, vous êtes prêt pour la suite !**

---

## 🎉 RÉCAPITULATIF

Vous avez maintenant :

- ✅ Un projet Supabase fonctionnel
- ✅ 16 tables créées avec relations et indexes
- ✅ Row Level Security (RLS) configuré
- ✅ Real-time activé
- ✅ Client Supabase installé
- ✅ Variables d'environnement sécurisées
- ✅ Premier utilisateur admin créé
- ✅ Authentification testée

---

## 🚀 PROCHAINES ÉTAPES

1. **Créer les services API** (`src/services/`)
2. **Migrer les données localStorage → Supabase**
3. **Remplacer les useState par des appels Supabase**
4. **Implémenter le real-time dans les composants**

➡️ Passez à l'étape 3 de la todo list : **Configuration initiale de Supabase** ✅

---

## 🆘 PROBLÈMES COURANTS

### Erreur : "Invalid API key"
➡️ Vérifiez que vous avez bien copié l'**anon key** (pas la service_role key !)

### Erreur : "relation X does not exist"
➡️ Le schéma SQL n'a pas été exécuté. Relancez l'étape 3.

### Erreur : "permission denied for table X"
➡️ Les RLS policies bloquent l'accès. Vérifiez que l'utilisateur est bien connecté.

### Erreur : "Missing environment variables"
➡️ Le fichier `.env` n'est pas lu. Vérifiez qu'il est bien à la racine et que vous avez relancé `npm run dev`.

---

## 📞 BESOIN D'AIDE ?

- 📚 [Documentation Supabase](https://supabase.com/docs)
- 💬 [Discord Supabase](https://discord.supabase.com)
- 🎓 [Tutoriels vidéo](https://www.youtube.com/@Supabase)

---

**Bon courage ! 🚀**
