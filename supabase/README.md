# 🗄️ Schéma de Base de Données Supabase - Locasun

## 📋 Vue d'ensemble

Ce dossier contient le schéma SQL complet pour migrer l'application Locasun de **localStorage** vers **Supabase**.

## 🚀 Déploiement du Schéma

### Étape 1 : Créer un projet Supabase

1. Allez sur [supabase.com](https://supabase.com)
2. Créez un nouveau projet
3. Notez votre `SUPABASE_URL` et `SUPABASE_ANON_KEY`

### Étape 2 : Exécuter le schéma SQL

#### Option A : Via l'interface Supabase (Recommandé)

1. Dans votre projet Supabase, allez dans **SQL Editor**
2. Créez une nouvelle query
3. Copiez-collez le contenu de `schema.sql`
4. Cliquez sur **Run** (▶️)

#### Option B : Via la CLI Supabase

```bash
# Installer la CLI Supabase
npm install -g supabase

# Se connecter
supabase login

# Lier votre projet
supabase link --project-ref YOUR_PROJECT_REF

# Exécuter le schéma
supabase db push
```

### Étape 3 : Vérifier l'installation

Dans l'interface Supabase, vérifiez que toutes les tables ont été créées :

- ✅ users
- ✅ prospects
- ✅ **project_templates** (modèles de projets configurables)
- ✅ project_steps_status
- ✅ project_infos
- ✅ appointments
- ✅ calls
- ✅ tasks
- ✅ chat_messages
- ✅ notifications
- ✅ client_notifications
- ✅ forms
- ✅ prompts
- ✅ global_pipeline_steps
- ✅ client_form_panels
- ✅ company_settings

## 📊 Architecture de la Base de Données

### Relations Principales

```
users (auth.users)
  ├── prospects (owner_id → users.id)
  │   ├── appointments (contact_id → prospects.id)
  │   ├── calls (contact_id → prospects.id)
  │   ├── tasks (contact_id → prospects.id)
  │   ├── chat_messages (prospect_id → prospects.id)
  │   ├── project_steps_status (prospect_id → prospects.id)
  │   └── project_infos (prospect_id → prospects.id)
  ├── appointments (assigned_user_id → users.id)
  ├── calls (assigned_user_id → users.id)
  └── tasks (assigned_user_id → users.id)

project_templates (modèles configurables)
  ├── project_steps_status (project_type → project_templates.type)
  ├── project_infos (project_type → project_templates.type)
  └── client_form_panels (project_type → project_templates.type)
```

### Types de Données

#### **users**
- Rôles : `Global Admin`, `Manager`, `Commercial`, `Client`
- Lié à Supabase Auth (`auth.users`)
- Hiérarchie : `manager_id` permet de définir les équipes

#### **prospects**
- Statuts : `Intéressé`, `Lead`, `Qualified`, `Opportunity`, `Won`, `Lost`
- Tags : Array de types de projets (`ACC`, `Centrale`, etc.)

#### **project_templates** (modèles de projets)
- **Gestion dynamique** : Les admins peuvent créer/modifier/supprimer des types de projets via l'interface
- Types par défaut : `ACC`, `Autonomie`, `Centrale`, `Investissement`, `ProducteurPro`
- Steps : Structure JSON des étapes du projet (modifiable dynamiquement)
- Visibilité : `is_public` contrôle l'affichage côté client
- 📖 Voir : `PROJECT_TEMPLATES_INTEGRATION.md` pour plus de détails

#### **chat_messages**
- Senders : `client`, `admin`, `pro`
- Support fichiers (stockés dans `file` JSONB)

#### **forms** (formulaires dynamiques)
- **Gestion dynamique** : Les admins créent des formulaires personnalisés
- Types de champs : `text`, `email`, `phone`, `number`, `file`
- Association aux projets via `project_ids`
- 📖 Voir : `DYNAMIC_FORMS_SYSTEM.md` pour le workflow complet

#### **client_form_panels** (formulaires envoyés aux clients)
- **Envoi via chat** : Les admins envoient des formulaires aux clients
- Statuts : `pending`, `approved`, `rejected`
- Les clients remplissent les formulaires dans leur interface
- Les admins valident ou rejettent les soumissions

#### **prompts** (workflows intelligents - Charly AI)
- **Système d'automatisation** : Créer des scénarios par étape de projet
- Actions automatiques : Envoi de formulaires, signatures, demandes de documents
- **Auto-complétion d'étapes** : Si le client remplit un formulaire → passer automatiquement à l'étape suivante
- Configuration flexible par projet et par étape
- 📖 Voir : `PROMPTS_AND_AUTOMATION.md` pour le système complet

#### **access_rights** (droits d'accès granulaires)
- **2 niveaux de contrôle** : Modules accessibles + Filtrage par utilisateur
- **Modules** : Pipeline, Agenda, Contacts (configurable par user)
- **Filtrage** : Un user peut voir ses données + celles d'autres users autorisés
- **Cas d'usage** : Manager voit toute son équipe, Commercial A voit l'agenda du Commercial B
- **RLS policies** : Filtrage automatique via `access_rights.users` dans PostgreSQL
- 📖 Voir : `ACCESS_CONTROL_SYSTEM.md` pour le système complet

## 🔐 Row Level Security (RLS)

Le schéma inclut des **policies RLS** pour sécuriser l'accès aux données :

### Règles par Rôle

| Rôle | Accès |
|------|-------|
| **Global Admin** | Accès total à toutes les données |
| **Manager** | Voit ses prospects + ceux de son équipe |
| **Commercial** | Voit uniquement ses propres prospects |
| **Client** | Voit uniquement ses propres données |

### Exemples de Policies

```sql
-- Commercial voit ses prospects
CREATE POLICY "Users can view their own prospects"
  ON prospects FOR SELECT
  USING (owner_id = auth.uid());

-- Manager voit les prospects de son équipe
CREATE POLICY "Managers can view team prospects"
  ON prospects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = owner_id AND manager_id = auth.uid()
    )
  );
```

## 🔧 Fonctions SQL Utiles

### 1. Récupérer tous les prospects d'un manager

```sql
SELECT * FROM get_manager_team_prospects('manager-uuid-here');
```

### 2. Compter les activités en retard

```sql
SELECT * FROM get_overdue_activities('user-uuid-here');
```

## 📦 Données par Défaut

Le schéma insère automatiquement :

1. **5 types de projets** (ACC, Autonomie, Centrale, Investissement, ProducteurPro)
2. **3 colonnes de pipeline** (MARKET, ETUDE, OFFRE)
3. **Paramètres de société** (Locasun) avec :
   - Configuration du formulaire de contact dynamique (5 champs par défaut)
   - Logo et autres paramètres globaux

## 🔄 Real-time

Pour activer les **mises à jour en temps réel** :

### Dans l'interface Supabase :

1. Allez dans **Database** → **Replication**
2. Activez la réplication pour les tables suivantes :
   - `chat_messages` (pour les messages instantanés)
   - `notifications` (pour les alertes)
   - `appointments` (pour les RDV)
   - `prospects` (pour le pipeline)

## 🛡️ Sécurité

### Variables d'environnement requises

Créez un fichier `.env` à la racine du projet :

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

⚠️ **Important** : Ne committez JAMAIS votre `.env` dans Git !

Ajoutez dans `.gitignore` :
```
.env
.env.local
```

## 📈 Indexes et Performances

Le schéma inclut des **indexes optimisés** pour :

- Recherches par email, téléphone, tags
- Filtres par statut, rôle, date
- Jointures fréquentes (foreign keys)

### Indexes créés

```sql
-- Exemples d'indexes
CREATE INDEX idx_prospects_owner_id ON prospects(owner_id);
CREATE INDEX idx_prospects_tags ON prospects USING GIN(tags);
CREATE INDEX idx_appointments_start_time ON appointments(start_time);
```

## 🧪 Tests

Après déploiement, testez les queries de base :

```sql
-- Lister tous les prospects
SELECT * FROM prospects;

-- Lister les projets
SELECT * FROM projects;

-- Vérifier les RLS policies
SELECT * FROM prospects; -- Devrait filtrer selon l'utilisateur connecté
```

## ⚠️ Fonctionnalités en Attente (V2)

### Gestion Multi-Entreprises

**Statut** : ⏸️ **Mis en attente**

Le bloc **"Gestion des Entreprises"** dans ProfilePage permet de créer plusieurs entreprises (multi-tenant/SaaS). Cette fonctionnalité n'est **pas incluse dans le schéma V1** car :

- ✅ Le système actuel fonctionne en **mono-entreprise** via `company_settings`
- ✅ Aucune dépendance bloquante pour les autres fonctionnalités
- ✅ Ajout facile en V2 si besoin (création table `companies` + `company_id` partout)

**Si vous voulez activer cette fonctionnalité** :
1. Créer table `companies` (id, name, logo_url, address, zip, city)
2. Ajouter colonne `company_id` sur : `users`, `prospects`, `project_templates`, `forms`, etc.
3. Mettre à jour toutes les RLS policies pour filtrer par `company_id`
4. Migrer `company_settings` → première ligne de `companies`

**Données du bloc** :
- Nom de l'entreprise
- Logo
- Adresse, Code Postal, Ville
- Gestion des utilisateurs par entreprise

📝 **Décision** : On garde le bloc UI dans le code (désactivé ou caché) pour activation future rapide.

## 🆘 Dépannage

### Erreur : "permission denied for table X"

➡️ Vérifiez que les **RLS policies** sont bien activées et que l'utilisateur a les bonnes permissions.

### Erreur : "relation X does not exist"

➡️ Le schéma n'a pas été exécuté correctement. Relancez `schema.sql`.

### Erreur : "foreign key violation"

➡️ Vérifiez l'ordre d'insertion des données. Les tables parentes doivent être remplies avant les tables enfants.

## 📚 Documentation Complémentaire

### 📖 Guides Spécifiques

- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Guide pas à pas pour déployer le schéma sur Supabase
- **[AUTH_LOGIC.md](./AUTH_LOGIC.md)** - Architecture d'authentification (Admin vs Client)
- **[DIAGRAM.md](./DIAGRAM.md)** - Schéma ASCII des relations entre tables
- **[PROJECT_TEMPLATES_INTEGRATION.md](./PROJECT_TEMPLATES_INTEGRATION.md)** - Gestion dynamique des projets
- **[DYNAMIC_FORMS_SYSTEM.md](./DYNAMIC_FORMS_SYSTEM.md)** - Système de formulaires dynamiques avec chat
- **[PROMPTS_AND_AUTOMATION.md](./PROMPTS_AND_AUTOMATION.md)** - Automatisation et auto-complétion d'étapes
- **[ACCESS_CONTROL_SYSTEM.md](./ACCESS_CONTROL_SYSTEM.md)** - Droits d'accès et filtrage par utilisateur
- **[CONTACT_FORM_CONFIG.md](./CONTACT_FORM_CONFIG.md)** - Configuration du formulaire de contact dynamique
- **[APPOINTMENT_RESCHEDULING.md](./APPOINTMENT_RESCHEDULING.md)** - Système de report de RDV (drag & drop) ⭐ NOUVEAU

## 📚 Ressources Externes

- [Documentation Supabase](https://supabase.com/docs)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Real-time](https://supabase.com/docs/guides/realtime)

## 🎯 Prochaines Étapes

Après avoir déployé le schéma :

1. ✅ Configurer le client Supabase dans l'app
2. ✅ Créer les services API (prospectService.js, etc.)
3. ✅ Implémenter l'authentification
4. ✅ Migrer les données localStorage → Supabase
5. ✅ Activer le real-time

---

**Besoin d'aide ?** Consultez la documentation ou demandez à l'équipe de développement ! 🚀
