# 🤖 Système de Prompts et Actions Automatiques (Charly AI)

## ✅ Vue d'ensemble

Le système de **Création de Prompt** permet aux admins de créer des **workflows intelligents** pour chaque projet. À chaque étape d'un projet, l'admin peut définir :
- 📝 **Messages automatiques** à envoyer aux clients
- 📋 **Formulaires** à afficher
- ⚡ **Actions** à déclencher (signature, paiement, documents)
- ✅ **Règles de complétion automatique** : Si le client remplit un formulaire → passer automatiquement à l'étape suivante

Ce système transforme Charly AI en **assistant intelligent** qui guide les clients tout au long de leur projet.

## 🏗️ Architecture

### Tables impliquées

```
prompts (scénarios configurés)
  │
  ├──→ project_templates (projet associé)
  │       └──→ steps (étapes du projet)
  │
  └──→ forms (formulaires à envoyer)
          └──→ client_form_panels (instances envoyées)
```

## 📊 Table : `prompts`

### Structure

```sql
CREATE TABLE public.prompts (
  id UUID PRIMARY KEY,
  prompt_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  tone TEXT,
  project_id TEXT REFERENCES project_templates(type),
  steps_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### Champs

| Champ | Type | Description |
|-------|------|-------------|
| `prompt_id` | TEXT | Identifiant unique (ex: `prompt-1699876543210`) |
| `name` | TEXT | Nom du prompt (ex: "Workflow ACC complet") |
| `tone` | TEXT | Ton des messages : `professionnel`, `détendu`, `humain` |
| `project_id` | TEXT | Type de projet associé (`ACC`, `Centrale`, etc.) |
| `steps_config` | JSONB | Configuration des actions par étape (voir structure ci-dessous) |

### Structure du champ `steps_config` (JSONB)

```json
{
  "0": {
    "actions": [
      {
        "id": "action-1699876543210",
        "message": "Bonjour, merci de compléter le formulaire RIB pour finaliser votre dossier",
        "type": "show_form",
        "formId": "form-1699876543200"
      },
      {
        "id": "action-1699876543211",
        "message": "Voici le récapitulatif de votre projet",
        "type": "none"
      }
    ],
    "autoCompleteStep": true
  },
  "1": {
    "actions": [
      {
        "id": "action-1699876543212",
        "message": "Merci de signer le contrat ci-dessous",
        "type": "start_signature",
        "documentUrl": "https://..."
      }
    ],
    "autoCompleteStep": false
  }
}
```

### Types d'actions supportés

| Type | Description | Champs requis |
|------|-------------|---------------|
| `none` | Message simple sans action | `message` |
| `show_form` | Afficher un formulaire | `message`, `formId` |
| `start_signature` | Lancer une signature électronique | `message`, `documentUrl` |
| `request_document` | Demander un document | `message`, `documentType` |
| `open_payment` | Ouvrir un lien de paiement | `message`, `paymentUrl` |

## 🔄 Workflow complet

### 1️⃣ Création d'un prompt (Admin)

**Interface** : `ProfilePage.jsx` > **Création de Prompt** (ligne 2259)

```javascript
// Créer un nouveau prompt dans Supabase
const { data: newPrompt, error } = await supabase
  .from('prompts')
  .insert({
    prompt_id: `prompt-${Date.now()}`,
    name: 'Workflow ACC - Collecte documents',
    tone: 'professionnel',
    project_id: 'ACC',
    steps_config: {
      "0": {
        "actions": [
          {
            "id": `action-${Date.now()}`,
            "message": "Bonjour, merci de compléter le formulaire RIB",
            "type": "show_form",
            "formId": "form-rib-acc"
          }
        ],
        "autoCompleteStep": true  // 🔥 Auto-complétion activée
      },
      "1": {
        "actions": [
          {
            "id": `action-${Date.now() + 1}`,
            "message": "Veuillez envoyer votre pièce d'identité",
            "type": "request_document",
            "documentType": "id_card"
          }
        ],
        "autoCompleteStep": false
      }
    }
  })
  .select()
  .single();
```

**Actions disponibles dans l'interface** :
- ✅ Choisir un projet (ACC, Autonomie, Centrale, etc.)
- ✅ Définir le ton (professionnel, détendu, humain)
- ✅ Pour chaque étape du projet :
  - ✅ Ajouter des messages + actions
  - ✅ Sélectionner le type d'action (formulaire, signature, document, paiement)
  - ✅ Choisir le formulaire à afficher (si type = `show_form`)
  - ✅ **Cocher "Auto-complétion"** → Si le formulaire est rempli, passer automatiquement à l'étape suivante

### 2️⃣ Exécution du prompt (Charly AI)

Lorsqu'un client atteint une étape spécifique d'un projet, Charly AI :

1. **Récupère le prompt** associé au projet
2. **Trouve la configuration** pour l'étape actuelle
3. **Envoie les messages** définis dans `actions`
4. **Déclenche les actions** associées (formulaire, signature, etc.)

```javascript
// Récupérer le prompt pour un projet
const { data: prompt, error } = await supabase
  .from('prompts')
  .select('*')
  .eq('project_id', 'ACC')
  .single();

// Trouver la configuration pour l'étape actuelle (ex: étape 0)
const currentStepIndex = 0;
const stepConfig = prompt.steps_config[currentStepIndex];

// Envoyer les messages et actions
for (const action of stepConfig.actions) {
  // Créer un message chat
  await supabase
    .from('chat_messages')
    .insert({
      prospect_id: prospectId,
      sender: 'admin',
      message: action.message,
      timestamp: new Date().toISOString()
    });

  // Si c'est un formulaire, créer un client_form_panel
  if (action.type === 'show_form') {
    await supabase
      .from('client_form_panels')
      .insert({
        panel_id: `panel-${Date.now()}`,
        prospect_id: prospectId,
        project_type: 'ACC',
        form_id: action.formId,
        status: 'pending',
        message_timestamp: new Date().toISOString()
      });
  }
}
```

### 3️⃣ Auto-complétion d'étape (🔥 Fonctionnalité clé)

Lorsque `autoCompleteStep = true`, le système **écoute** la soumission du formulaire et **passe automatiquement** à l'étape suivante :

```javascript
// Écouter les soumissions de formulaires avec Real-time
const subscription = supabase
  .channel('form-submissions')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'client_form_panels',
      filter: `prospect_id=eq.${prospectId}`
    },
    async (payload) => {
      const formPanel = payload.new;
      
      // Si le formulaire vient d'être soumis
      if (formPanel.status === 'pending' && formPanel.user_override === 'submitted') {
        // Récupérer le prompt associé au projet
        const { data: prompt } = await supabase
          .from('prompts')
          .select('*')
          .eq('project_id', formPanel.project_type)
          .single();

        // Trouver l'index de l'étape actuelle
        const currentStepIndex = getCurrentStepIndex(prospectId, formPanel.project_type);
        const stepConfig = prompt.steps_config[currentStepIndex];

        // Si auto-complétion activée pour cette étape
        if (stepConfig?.autoCompleteStep) {
          // Marquer l'étape comme terminée
          await supabase
            .from('project_steps_status')
            .update({
              steps: updateStepStatus(currentStepIndex, 'done')
            })
            .eq('prospect_id', prospectId)
            .eq('project_type', formPanel.project_type);

          // Passer à l'étape suivante
          const nextStepIndex = currentStepIndex + 1;
          const nextStepConfig = prompt.steps_config[nextStepIndex];

          if (nextStepConfig) {
            // Envoyer les messages de l'étape suivante
            for (const action of nextStepConfig.actions) {
              await supabase
                .from('chat_messages')
                .insert({
                  prospect_id: prospectId,
                  sender: 'admin',
                  message: action.message,
                  timestamp: new Date().toISOString()
                });

              // Déclencher les actions
              if (action.type === 'show_form') {
                await supabase
                  .from('client_form_panels')
                  .insert({
                    panel_id: `panel-${Date.now()}`,
                    prospect_id: prospectId,
                    project_type: formPanel.project_type,
                    form_id: action.formId,
                    status: 'pending',
                    message_timestamp: new Date().toISOString()
                  });
              }
            }
          }
        }
      }
    }
  )
  .subscribe();
```

### 4️⃣ Modification d'un prompt (Admin)

```javascript
// Modifier un prompt existant
const { data: updatedPrompt } = await supabase
  .from('prompts')
  .update({
    name: 'Nouveau nom',
    tone: 'détendu',
    steps_config: {
      "0": {
        "actions": [
          {
            "id": "action-new",
            "message": "Message modifié",
            "type": "show_form",
            "formId": "form-autre"
          }
        ],
        "autoCompleteStep": false  // Désactiver l'auto-complétion
      }
    }
  })
  .eq('prompt_id', 'prompt-123');
```

## 🎯 Cas d'usage

### Exemple 1 : Workflow ACC - Collecte documents

```javascript
{
  name: 'Workflow ACC - Documents',
  tone: 'professionnel',
  project_id: 'ACC',
  steps_config: {
    "0": {  // Étape 1 : Inscription
      "actions": [
        {
          "message": "Bienvenue dans votre projet ACC ! Pour commencer, merci de compléter le formulaire RIB.",
          "type": "show_form",
          "formId": "form-rib"
        }
      ],
      "autoCompleteStep": true  // 🔥 Passer automatiquement à l'étape 2 quand le RIB est rempli
    },
    "1": {  // Étape 2 : Connexion à la centrale
      "actions": [
        {
          "message": "Merci ! Maintenant, merci de signer le contrat de raccordement.",
          "type": "start_signature",
          "documentUrl": "https://sign.docuseal.co/..."
        }
      ],
      "autoCompleteStep": false
    },
    "2": {  // Étape 3 : Contrat
      "actions": [
        {
          "message": "Parfait ! Votre dossier est complet. Nous allons maintenant procéder au raccordement.",
          "type": "none"
        }
      ],
      "autoCompleteStep": false
    }
  }
}
```

### Exemple 2 : Workflow Centrale - Financement

```javascript
{
  name: 'Workflow Centrale - Financement',
  tone: 'humain',
  project_id: 'Centrale',
  steps_config: {
    "0": {  // Étude technique
      "actions": [
        {
          "message": "Bonjour ! Pour étudier votre projet, merci de compléter ce questionnaire technique.",
          "type": "show_form",
          "formId": "form-questionnaire-technique"
        }
      ],
      "autoCompleteStep": true
    },
    "1": {  // Montage financier
      "actions": [
        {
          "message": "Merci ! Voici notre proposition de financement. Merci de confirmer votre accord.",
          "type": "show_form",
          "formId": "form-accord-financement"
        }
      ],
      "autoCompleteStep": true
    },
    "2": {  // Dépôt mairie
      "actions": [
        {
          "message": "Nous allons maintenant déposer le dossier en mairie. Vous serez notifié de l'avancement.",
          "type": "none"
        }
      ],
      "autoCompleteStep": false
    }
  }
}
```

## 🔒 Row Level Security (RLS)

### Policies pour `prompts`

```sql
-- Admins : CRUD complet
CREATE POLICY "Admins can manage prompts"
  ON public.prompts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
      AND users.role IN ('Global Admin', 'Manager', 'Commercial')
    )
  );

-- Clients : Pas d'accès direct (les prompts sont utilisés en backend par Charly AI)
-- Les clients ne voient que les résultats (messages chat, formulaires)
```

## 📡 Real-time pour auto-complétion

### Écouter les soumissions de formulaires

```javascript
// Backend : Écouter les soumissions pour auto-compléter les étapes
const subscription = supabase
  .channel('prompt-automation')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'client_form_panels'
    },
    async (payload) => {
      const formPanel = payload.new;
      
      // Si formulaire soumis
      if (formPanel.user_override === 'submitted') {
        await handleFormSubmission(formPanel);
      }
    }
  )
  .subscribe();

async function handleFormSubmission(formPanel) {
  // 1. Récupérer le prompt
  const { data: prompt } = await supabase
    .from('prompts')
    .select('*')
    .eq('project_id', formPanel.project_type)
    .single();

  // 2. Trouver l'étape actuelle
  const currentStepIndex = await getCurrentStepIndex(
    formPanel.prospect_id,
    formPanel.project_type
  );

  // 3. Vérifier si auto-complétion activée
  const stepConfig = prompt.steps_config[currentStepIndex];
  if (stepConfig?.autoCompleteStep) {
    // 4. Compléter l'étape actuelle
    await completeStep(formPanel.prospect_id, formPanel.project_type, currentStepIndex);

    // 5. Activer l'étape suivante avec ses actions
    await activateNextStep(formPanel.prospect_id, formPanel.project_type, currentStepIndex + 1, prompt);
  }
}
```

## 🎯 Avantages du système

1. **Automatisation complète** : Les clients sont guidés automatiquement sans intervention admin
2. **Flexibilité** : Chaque projet peut avoir son propre workflow
3. **Gain de temps** : L'admin configure une fois, le système gère ensuite
4. **Expérience client fluide** : Pas de friction, tout se passe dans le chat
5. **Traçabilité** : Toutes les actions sont enregistrées dans les messages chat
6. **Personnalisation** : Ton adaptable selon le contexte

## 📁 Fichiers concernés

### Backend (Supabase)
- ✅ `/supabase/schema.sql` - Table `prompts` avec `steps_config`
- ✅ RLS policies configurées

### Frontend (à migrer)
- ⏳ `src/services/promptService.js` - Service API pour les prompts
- ⏳ `src/pages/admin/ProfilePage.jsx` - Création de prompts (ligne 2259)
- ⏳ `src/components/ProjectDetails.jsx` - Exécution des prompts côté client
- ⏳ Backend service pour auto-complétion (à créer)

## 🚀 Prochaines étapes

1. ✅ Schéma Supabase créé avec table `prompts` enrichie
2. ✅ RLS policies configurées
3. ⏳ Créer `src/services/promptService.js` avec CRUD complet
4. ⏳ Migrer `PromptCreatorDialog` dans ProfilePage vers Supabase
5. ⏳ Implémenter le système d'auto-complétion avec Real-time
6. ⏳ Créer un backend service pour gérer les workflows automatiques
7. ⏳ Intégrer avec le système de chat existant

---

**✅ Le système de prompts et actions automatiques est maintenant correctement intégré dans le schéma Supabase !**
