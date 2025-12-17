# 📊 ÉTAT DU SYSTÈME DE PROMPTS - ANALYSE COMPLÈTE

## 🎯 Vue d'ensemble

Le **système de Prompts Charly AI** est un système d'automatisation intelligent pour guider les clients à travers leurs projets (ACC, Centrale, Autonomie, etc.). Il permet aux admins de configurer des workflows qui envoient automatiquement des messages, formulaires, signatures, et passent à l'étape suivante selon certaines conditions.

---

## ✅ CE QUI FONCTIONNE ACTUELLEMENT

### 1. **Infrastructure de base (100% opérationnel)**

#### ✅ Table Supabase `prompts`
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

**État** : ✅ Table créée, RLS policies configurées, indexes créés

---

### 2. **Gestion des prompts (CRUD complet)**

#### ✅ Hook `useSupabasePrompts.js`
- **Lecture** : ✅ Charge tous les prompts depuis Supabase
- **Création** : ✅ `savePrompt()` fonctionne (INSERT/UPSERT)
- **Mise à jour** : ✅ `savePrompt()` gère les updates
- **Suppression** : ✅ `deletePrompt()` fonctionne
- **Real-time** : ✅ Écoute les changements (INSERT/UPDATE/DELETE)

```javascript
// Utilisé dans App.jsx (ligne 309)
const { prompts, loading, savePrompt, deletePrompt } = useSupabasePrompts();
```

**État** : ✅ Fonctionnel et utilisé dans toute l'app

---

### 3. **Interface de création de prompts**

#### ✅ Composant `PromptCreatorDialog` (ProfilePage.jsx, ligne 1110+)
- ✅ Choisir un projet (ACC, Centrale, etc.)
- ✅ Définir le ton (professionnel, détendu, humain)
- ✅ Configurer chaque étape du projet
- ✅ Ajouter des actions (messages + type)
- ✅ Types d'actions supportés :
  - `none` : Message simple
  - `show_form` : Afficher un formulaire
  - `start_signature` : Signature électronique
  - `request_document` : Demander un document
  - `open_payment` : Lien de paiement
- ✅ Cocher "Auto-complétion" : Passer automatiquement à l'étape suivante

**État** : ✅ Interface complète et fonctionnelle

---

### 4. **Structure de données `steps_config`**

#### ✅ Format JSONB stocké dans Supabase
```json
{
  "0": {
    "actions": [
      {
        "id": "action-1699876543210",
        "message": "Bonjour, merci de compléter le formulaire RIB",
        "type": "show_form",
        "formId": "form-rib-acc",
        "verificationMode": "human",
        "hasClientAction": true
      }
    ],
    "autoCompleteStep": true
  }
}
```

**État** : ✅ Structure bien définie et documentée

---

### 5. **Auto-complétion partielle (checklist interne)**

#### ✅ Checklist pour les commerciaux (ProspectDetailsAdmin.jsx, ligne 540+)
- ✅ Actions avec `hasClientAction: false` + `checklist: [...]`
- ✅ Affichage des checkboxes
- ✅ Détection quand toutes les cases sont cochées
- ✅ Si `autoCompleteStep: true` → Appelle `completeStepAndProceed()`

**Exemple** :
```javascript
// Quand toutes les checkboxes sont cochées
if (allChecked && currentStepConfig?.autoCompleteStep) {
  completeStepAndProceed(prospect.id, projectType, currentStepIndex, projectSteps);
}
```

**État** : ✅ Fonctionne pour les actions internes (checklist commercial)

---

### 6. **Hooks automatiques (création de tâches)**

#### ✅ `useAutoCreateTasks.js`
- ✅ Écoute les changements d'étapes (`project_steps_status`)
- ✅ Quand une étape passe à `in_progress` → Crée des tâches automatiquement
- ✅ Basé sur `managementMode: "manual"` dans le prompt

#### ✅ `useAutoVerificationTasks.js`
- ✅ Écoute les soumissions de formulaires (`client_form_panels`)
- ✅ Quand un client soumet un formulaire → Crée une tâche de vérification
- ✅ Basé sur `verificationMode: "human"` dans le prompt

**État** : ✅ Ces hooks fonctionnent et créent bien des tâches

---

### 7. **Validation manuelle de formulaires**

#### ✅ ProspectDetailsAdmin.jsx (ligne 772+)
- ✅ Admin voit les formulaires soumis
- ✅ Peut valider/rejeter via boutons "Valider" / "Rejeter"
- ✅ Après validation → Appelle `completeStepAndProceed()` si `autoCompleteStep: true` et `verificationMode: 'none'`

**État** : ✅ Fonctionne pour la validation manuelle

---

## ❌ CE QUI NE FONCTIONNE PAS / MANQUE

### 1. **🔥 PROBLÈME MAJEUR : Exécution automatique des prompts**

#### ❌ Aucun système pour déclencher les actions du prompt
**Manquant** : Fonction ou service qui, quand une étape devient `in_progress`, exécute automatiquement les actions définies dans le prompt.

**Ce qui devrait se passer** :
```javascript
// Quand une étape passe à "in_progress"
async function onStepActivated(prospectId, projectType, stepIndex) {
  // 1. Récupérer le prompt
  const prompt = await getPromptForProject(projectType);
  
  // 2. Récupérer la config de l'étape
  const stepConfig = prompt.steps_config[stepIndex];
  
  // 3. Exécuter TOUTES les actions
  for (const action of stepConfig.actions) {
    // Envoyer message dans le chat
    await sendChatMessage(prospectId, projectType, action.message);
    
    // Si action = show_form → Créer client_form_panel
    if (action.type === 'show_form') {
      await createFormPanel({
        prospect_id: prospectId,
        project_type: projectType,
        form_id: action.formId,
        prompt_id: prompt.id,
        current_step_index: stepIndex,
        status: 'pending'
      });
    }
    
    // Si action = start_signature → Envoyer lien DocuSeal
    if (action.type === 'start_signature') {
      await sendSignatureLink(prospectId, action.documentUrl);
    }
    
    // etc.
  }
}
```

**État actuel** : ❌ Cette fonction **N'EXISTE PAS**

**Impact** :
- Les prompts sont créés et stockés ✅
- Mais **jamais exécutés automatiquement** ❌
- Admin doit manuellement sélectionner le prompt dans l'interface pour envoyer les messages

---

### 2. **❌ Envoi manuel uniquement (pas d'automatisation)**

#### Code actuel (ProspectDetailsAdmin.jsx, ligne 268+)
```javascript
const handleSelectPrompt = async (prompt) => {
  const stepConfig = prompt.stepsConfig?.[currentStepIndex];
  
  // Envoyer les messages du prompt manuellement
  for (const action of stepConfig.actions) {
    addChatMessage(prospectId, projectType, { text: action.message });
    
    // Si formulaire, appelle registerClientForm
    if (action.type === 'show_form') {
      registerClientForm({ formId: action.formId, ... });
    }
  }
};
```

**Problème** :
- ❌ Admin doit cliquer sur "Sélectionner un prompt" à chaque fois
- ❌ Pas d'automatisation
- ❌ Pas de déclenchement au changement d'étape

---

### 3. **❌ Auto-complétion client ne fonctionne pas**

#### Problème : Formulaires ne s'affichent pas côté client
**Raison** : `registerClientForm()` écrit dans React state au lieu de Supabase

**Code actuel (App.jsx, ligne 1009)** :
```javascript
const registerClientForm = useCallback((formPayload) => {
  // ❌ Écrit dans React state uniquement
  setClientFormPanels(prev => [...prev, formPayload]);
  
  // ❌ PAS d'INSERT dans Supabase client_form_panels
}, []);
```

**Conséquence** :
- ❌ Formulaire existe en mémoire côté admin
- ❌ Client ne le voit jamais (états React séparés)
- ❌ Perdu au refresh de page
- ❌ Pas de real-time sync

**Ce qui devrait se passer** :
```javascript
const registerClientForm = async (formPayload) => {
  // ✅ INSERT dans Supabase
  await supabase
    .from('client_form_panels')
    .insert({
      panel_id: `panel-${Date.now()}`,
      prospect_id: formPayload.prospectId,
      project_type: formPayload.projectType,
      form_id: formPayload.formId,
      prompt_id: formPayload.promptId,
      current_step_index: formPayload.currentStepIndex,
      status: 'pending'
    });
};
```

---

### 4. **❌ Hook `useSupabaseClientFormPanels` pas complet**

#### Fichier : `src/hooks/useSupabaseClientFormPanels.js`

**Ce qui existe** :
- ✅ `updateFormPanel()` : Mettre à jour un panel existant
- ✅ `deleteFormPanel()` : Supprimer un panel
- ✅ Real-time subscription

**Ce qui MANQUE** :
- ❌ `createFormPanel()` : Créer un nouveau panel (INSERT)
- ❌ Hook pas importé/utilisé dans `App.jsx` pour remplacer `registerClientForm`

**État** : 🟡 Hook existe mais incomplet + non utilisé

---

### 5. **❌ Real-time auto-complétion formulaire client**

#### Système attendu (PROMPTS_AND_AUTOMATION.md, ligne 207+)
```javascript
// Backend : Écouter les soumissions pour auto-compléter les étapes
const subscription = supabase
  .channel('prompt-automation')
  .on(
    'postgres_changes',
    { event: 'UPDATE', table: 'client_form_panels' },
    async (payload) => {
      const formPanel = payload.new;
      
      // Si formulaire soumis par le client
      if (formPanel.status === 'submitted') {
        // Récupérer le prompt
        const prompt = await getPrompt(formPanel.project_type);
        const stepConfig = prompt.steps_config[formPanel.current_step_index];
        
        // Si auto-complétion activée
        if (stepConfig?.autoCompleteStep) {
          // Marquer l'étape comme terminée
          await completeStep(formPanel.prospect_id, formPanel.project_type);
          
          // Activer l'étape suivante + envoyer les messages/actions
          await activateNextStep(...);
        }
      }
    }
  )
  .subscribe();
```

**État actuel** : ❌ Ce système n'existe PAS

**Impact** :
- Client soumet un formulaire ✅
- Mais l'étape ne passe PAS automatiquement à "completed" ❌
- Étape suivante ne s'active PAS automatiquement ❌
- Pas d'envoi automatique des messages/actions de l'étape suivante ❌

---

### 6. **❌ Intégration chat incomplete**

#### Ce qui manque :
- ❌ Envoi automatique de messages dans le chat quand une étape s'active
- ❌ Lien entre `chat_messages` et `prompts` (colonne `prompt_id` existe mais pas utilisée partout)
- ❌ Affichage des formulaires dans les messages chat côté client

---

## 🎯 RÉSUMÉ : Fonctionnel vs À implémenter

### ✅ Fonctionnel (80% de la structure)

| Composant | État | Description |
|-----------|------|-------------|
| Table `prompts` | ✅ | Créée, RLS configurées |
| Hook `useSupabasePrompts` | ✅ | CRUD complet + real-time |
| Interface création prompts | ✅ | Dialog complet dans ProfilePage |
| Structure `steps_config` | ✅ | Format JSONB bien défini |
| Auto-complétion checklist | ✅ | Fonctionne pour actions internes |
| Création tâches auto | ✅ | `useAutoCreateTasks` opérationnel |
| Création tâches vérif | ✅ | `useAutoVerificationTasks` opérationnel |
| Validation manuelle formulaires | ✅ | Fonctionne dans ProspectDetailsAdmin |

---

### ❌ À implémenter (20% restant - fonctionnalités critiques)

| Composant | Priorité | Description |
|-----------|----------|-------------|
| **Exécution automatique prompts** | 🔴 CRITIQUE | Déclencher actions quand étape s'active |
| **Envoi automatique formulaires** | 🔴 CRITIQUE | Créer `client_form_panels` dans Supabase |
| **Auto-complétion formulaire client** | 🔴 CRITIQUE | Real-time : formulaire soumis → étape suivante |
| **Fonction `createFormPanel()`** | 🔴 CRITIQUE | Ajouter dans `useSupabaseClientFormPanels` |
| **Service/Edge Function Charly AI** | 🟡 IMPORTANT | Centraliser logique d'automatisation |
| Envoi automatique signatures | 🟢 NICE TO HAVE | Type `start_signature` |
| Envoi automatique paiements | 🟢 NICE TO HAVE | Type `open_payment` |
| Demande automatique documents | 🟢 NICE TO HAVE | Type `request_document` |

---

## 🚀 PLAN D'ACTION POUR RENDRE LE SYSTÈME FONCTIONNEL

### Phase 1 : Correction `registerClientForm` (1h)
**Objectif** : Formulaires visibles côté client

1. ✅ Ajouter `createFormPanel()` dans `useSupabaseClientFormPanels.js`
   ```javascript
   const createFormPanel = async (panelData) => {
     const { data, error } = await supabase
       .from('client_form_panels')
       .insert({
         panel_id: `panel-${Date.now()}`,
         prospect_id: panelData.prospectId,
         project_type: panelData.projectType,
         form_id: panelData.formId,
         prompt_id: panelData.promptId,
         current_step_index: panelData.currentStepIndex,
         status: 'pending'
       })
       .select()
       .single();
     return { data, error };
   };
   ```

2. ✅ Remplacer `registerClientForm` dans `App.jsx`
   ```javascript
   // Au lieu de setClientFormPanels (React state)
   const registerClientForm = async (formPayload) => {
     await createFormPanel(formPayload);
   };
   ```

3. ✅ Tester : Admin envoie formulaire → Client doit le voir

---

### Phase 2 : Exécution automatique des prompts (3-4h)
**Objectif** : Quand une étape s'active, envoyer automatiquement les messages et actions

**Option A : Hook côté frontend**
```javascript
// usePromptExecutor.js
export function usePromptExecutor(prompts) {
  useEffect(() => {
    const channel = supabase
      .channel('prompt-executor')
      .on(
        'postgres_changes',
        { event: 'UPDATE', table: 'project_steps_status' },
        async (payload) => {
          // Détecter étape qui passe à "in_progress"
          const stepIndex = findStepWithStatus(payload.new.steps, 'in_progress');
          
          if (stepIndex !== -1) {
            await executePromptActions(
              payload.new.prospect_id,
              payload.new.project_type,
              stepIndex
            );
          }
        }
      )
      .subscribe();
    
    return () => supabase.removeChannel(channel);
  }, [prompts]);
}

async function executePromptActions(prospectId, projectType, stepIndex) {
  // 1. Récupérer prompt
  const prompt = await getPromptForProject(projectType);
  const stepConfig = prompt.steps_config[stepIndex];
  
  // 2. Exécuter actions
  for (const action of stepConfig.actions) {
    // Envoyer message
    await sendChatMessage(prospectId, projectType, action.message);
    
    // Si formulaire
    if (action.type === 'show_form') {
      await createFormPanel({ prospect_id: prospectId, form_id: action.formId, ... });
    }
  }
}
```

**Option B : Supabase Edge Function (Backend)**
- Plus robuste
- Pas de dépendance client connecté
- Meilleure séparation des responsabilités

---

### Phase 3 : Auto-complétion formulaire client (2h)
**Objectif** : Formulaire soumis → Étape terminée → Étape suivante s'active

```javascript
// usePromptAutoCompletion.js
export function usePromptAutoCompletion(prompts) {
  useEffect(() => {
    const channel = supabase
      .channel('prompt-auto-completion')
      .on(
        'postgres_changes',
        { event: 'UPDATE', table: 'client_form_panels' },
        async (payload) => {
          const formPanel = payload.new;
          
          // Si formulaire soumis par le client
          if (payload.old.status !== 'submitted' && formPanel.status === 'submitted') {
            const prompt = prompts[formPanel.prompt_id];
            const stepConfig = prompt?.stepsConfig?.[formPanel.current_step_index];
            
            // Si auto-complétion activée + pas de vérification requise
            if (stepConfig?.autoCompleteStep) {
              const action = stepConfig.actions.find(a => a.formId === formPanel.form_id);
              
              if (action?.verificationMode === 'none') {
                // Compléter l'étape actuelle
                await completeStep(formPanel.prospect_id, formPanel.project_type, formPanel.current_step_index);
                
                // Activer l'étape suivante (déclenchera executePromptActions via Phase 2)
                await activateNextStep(formPanel.prospect_id, formPanel.project_type, formPanel.current_step_index + 1);
              }
            }
          }
        }
      )
      .subscribe();
    
    return () => supabase.removeChannel(channel);
  }, [prompts]);
}
```

---

### Phase 4 : Service centralisé (optionnel, 4-6h)
**Objectif** : Créer un service dédié pour gérer toute la logique Charly AI

```
supabase/functions/charly-automation/
  ├── index.ts (Edge Function principale)
  ├── executePrompt.ts
  ├── autoCompleteStep.ts
  └── handleFormSubmission.ts
```

---

## 📊 ESTIMATION TOTALE

| Phase | Durée | Complexité | Priorité |
|-------|-------|------------|----------|
| Phase 1 : Fix registerClientForm | 1h | 🟢 Facile | 🔴 CRITIQUE |
| Phase 2 : Exécution automatique | 3-4h | 🟡 Moyen | 🔴 CRITIQUE |
| Phase 3 : Auto-complétion client | 2h | 🟡 Moyen | 🔴 CRITIQUE |
| Phase 4 : Service centralisé | 4-6h | 🔴 Difficile | 🟢 NICE TO HAVE |

**TOTAL (minimum viable)** : ~6-7 heures

---

## 🎯 ORDRE D'IMPLÉMENTATION RECOMMANDÉ

1. **Phase 1** → Fix `registerClientForm` (BLOQUEUR pour client)
2. **Phase 2** → Exécution automatique (CORE de Charly AI)
3. **Phase 3** → Auto-complétion (USER EXPERIENCE)
4. **Phase 4** → Service centralisé (OPTIMISATION)

---

## 📁 FICHIERS CONCERNÉS

### ✅ Déjà créés/configurés
- ✅ `supabase/schema.sql` (table `prompts`)
- ✅ `src/hooks/useSupabasePrompts.js`
- ✅ `src/pages/admin/ProfilePage.jsx` (PromptCreatorDialog)
- ✅ `src/hooks/useAutoCreateTasks.js`
- ✅ `src/hooks/useAutoVerificationTasks.js`
- ✅ `src/hooks/useSupabaseClientFormPanels.js` (partiel)

### ❌ À créer
- ❌ `src/hooks/usePromptExecutor.js` (Phase 2)
- ❌ `src/hooks/usePromptAutoCompletion.js` (Phase 3)
- ❌ `supabase/functions/charly-automation/index.ts` (Phase 4, optionnel)

### 🔧 À modifier
- 🔧 `src/App.jsx` (remplacer `registerClientForm`)
- 🔧 `src/hooks/useSupabaseClientFormPanels.js` (ajouter `createFormPanel`)
- 🔧 `src/components/admin/ProspectDetailsAdmin.jsx` (utiliser `createFormPanel` au lieu de `registerClientForm`)

---

## 🎉 RÉSULTAT FINAL ATTENDU

Une fois toutes les phases implémentées :

1. **Admin crée un prompt** pour le projet "ACC"
2. **Client démarre un projet ACC** → Étape 1 devient "in_progress"
3. **Charly AI envoie automatiquement** :
   - Message : "Bienvenue ! Merci de compléter le formulaire RIB"
   - Formulaire RIB apparaît côté client
4. **Client remplit et soumet** le formulaire
5. **Charly AI détecte** la soumission
6. **Si `autoCompleteStep: true` et `verificationMode: 'none'`** :
   - Étape 1 → "completed"
   - Étape 2 → "in_progress"
   - Envoie automatiquement les messages/actions de l'étape 2
7. **Processus se répète** jusqu'à la fin du projet

**= 100% AUTOMATISÉ, ZÉRO INTERVENTION MANUELLE** 🚀

---

**Date de l'analyse** : 17 décembre 2025  
**Version système** : Locasun Supabase v1.0  
**Statut** : 80% fonctionnel, 20% critique à implémenter
