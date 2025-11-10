# 🎯 LISTE COMPLÈTE DES SYSTÈMES DYNAMIQUES

**Application :** Locasun - Gestion CRM Solaire  
**Page de configuration :** `/admin/profil` (ProfilePage.jsx)  
**Date :** 10 novembre 2025

---

## 📋 VUE D'ENSEMBLE

**Total : 10 systèmes dynamiques configurables**

Ces systèmes permettent aux admins de **configurer l'application sans toucher au code**, directement depuis l'interface `/admin/profil`.

---

## 🔧 SYSTÈMES DYNAMIQUES DÉTAILLÉS

### 1️⃣ **Logo Entreprise** 🏢

**Section :** Logo Entreprise  
**Accès :** Global Admin uniquement  
**Table Supabase :** `company_settings`

**Fonctionnalités :**
- ✅ Upload du logo de l'entreprise
- ✅ Affichage dans le header admin
- ✅ Affichage dans l'espace client (`/dashboard`)
- ✅ Stockage via Supabase Storage (recommandé)

**Champs :**
```json
{
  "logo_url": "https://storage.supabase.co/...",
  "company_name": "Locasun"
}
```

**Workflow :**
1. Admin upload le logo → Supabase Storage
2. URL stockée dans `company_settings.logo_url`
3. Logo affiché dans `Header.jsx` et `ClientHeader.jsx`

---

### 2️⃣ **Gestion des Entreprises** 🏢

**Section :** Gestion des Entreprises  
**Accès :** Global Admin uniquement  
**Table Supabase :** `company_settings`

**Fonctionnalités :**
- ✅ Modifier le nom de l'entreprise
- ✅ Configurer les informations générales
- ⚠️ **Note :** Actuellement, ce système affiche juste "Gestion utilisateurs entreprise" (feature non développée)

**Utilité future :**
- Multi-entreprises (SaaS mode)
- Paramètres spécifiques par entreprise
- Gestion des licences/abonnements

---

### 3️⃣ **Formulaire de Contact Dynamique** 📝

**Section :** Gestion du Formulaire Contact  
**Accès :** Global Admin + Manager  
**Table Supabase :** `company_settings.settings->contact_form_config`

**Fonctionnalités :**
- ✅ Créer/modifier les champs du formulaire de contact
- ✅ Définir les champs obligatoires
- ✅ Changer l'ordre des champs
- ✅ Types de champs supportés : text, email, phone, textarea
- ✅ Utilisé sur la landing page `/` (ProducerLandingPage)

**Structure JSONB :**
```json
{
  "contact_form_config": [
    {
      "id": "name",
      "name": "Nom*",
      "type": "text",
      "placeholder": "Jean Dupont",
      "required": true
    },
    {
      "id": "companyName",
      "name": "Société",
      "type": "text",
      "placeholder": "Nom de la société (optionnel)",
      "required": false
    },
    {
      "id": "email",
      "name": "Email*",
      "type": "email",
      "placeholder": "jean.dupont@email.com",
      "required": true
    },
    {
      "id": "phone",
      "name": "Téléphone",
      "type": "text",
      "placeholder": "06 12 34 56 78",
      "required": false
    },
    {
      "id": "address",
      "name": "Adresse",
      "type": "text",
      "placeholder": "1 Rue de la Paix, 75002 Paris",
      "required": false
    }
  ]
}
```

**Workflow :**
1. Admin configure les champs dans ProfilePage
2. Sauvegarde dans `company_settings.settings`
3. ProducerLandingPage lit la config dynamiquement
4. Formulaire généré automatiquement

**Fichier de config actuel :** `src/config/formContactConfig.js` (à migrer)

---

### 4️⃣ **Pipeline Global (Colonnes Kanban)** 📊

**Section :** Gestion des Pipelines Globales  
**Accès :** Global Admin + Manager  
**Table Supabase :** `global_pipeline_steps`

**Fonctionnalités :**
- ✅ Créer/modifier/supprimer les colonnes du pipeline
- ✅ Définir l'ordre des colonnes (position)
- ✅ Choisir la couleur de chaque colonne
- ✅ Renommer les étapes (ex: "MARKET", "ETUDE", "OFFRE", "SIGNATURE", etc.)
- ✅ Utilisé dans FinalPipeline.jsx (vue Kanban)

**Structure table :**
```sql
CREATE TABLE global_pipeline_steps (
  id UUID PRIMARY KEY,
  step_id TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,           -- "MARKET", "ETUDE", "OFFRE"
  color TEXT NOT NULL,            -- "bg-blue-100", "bg-yellow-100"
  position INTEGER NOT NULL,      -- 0, 1, 2, 3...
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Données par défaut :**
```sql
INSERT INTO global_pipeline_steps (step_id, label, color, position)
VALUES
  ('default-global-pipeline-step-0', 'MARKET', 'bg-blue-100', 0),
  ('default-global-pipeline-step-1', 'ETUDE', 'bg-yellow-100', 1),
  ('default-global-pipeline-step-2', 'OFFRE', 'bg-green-100', 2);
```

**Workflow :**
1. Admin ajoute/modifie une colonne dans ProfilePage
2. Sauvegarde dans `global_pipeline_steps`
3. FinalPipeline.jsx recharge les colonnes en temps réel
4. Prospects peuvent être déplacés entre colonnes (drag & drop)

---

### 5️⃣ **Gestion des Projets (Templates)** 🌞

**Section :** Gestion des Projets  
**Accès :** Global Admin + Manager  
**Table Supabase :** `project_templates`

**Fonctionnalités :**
- ✅ Créer/modifier/supprimer des types de projets
- ✅ Définir le titre admin vs titre client
- ✅ Choisir l'icône (emoji) et la couleur
- ✅ Uploader une image du projet
- ✅ Rédiger la description client
- ✅ Personnaliser le texte du bouton CTA
- ✅ Configurer les étapes du projet
- ✅ Lier chaque étape à une colonne du pipeline global
- ✅ Masquer/afficher le projet côté client (is_public)

**Structure table :**
```sql
CREATE TABLE project_templates (
  id UUID PRIMARY KEY,
  type TEXT UNIQUE NOT NULL,        -- "ACC", "Centrale", "Autonomie"
  title TEXT NOT NULL,               -- "Autoconsommation Collective"
  client_title TEXT NOT NULL,        -- "Mon Projet ACC"
  icon TEXT DEFAULT '📁',
  color TEXT DEFAULT 'gradient-blue',
  image_url TEXT,
  client_description TEXT,
  cta_text TEXT DEFAULT 'Ajouter ce projet',
  is_public BOOLEAN DEFAULT TRUE,
  steps JSONB NOT NULL,              -- Étapes du projet
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Structure JSONB `steps` :**
```json
[
  {
    "id": "step-acc-1",
    "name": "Inscription",
    "status": "pending",
    "icon": "✅",
    "descriptions": {
      "pending": "En attente d'inscription",
      "done": "Inscription complétée",
      "blocked": "Inscription bloquée"
    },
    "globalStepId": "uuid-of-global-pipeline-step"  // ← Lien vers pipeline
  },
  {
    "id": "step-acc-2",
    "name": "Connexion à la centrale",
    "status": "pending",
    "icon": "⚡",
    "descriptions": {
      "pending": "En cours de connexion",
      "done": "Connecté à la centrale"
    },
    "globalStepId": "uuid-of-another-global-step"
  }
]
```

**Projets par défaut :**
- ACC (Autoconsommation Collective)
- Autonomie
- Centrale (3-500 kWc)
- Investissement
- ProducteurPro (masqué par défaut)

**Workflow :**
1. Admin crée un nouveau projet dans ProfilePage
2. Configure les étapes et lie au pipeline global
3. Projet visible dans le dashboard client si `is_public = true`
4. Client peut ajouter ce projet depuis `/dashboard`

**Fichier actuel :** `src/data/projects.js` (à remplacer par Supabase)

---

### 6️⃣ **Gestion des Formulaires** 📋

**Section :** Gestion des Formulaires  
**Accès :** Global Admin + Manager  
**Table Supabase :** `forms`

**Fonctionnalités :**
- ✅ Créer des formulaires personnalisés
- ✅ Définir les champs (text, email, phone, number, file)
- ✅ Associer les formulaires à des projets spécifiques
- ✅ Envoyer les formulaires aux clients via le chat
- ✅ Les clients remplissent les formulaires dans leur interface
- ✅ Admin reçoit les soumissions et peut approuver/rejeter

**Structure table :**
```sql
CREATE TABLE forms (
  id UUID PRIMARY KEY,
  form_id TEXT UNIQUE NOT NULL,      -- "form-rib", "form-identite"
  name TEXT NOT NULL,                 -- "Formulaire RIB"
  fields JSONB NOT NULL,              -- Champs du formulaire
  project_ids TEXT[] DEFAULT '{}',   -- ["ACC", "Centrale"]
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Structure JSONB `fields` :**
```json
[
  {
    "id": "field-123",
    "label": "Numéro de compte bancaire",
    "type": "text",
    "placeholder": "FR76 XXXX XXXX XXXX",
    "required": true
  },
  {
    "id": "field-456",
    "label": "Document RIB",
    "type": "file",
    "placeholder": "",
    "required": true
  },
  {
    "id": "field-789",
    "label": "Titulaire du compte",
    "type": "text",
    "placeholder": "Jean Dupont",
    "required": true
  }
]
```

**Types de champs supportés :**
- `text` : Texte simple
- `email` : Email
- `phone` : Téléphone
- `number` : Nombre
- `file` : Upload de fichier

**Workflow :**
1. Admin crée un formulaire dans ProfilePage
2. Admin envoie le formulaire via le chat client
3. Formulaire stocké dans `client_form_panels`
4. Client voit le formulaire dans son interface (`ClientFormPanel.jsx`)
5. Client remplit et soumet
6. Données stockées dans `prospects.formData` (JSONB)
7. Admin voit la soumission et peut valider/rejeter

---

### 7️⃣ **Gestion de l'Affichage des Projets** 👁️

**Section :** Gestion de l'Affichage des Projets  
**Accès :** Global Admin + Manager  
**Table Supabase :** `project_templates`

**Fonctionnalités :**
- ✅ Choisir quels projets afficher côté client
- ✅ Réorganiser l'ordre d'affichage
- ✅ Activer/désactiver la visibilité (`is_public`)
- ✅ Personnaliser l'apparence des cards projets

**Workflow :**
1. Admin toggle `is_public` pour un projet dans ProfilePage
2. Projet apparaît/disparaît dans `/dashboard` client
3. Ordre modifiable via drag & drop (position)

**Utilité :**
- Masquer des projets en phase de test
- Lancer de nouveaux projets progressivement
- A/B testing de l'offre

---

### 8️⃣ **Création de Prompt (Workflow IA)** 🤖

**Section :** Création de Prompt  
**Accès :** Global Admin + Manager  
**Table Supabase :** `prompts`

**Fonctionnalités :**
- ✅ Créer des scénarios de workflow automatisés
- ✅ Définir des actions par étape de projet
- ✅ Envoyer des messages automatiques
- ✅ Afficher des formulaires automatiquement
- ✅ Déclencher des signatures/paiements
- ✅ **Auto-complétion d'étapes** : passer automatiquement à l'étape suivante quand un formulaire est rempli

**Structure table :**
```sql
CREATE TABLE prompts (
  id UUID PRIMARY KEY,
  prompt_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,                  -- "Relance après RDV"
  tone TEXT,                           -- "professionnel", "détendu", "humain"
  project_id TEXT REFERENCES project_templates(type),
  steps_config JSONB NOT NULL,         -- Actions par étape
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Structure JSONB `steps_config` :**
```json
{
  "0": {  // Étape 0 du projet
    "actions": [
      {
        "id": "action-123",
        "message": "Bonjour, merci de compléter le formulaire RIB",
        "type": "show_form",
        "formId": "form-456"
      },
      {
        "id": "action-124",
        "message": "Veuillez signer le contrat",
        "type": "start_signature",
        "documentUrl": "https://..."
      }
    ],
    "autoCompleteStep": true  // ← Passer auto à l'étape suivante
  },
  "1": {
    "actions": [
      {
        "id": "action-125",
        "message": "Merci d'envoyer votre pièce d'identité",
        "type": "request_document",
        "documentType": "id_card"
      }
    ],
    "autoCompleteStep": false
  }
}
```

**Types d'actions supportées :**
- `none` : Aucune action
- `show_form` : Afficher un formulaire (nécessite `formId`)
- `start_signature` : Lancer une signature électronique
- `request_document` : Demander un document
- `open_payment` : Ouvrir un lien de paiement

**Workflow :**
1. Admin crée un prompt pour un projet dans ProfilePage
2. Configure les actions pour chaque étape
3. Active `autoCompleteStep` si désiré
4. Charly AI utilise ce prompt pour guider le client
5. Quand client soumet un formulaire → étape validée automatiquement
6. Système Real-time détecte la soumission
7. Étape passée à "done" automatiquement
8. Charly envoie le message de l'étape suivante

**Cas d'usage :**
- Workflow ACC : Inscription → Formulaire RIB → Signature → Documents → Actif
- Relance automatique si client bloqué
- Onboarding personnalisé par projet

---

### 9️⃣ **Gestion des Utilisateurs PRO** 👥

**Section :** Gestion des utilisateurs  
**Accès :** Global Admin uniquement  
**Table Supabase :** `users`

**Fonctionnalités :**
- ✅ Créer/modifier/supprimer des utilisateurs PRO
- ✅ Assigner les rôles : Global Admin, Manager, Commercial
- ✅ Définir le manager d'un utilisateur
- ✅ Configurer les droits d'accès (modules + utilisateurs)
- ✅ Gérer les équipes (hierarchie manager → commerciaux)

**Structure table :**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT CHECK (role IN ('Global Admin', 'Manager', 'Commercial')),
  manager_id UUID REFERENCES users(id),
  access_rights JSONB,              -- Droits d'accès granulaires
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Structure JSONB `access_rights` :**
```json
{
  "modules": ["Pipeline", "Agenda", "Contacts"],  // Modules autorisés
  "users": ["user-uuid-1", "user-uuid-2"]         // Utilisateurs visibles
}
```

**Workflow :**
1. Global Admin crée un nouvel utilisateur dans ProfilePage
2. Assigne le rôle et le manager
3. Configure les modules accessibles
4. Définit les utilisateurs dont il peut voir les données
5. Utilisateur reçoit un email d'invitation (Supabase Auth)
6. Connexion avec email/password

**Cas d'usage :**
- Manager voit les données de ses 5 commerciaux
- Commercial A peut voir l'agenda du Commercial B (partage)
- Commercial C n'a pas accès au module Contacts

---

### 🔟 **Gestion des Clients** 👤

**Section :** Gestion des clients  
**Accès :** Global Admin + Manager + Commercial  
**Table Supabase :** `prospects`

**Fonctionnalités :**
- ✅ Créer des comptes clients
- ✅ Inviter un prospect à créer son espace client
- ✅ Réinitialiser le mot de passe client
- ✅ Activer/désactiver l'accès client
- ✅ Voir les clients inscrits vs prospects non inscrits

**Distinction :**
- `prospects.user_id IS NULL` → Prospect non inscrit (pas de compte)
- `prospects.user_id IS NOT NULL` → Client inscrit (peut se connecter)

**Workflow inscription client :**
1. Commercial crée un prospect dans le CRM
2. Envoie une invitation depuis la fiche contact
3. Email d'invitation envoyé (Supabase Auth)
4. Client crée son mot de passe
5. `prospects.user_id` rempli avec l'UUID auth
6. Client accède à `/dashboard`

**Workflow réinitialisation :**
1. Client demande "mot de passe oublié"
2. Email de reset envoyé (Supabase Auth)
3. Client crée un nouveau mot de passe

---

## 📊 RÉCAPITULATIF PAR TABLE SUPABASE

| Système dynamique | Table Supabase | Champs JSONB clés | RLS Policies |
|-------------------|----------------|-------------------|--------------|
| **1. Logo Entreprise** | `company_settings` | `logo_url` | Global Admin |
| **2. Gestion Entreprises** | `company_settings` | `settings` | Global Admin |
| **3. Formulaire Contact** | `company_settings` | `settings->contact_form_config` | Global Admin |
| **4. Pipeline Global** | `global_pipeline_steps` | - | Global Admin |
| **5. Projets (Templates)** | `project_templates` | `steps` | Admin + Manager |
| **6. Formulaires** | `forms` | `fields` | Admin + Manager |
| **7. Affichage Projets** | `project_templates` | `is_public` | Admin + Manager |
| **8. Prompts (IA)** | `prompts` | `steps_config` | Admin + Manager |
| **9. Utilisateurs PRO** | `users` | `access_rights` | Global Admin |
| **10. Clients** | `prospects` | `user_id` (lien auth) | All users |
| **11. Affiliation Commerciale** | `users` | `affiliate_slug`, `affiliate_link` | All PRO users |

---

## 🎯 WORKFLOW GÉNÉRAL

```
ProfilePage (Admin UI)
     ↓
Modification des systèmes dynamiques
     ↓
Sauvegarde dans Supabase
     ↓
Real-time sync (tous les utilisateurs)
     ↓
Interface mise à jour automatiquement
```

---

## ✅ SYSTÈMES DÉJÀ DANS LE SCHÉMA

| Système | Table créée | Policies RLS | Trigger | Documentation |
|---------|-------------|--------------|---------|---------------|
| Logo Entreprise | ✅ | ✅ | ✅ | ✅ |
| Formulaire Contact | ✅ | ✅ | ✅ | ✅ |
| Pipeline Global | ✅ | ✅ | ✅ | ✅ |
| Projets (Templates) | ✅ | ✅ | ✅ | ✅ |
| Formulaires | ✅ | ✅ | ✅ | ✅ |
| Affichage Projets | ✅ | ✅ | ✅ | ✅ |
| Prompts (IA) | ✅ | ✅ | ✅ | ✅ |
| Utilisateurs PRO | ✅ | ✅ | ✅ | ✅ |
| Clients | ✅ | ✅ | ✅ | ✅ |
| Gestion Entreprises | ✅ | ✅ | ✅ | ⚠️ Partiel |
| Affiliation Commerciale | ✅ | N/A | ✅ | ✅ |

---

## 📝 NOTES IMPORTANTES

### Systèmes avec JSONB flexible

Ces systèmes utilisent JSONB pour permettre l'évolution sans migration SQL :

1. **`project_templates.steps`** : Étapes configurables
2. **`forms.fields`** : Champs de formulaires
3. **`prompts.steps_config`** : Actions par étape
4. **`company_settings.settings`** : Config globale
5. **`users.access_rights`** : Droits d'accès
6. **`project_infos.data`** : Infos projet flexibles
7. **`chat_messages.file`** : Métadonnées fichier

### Systèmes avec Real-time

Tous ces systèmes bénéficient de **Supabase Realtime** :
- Modification d'un projet → tous les admins voient le changement instantanément
- Nouveau formulaire créé → disponible immédiatement dans le chat
- Pipeline modifié → FinalPipeline se recharge automatiquement

### Migration depuis localStorage

**Fichiers à remplacer :**
- `src/data/projects.js` → `project_templates` table
- `src/config/formContactConfig.js` → `company_settings.settings`
- Variables d'état React → Queries Supabase

---

### 1️⃣1️⃣ **Système d'Affiliation Commerciale (Attribution simple)** 🔗

**Section :** ProfilePage (Espace PRO)  
**Accès :** Tous les Users PRO (Commercial, Manager, Global Admin)  
**Tables Supabase :** `users` (affiliate_slug, affiliate_link)

**Fonctionnalités :**
- ✅ Chaque User PRO possède un lien unique : `https://evatime.fr/inscription/{slug-user}`
- ✅ Génération automatique du slug à partir du nom
- ✅ Prospect qui s'inscrit via ce lien → `owner_id` assigné automatiquement
- ✅ Attribution simple : prospect appartient au commercial (pas de récompenses)

**Structure table users :**
```sql
ALTER TABLE users ADD COLUMN affiliate_slug TEXT UNIQUE;
ALTER TABLE users ADD COLUMN affiliate_link TEXT;
```

**Workflow :**
1. User PRO (Jack Luc) obtient son lien : `https://evatime.fr/inscription/jack-luc`
2. Prospect (Marie) clique sur le lien et s'inscrit
3. RegistrationPage capture le slug `jack-luc`
4. Prospect créé avec `owner_id = Jack Luc`
5. **C'EST TOUT** - Pas de tracking, pas de récompenses, juste attribution

**Trigger automatique :**
```sql
-- Génère affiliate_slug et affiliate_link à chaque INSERT/UPDATE de user
CREATE TRIGGER auto_generate_affiliate_slug
  BEFORE INSERT OR UPDATE OF name ON users
  EXECUTE FUNCTION generate_affiliate_slug();
```

**Exemple :**
- Commercial "Jean Dupont" → slug = `jean-dupont`
- Lien généré : `https://evatime.fr/inscription/jean-dupont`
- Prospect s'inscrit → `owner_id` = UUID de Jean
- Visible dans CompleteOriginalContacts et FinalPipeline

---

### 🎁 **Programme de Parrainage Client (FUTUR - Pas encore configuré)**

**Section :** `/dashboard/parrainage` (ParrainagePage.jsx)  
**Accès :** Clients inscrits uniquement  
**Fonctionnalités prévues :**
- 🔲 Client partage son lien unique
- 🔲 Filleul s'inscrit et confirme son projet
- 🔲 100€ pour le parrain + 100€ pour le filleul
- 🔲 Dashboard de suivi (statistiques, gains)

**État actuel :**
- ✅ Page `/dashboard/parrainage` créée (UI existe)
- ❌ Backend non configuré
- ❌ Table de tracking non créée
- ❌ Système de récompenses non implémenté

**NOTE IMPORTANTE :**
Ce système est **DISTINCT** de l'affiliation commerciale. Les commerciaux attribuent les prospects, les clients parrainent d'autres clients pour gagner de l'argent.

---

**Total : 11 systèmes dynamiques** entièrement configurables sans toucher au code ! 🎉

