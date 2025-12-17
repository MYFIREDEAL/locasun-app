# 📊 FONCTIONNEMENT ACTUEL DU LOGICIEL LOCASUN

**Date** : 17 décembre 2025  
**Version** : 1.0 (Supabase Migration)  
**Statut** : Production

---

## 🎯 VUE D'ENSEMBLE

Locasun est une plateforme CRM pour la gestion de projets énergétiques (solaire, ACC, autonomie). Elle intègre un système dual-user (Admins/Clients) avec automatisation via Charly AI.

---

## 👥 SYSTÈME DUAL-USER

### **1. UTILISATEURS ADMIN (Espace Pro)**
**Accès** : `/admin/*`  
**Stockage** : `auth.users` + `public.users`

#### **Rôles hiérarchiques**
- **Global Admin** : Accès total, gestion entreprise
- **Manager** : Gestion équipe, accès prospects de son équipe
- **Commercial** : Accès uniquement à ses prospects

#### **Fonctionnalités disponibles**
✅ **Pipeline** (`/admin/pipeline`)
- Vue Kanban par statut (Nouveau, Contacté, Qualifié, etc.)
- Drag & drop pour changer statut
- Filtres par commercial, projet, tags
- Création/édition prospects
- Real-time sync (Supabase)

✅ **Agenda** (`/admin/agenda`)
- Calendrier RDV, appels, tâches
- Vue jour/semaine/mois
- Drag & drop reprogrammation
- Notifications automatiques
- Real-time sync

✅ **Contacts** (`/admin/contacts`)
- Liste tous les prospects
- Recherche, filtres, tri
- Export CSV
- Actions groupées

✅ **Fiche Prospect** (ProspectDetailsAdmin)
- Timeline complète du prospect
- Chat en temps réel avec le client
- **Envoi manuel de prompts Charly AI**
- Gestion des étapes projet
- Formulaires clients (validation/rejet)
- Tâches associées
- Fichiers projet
- Historique complet

✅ **Profil** (`/admin/profil`)
- Informations personnelles
- **Création de prompts Charly AI** ⭐
- Gestion formulaires dynamiques
- Gestion projets (types, étapes)
- Gestion utilisateurs (si admin)
- Logo entreprise

---

### **2. UTILISATEURS CLIENT (Espace Client)**
**Accès** : `/dashboard/*`  
**Stockage** : `auth.users` + `public.prospects` (avec `user_id` non-null)

#### **Fonctionnalités disponibles**
✅ **Dashboard** (`/dashboard`)
- Vue d'ensemble de TOUS les projets
- Progression de chaque projet (étapes)
- Formulaires à compléter
- Chat avec le commercial
- Notifications en temps réel

✅ **Projet spécifique** (`/dashboard/project/:projectType`)
- Timeline des étapes avec progression visuelle
- Étape actuelle en détail
- Formulaires associés à remplir
- Chat contextualisé au projet
- Fichiers du projet
- Historique complet

✅ **Parrainage** (`/dashboard/parrainage`)
- Lien de parrainage unique
- Statistique des parrainages
- Commissions gagnées

✅ **Profil** (`/dashboard/profil`)
- Informations personnelles
- Modification mot de passe
- Préférences

---

## 🔄 WORKFLOW COMPLET (ÉTAT ACTUEL)

### **ÉTAPE 1 : Création prospect (Admin)**
1. Admin crée un prospect dans le pipeline
2. Assigne un projet (ACC, Centrale, Autonomie, etc.)
3. Projet créé dans `project_steps_status` avec étapes
4. Première étape passe automatiquement à "in_progress"

---

### **ÉTAPE 2 : Configuration prompt Charly AI (Admin)**
**Interface** : `/admin/profil` > Onglet "Création de Prompt"

Admin configure pour chaque projet :
```javascript
{
  name: "Workflow ACC complet",
  tone: "humain", // professionnel, détendu, humain
  projectId: "ACC",
  stepsConfig: {
    "0": { // Étape 1
      actions: [
        {
          message: "Merci de compléter le formulaire RIB",
          type: "show_form",
          formId: "form-rib-acc",
          hasClientAction: true,
          managementMode: "manual", // manual ou automatic
          verificationMode: "human" // none, human, ai
        }
      ],
      autoCompleteStep: true // Passe automatiquement à l'étape suivante
    },
    "1": { // Étape 2
      actions: [
        {
          message: "Voici le contrat à signer",
          type: "start_signature",
          documentUrl: "https://...",
          managementMode: "manual",
          verificationMode: "none"
        }
      ],
      autoCompleteStep: false
    }
  }
}
```

**Champs configurables** :
- ✅ `name` : Nom du prompt
- ✅ `tone` : Ton des messages (professionnel/détendu/humain)
- ✅ `projectId` : Projet associé (ACC, Centrale, etc.)
- ✅ `stepsConfig` : Configuration par étape
  - ✅ `message` : Message à envoyer
  - ✅ `type` : Type d'action (show_form, start_signature, request_document, open_payment, none)
  - ✅ `formId` : ID du formulaire (si type=show_form)
  - ✅ `hasClientAction` : true = action client, false = checklist commercial
  - ✅ `managementMode` : "manual" = commercial gère, "automatic" = IA envoie auto
  - ✅ `verificationMode` : "none" = auto, "human" = commercial valide, "ai" = IA valide
  - ✅ `autoCompleteStep` : Passe automatiquement à l'étape suivante

**Stockage** : Table `prompts` dans Supabase

---

### **ÉTAPE 3 : Envoi prompt MANUEL (Admin)**
**État actuel** : ❌ Pas d'envoi automatique

**Fonctionnement actuel** :
1. Admin ouvre fiche prospect
2. Sélectionne manuellement un prompt dans la liste
3. Clique "Envoyer"
4. Système envoie les messages/formulaires de l'étape actuelle

**Code** : `ProspectDetailsAdmin.jsx` ligne 268 (`handleSelectPrompt`)

---

### **ÉTAPE 4 : Client reçoit formulaire**
1. Formulaire créé dans `client_form_panels`
2. Client voit le formulaire dans son dashboard
3. **Real-time** : Apparaît instantanément sans refresh
4. Client remplit et soumet
5. Status passe à "submitted"

**Composant** : `ClientFormPanel.jsx`

---

### **ÉTAPE 5 : Commercial reçoit notification**
**Si `verificationMode: "human"`** :

1. **Tâche automatique créée** (`useAutoVerificationTasks`)
   - Titre : "Vérifier le formulaire de [Client]"
   - Assignée au commercial propriétaire
   - Visible dans Agenda

2. **Commercial valide/rejette**
   - Ouvre fiche prospect
   - Section "Formulaires soumis"
   - Boutons "Valider" / "Rejeter"

3. **Si validé** :
   - Status formulaire → "approved"
   - Message envoyé au client
   - Si `autoCompleteStep: true` → Étape suivante

**Composant** : `ProspectDetailsAdmin.jsx` ligne 772+ (`ProspectForms`)

---

### **ÉTAPE 6 : Auto-complétion étape**
**Si `verificationMode: "none"` ET `autoCompleteStep: true`** :

1. Client soumet formulaire
2. Validation automatique immédiate
3. Étape actuelle → "completed"
4. Étape suivante → "in_progress"
5. ⚠️ **MAIS** : Actions de l'étape suivante PAS envoyées automatiquement

**Code** : `ProspectDetailsAdmin.jsx` ligne 883 (logique auto-complete)

---

### **ÉTAPE 7 : Actions checklist commercial**
**Si action avec `hasClientAction: false`** :

1. Tâche créée automatiquement (`useAutoCreateTasks`)
2. Checklist affichée dans timeline du prospect
3. Commercial coche les items
4. Quand tout coché + `autoCompleteStep: true` → Étape suivante

**Exemple** :
```javascript
{
  message: "Vérifier installation",
  type: "none",
  hasClientAction: false,
  checklist: [
    { id: "1", text: "Panneaux installés" },
    { id: "2", text: "Raccordement OK" },
    { id: "3", text: "Mise en service" }
  ],
  managementMode: "manual"
}
```

**Composant** : `ProspectDetailsAdmin.jsx` ligne 540+ (handleCheckboxToggle)

---

## 📋 SYSTÈME DE FORMULAIRES DYNAMIQUES

### **Création formulaire (Admin)**
**Interface** : `/admin/profil` > Onglet "Gestion des formulaires"

Admin crée des formulaires réutilisables :
```javascript
{
  formId: "form-rib-acc",
  name: "Formulaire RIB",
  description: "Coordonnées bancaires",
  fields: [
    {
      id: "iban",
      label: "IBAN",
      type: "text",
      required: true,
      placeholder: "FR76..."
    },
    {
      id: "bic",
      label: "BIC",
      type: "text",
      required: true
    },
    {
      id: "titulaire",
      label: "Titulaire du compte",
      type: "text",
      required: true
    }
  ]
}
```

**Types de champs supportés** :
- `text` : Champ texte simple
- `email` : Email validé
- `tel` : Téléphone
- `number` : Nombre
- `date` : Date
- `textarea` : Texte long
- `select` : Liste déroulante
- `radio` : Boutons radio
- `checkbox` : Cases à cocher
- `file` : Upload fichier

**Stockage** : Table `forms` dans Supabase

---

### **Envoi formulaire au client**
**Méthode actuelle** : Manuelle via prompt

1. Admin sélectionne prompt avec action `show_form`
2. Système crée entrée dans `client_form_panels`
3. Client voit formulaire instantanément (real-time)

**Table `client_form_panels`** :
```sql
{
  panel_id: "panel-123",
  prospect_id: "uuid-client",
  project_type: "ACC",
  form_id: "form-rib-acc",
  prompt_id: "prompt-456",
  current_step_index: 0,
  status: "pending", // pending, submitted, approved, rejected
  message_timestamp: 1699876543210
}
```

---

### **Soumission formulaire (Client)**
1. Client remplit les champs
2. Valide le formulaire
3. Données stockées dans `prospects.form_data` (JSONB)
4. Status → "submitted"
5. Message automatique dans le chat
6. Événement dans `project_history`

**Structure `form_data`** :
```json
{
  "ACC": {
    "form-rib-acc": {
      "iban": "FR76...",
      "bic": "BNPAFRPP",
      "titulaire": "Sophie Martin",
      "submitted_at": "2025-12-17T10:30:00Z"
    }
  }
}
```

---

### **Validation formulaire (Admin)**
**Interface** : Fiche prospect > Section "Formulaires soumis"

Admin voit :
- ✅ Tous les formulaires soumis
- ✅ Réponses du client
- ✅ Boutons "Valider" / "Rejeter"

**Actions** :
1. **Valider** :
   - Status → "approved"
   - Message auto au client : "Formulaire validé ✅"
   - Si `autoCompleteStep: true` → Étape suivante
   - Tâche de vérification → "completed"

2. **Rejeter** :
   - Status → "rejected"
   - Message personnalisé au client (raison)
   - Formulaire reste modifiable par le client
   - Tâche de vérification → "completed"

---

## 💬 SYSTÈME DE CHAT EN TEMPS RÉEL

### **Chat Admin-Client**
**Tables** : `chat_messages` + `chat_participants`

**Fonctionnalités** :
✅ Messages instantanés (Supabase Realtime)
✅ Historique complet par projet
✅ Indicateur "typing..."
✅ Messages système (formulaire soumis, étape terminée, etc.)
✅ Pièces jointes
✅ Notifications non lues

**Participants** :
- `prospect_id` : Le client
- `sender` : 'admin' ou 'client'
- `project_type` : Contexte du projet

---

## 📊 SYSTÈME DE PROJETS ET ÉTAPES

### **Templates de projets**
**Table** : `project_templates`

Exemples :
- **ACC** : Autoconsommation collective (3 étapes)
- **Centrale** : Centrale solaire 500 kWc (5 étapes)
- **Autonomie** : Installation résidentielle (4 étapes)
- **Investissement** : Investissement solaire (6 étapes)

**Structure** :
```javascript
{
  type: "ACC",
  title: "Autoconsommation Collective",
  description: "Projet d'autoconsommation collective",
  icon: "⚡",
  steps: [
    { name: "Inscription", icon: "📝", status: "pending" },
    { name: "Connexion Centrale", icon: "🔌", status: "pending" },
    { name: "Contrat", icon: "📄", status: "pending" }
  ]
}
```

---

### **Progression projet client**
**Table** : `project_steps_status`

Chaque client a une entrée par projet :
```javascript
{
  prospect_id: "uuid-client",
  project_type: "ACC",
  steps: [
    { name: "Inscription", status: "completed", completed_at: "2025-12-10" },
    { name: "Connexion Centrale", status: "in_progress" },
    { name: "Contrat", status: "pending" }
  ]
}
```

**Statuts possibles** :
- `pending` : Pas encore commencée
- `in_progress` : En cours
- `completed` : Terminée

**Real-time sync** : Changements visibles instantanément admin/client

---

## 🤖 SYSTÈME CHARLY AI (ÉTAT ACTUEL)

### **✅ CE QUI FONCTIONNE**

#### **1. Création de prompts**
- ✅ Interface complète dans ProfilePage
- ✅ Configuration par étape
- ✅ Stockage Supabase avec real-time
- ✅ Hook `useSupabasePrompts` (CRUD complet)

#### **2. Sélection manuelle de prompt**
- ✅ Admin peut sélectionner un prompt dans la fiche prospect
- ✅ Envoi des messages/formulaires de l'étape actuelle
- ✅ Création des `client_form_panels` associés

#### **3. Tâches automatiques**
- ✅ `useAutoCreateTasks` : Crée tâches quand étape → "in_progress"
- ✅ `useAutoVerificationTasks` : Crée tâches de vérification formulaire
- ✅ Checklist commerciale affichée et fonctionnelle

#### **4. Auto-complétion partielle**
- ✅ Checklist commerciale : Tout coché → Étape suivante
- ✅ Formulaire `verificationMode: none` : Soumission → Étape suivante
- ✅ Validation manuelle formulaire → Étape suivante (si autoCompleteStep)

---

### **❌ CE QUI NE FONCTIONNE PAS / MANQUE**

#### **1. Pas d'envoi automatique**
**Problème** : Quand une étape passe à "in_progress", les actions du prompt ne sont PAS déclenchées automatiquement.

**Attendu** :
- Étape 1 → "in_progress"
- Prompt a des actions pour l'étape 1
- **Devrait** : Envoyer automatiquement messages + formulaires

**Actuel** :
- Admin doit manuellement sélectionner le prompt
- Admin doit cliquer "Envoyer"

**Impact** : Pas d'automatisation, tout est manuel

---

#### **2. managementMode='automatic' non implémenté**
**Problème** : Le champ existe mais ne fait rien.

**Attendu** :
- `managementMode: 'automatic'` → Envoi automatique par l'IA
- `managementMode: 'manual'` → Tâche commerciale créée

**Actuel** :
- Seul `'manual'` fonctionne (création de tâches)
- `'automatic'` est ignoré

---

#### **3. verificationMode='ai' non implémenté**
**Problème** : Le champ existe mais ne fait rien.

**Attendu** :
- Client soumet formulaire
- IA (ChatGPT) analyse les réponses
- IA accepte ou rejette automatiquement
- IA envoie message d'explication

**Actuel** :
- Seuls `'none'` et `'human'` fonctionnent
- `'ai'` est ignoré

---

#### **4. Actions non-formulaires pas implémentées**
**Problème** : Types d'actions existent mais ne font rien.

**Types concernés** :
- ❌ `start_signature` : Devrait envoyer lien signature électronique
- ❌ `open_payment` : Devrait envoyer lien de paiement
- ❌ `request_document` : Devrait créer formulaire upload (mais déjà possible via formulaires)

**Actuel** :
- Seul `show_form` et `none` fonctionnent
- Autres types ignorés

---

#### **5. Champ 'ton' non exploité**
**Problème** : Admin choisit un ton mais il n'est pas utilisé.

**Attendu** :
- Ton "professionnel" → Messages formels
- Ton "détendu" → Messages casual
- Ton "humain" → Messages chaleureux
- IA adapte les messages selon le ton

**Actuel** :
- Messages envoyés tels quels, sans adaptation

---

#### **6. Pas de personnalisation IA**
**Problème** : Messages génériques pour tous les clients.

**Attendu** :
- IA récupère contexte client (nom, projet, historique)
- IA personnalise chaque message
- IA adapte selon l'objectif de l'étape (vendre, rassurer, etc.)

**Actuel** :
- Messages identiques pour tous les clients
- Pas de contexte pris en compte

---

## 🔧 HOOKS SUPABASE OPÉRATIONNELS

### **✅ Hooks fonctionnels**
- `useSupabaseProspects` : Prospects CRUD + real-time
- `useSupabaseAgenda` : RDV/appels/tâches CRUD + real-time
- `useSupabaseProjectStepsStatus` : Étapes projets + real-time
- `useSupabaseChatMessages` : Messages chat + real-time
- `useSupabaseClientFormPanels` : Formulaires clients + real-time
- `useSupabaseProjectHistory` : Historique événements
- `useSupabaseProjectFiles` : Fichiers projets
- `useSupabaseForms` : Définitions formulaires
- `useSupabasePrompts` : Prompts Charly AI
- `useSupabaseUser` : Utilisateur connecté
- `useSupabaseUsers` : Liste utilisateurs admin
- `useAutoCreateTasks` : Création tâches auto
- `useAutoVerificationTasks` : Création tâches vérification

---

## 📊 TABLES SUPABASE PRINCIPALES

### **Utilisateurs**
- `auth.users` : Authentification Supabase
- `public.users` : Utilisateurs admin (avec rôles)
- `public.prospects` : Prospects/Clients (avec `user_id` pour clients inscrits)

### **Projets**
- `project_templates` : Templates de projets (ACC, Centrale, etc.)
- `project_steps_status` : Progression des projets par client
- `project_history` : Historique événements
- `project_files` : Fichiers liés aux projets

### **Communication**
- `chat_messages` : Messages du chat
- `chat_participants` : Participants aux conversations
- `client_form_panels` : Formulaires envoyés aux clients

### **Agenda**
- `appointments` : RDV, appels, tâches

### **Charly AI**
- `prompts` : Configuration des prompts
- `forms` : Définitions des formulaires dynamiques

### **Configuration**
- `global_pipeline_steps` : Étapes du pipeline commercial
- `company_settings` : Paramètres entreprise

---

## 🎨 INTERFACE UTILISATEUR

### **Admin**
- **Design** : Tailwind CSS + Radix UI
- **Layout** : Sidebar navigation
- **Components** : Shadcn UI
- **Real-time** : Indicateurs visuels de sync
- **Responsive** : Desktop principalement

### **Client**
- **Design** : Interface moderne et épurée
- **Layout** : Navigation top + sidebar mobile
- **Real-time** : Notifications instantanées
- **Responsive** : Desktop + Mobile optimisé

---

## 🔐 SÉCURITÉ

### **Authentication**
- Supabase Auth (email/password)
- Magic Links pour clients
- Sessions sécurisées
- Refresh tokens automatiques

### **Authorization (RLS)**
- Policies Supabase par table
- Filtrage automatique selon rôle
- Admins : Accès prospects de leur équipe
- Clients : Accès uniquement à leurs données

### **Data Protection**
- HTTPS obligatoire
- Clés API côté serveur uniquement
- Validation des entrées
- RGPD compliant

---

## 🚀 PERFORMANCE

### **Optimisations**
- ✅ Lazy loading des composants
- ✅ Pagination des listes
- ✅ Indexes Supabase sur colonnes fréquentes
- ✅ Cache des requêtes répétées
- ✅ Real-time channels optimisés

### **Limitations actuelles**
- ⚠️ Pas de service worker (offline)
- ⚠️ Pas de cache persistant
- ⚠️ Real-time limité à 100 connexions simultanées (plan gratuit)

---

## 📈 MÉTRIQUES DISPONIBLES

### **Dashboard admin** (à venir)
- Nombre de prospects par statut
- Taux de conversion par étape
- Activité commerciale
- Formulaires en attente
- Tâches en retard

### **Logs système**
- Console browser avec `logger` helper
- Erreurs Supabase tracées
- Événements real-time loggés

---

## 🔄 WORKFLOW UTILISATEUR COMPLET (EXEMPLE)

### **Scénario : Nouveau client ACC**

1. **Commercial crée prospect "Sophie Martin"** (Pipeline)
2. **Assigne projet "ACC"** (3 étapes)
3. **Étape 1 "Inscription" → in_progress** (automatique)
4. **Commercial ouvre fiche Sophie**
5. **Commercial sélectionne prompt "Workflow ACC"** (manuel)
6. **Système envoie message + formulaire RIB** (automatique)
7. **Sophie reçoit notification** (real-time)
8. **Sophie remplit formulaire RIB** (dashboard client)
9. **Sophie soumet** (status → submitted)
10. **Commercial reçoit tâche "Vérifier RIB"** (automatique)
11. **Commercial valide RIB** (1 clic)
12. **Étape 1 → completed, Étape 2 → in_progress** (automatique)
13. **Commercial doit RE-sélectionner prompt** (manuel ❌)
14. **Système envoie actions étape 2** (automatique)
15. **Etc.**

**Problème** : Étapes 5 et 13 sont manuelles, devraient être automatiques

---

## 🎯 RÉSUMÉ : QUI FAIT QUOI ?

### **✅ CE QUE L'ADMIN FAIT ACTUELLEMENT**
- Créer prospects
- Créer/configurer prompts
- **Sélectionner manuellement les prompts** ⚠️
- Valider/rejeter formulaires
- Cocher checklists
- Gérer agenda
- Communiquer via chat

### **✅ CE QUE LE CLIENT FAIT**
- Voir progression projets
- Remplir formulaires
- Soumettre documents
- Communiquer via chat
- Parrainer

### **✅ CE QUE LE SYSTÈME FAIT AUTOMATIQUEMENT**
- Créer étapes projet
- Passer première étape à "in_progress"
- Créer tâches de vérification
- Envoyer messages système
- Sync real-time
- Compléter étapes (si conditions remplies)

### **❌ CE QUE LE SYSTÈME DEVRAIT FAIRE MAIS NE FAIT PAS**
- Envoyer automatiquement les actions du prompt
- Personnaliser messages avec IA
- Valider formulaires avec IA
- Envoyer signatures/paiements
- Adapter ton des messages

---

## 📅 PROCHAINES ÉTAPES

### **Phase 1 : Automatisation IA (Priorité 1)**
- Créer Edge Function `send-automated-action`
- Créer hook `usePromptExecutor`
- Intégrer OpenAI pour personnalisation
- Durée : 3-4h

### **Phase 2 : Validation IA (Priorité 2)**
- Créer Edge Function `validate-with-ai`
- Analyser formulaires avec ChatGPT
- Auto-validation/rejet intelligente
- Durée : 4-5h

### **Phase 3 : Actions avancées (Priorité 3)**
- Signatures électroniques (DocuSeal)
- Paiements (Stripe)
- Durée : 3-4h par action

### **Phase 4 : Exploitation du ton (Priorité 4)**
- Adapter messages selon ton
- Reformulation intelligente
- Durée : 1-2h

---

**📊 ÉTAT GLOBAL : 80% FONCTIONNEL**

✅ Infrastructure solide  
✅ Workflow de base opérationnel  
✅ Real-time performant  
❌ Automatisation IA manquante (20% critique)

---

**Document mis à jour le** : 17 décembre 2025  
**Prochaine mise à jour** : Après implémentation Phase 1
