# 📋 AUDIT V1 — Actions, Formulaires, Signatures, Cibles

> **Date**: 2026-01-28
> **Objectif**: Identifier les points d'ancrage V1 pour le branchement V2
> **Aucun code modifié**

---

## 1️⃣ Où sont définies les ACTIONS existantes

### Types d'action supportés (V1)

| Type | Description | Fichier de définition |
|------|-------------|----------------------|
| `show_form` | Envoyer un formulaire au client | `WorkflowsCharlyPage.jsx` L237-268 |
| `start_signature` | Lancer une procédure de signature | `WorkflowsCharlyPage.jsx` L289-356 |
| `request_document` | Demander un document au client | `WorkflowsCharlyPage.jsx` L269-288 |
| `open_payment` | Ouvrir un paiement | `WorkflowsCharlyPage.jsx` (non implémenté) |
| `partner_task` | Assigner une mission à un partenaire | `WorkflowsCharlyPage.jsx` L129-220 |
| `none` | Aucune action | Par défaut |

### Structure d'une action (payload V1)

```javascript
{
  id: string,              // UUID unique
  type: 'show_form' | 'start_signature' | 'request_document' | 'partner_task' | 'none',
  order: number,           // Ordre d'exécution séquentiel
  waitForPrevious: boolean,// Attendre validation action précédente
  
  // Pour show_form
  formId: string,          // ID du formulaire à envoyer
  verificationMode: 'none' | 'ai' | 'human', // Mode de vérification après soumission
  approvalMessage: string, // Message si validé
  rejectionMessage: string,// Message si rejeté
  
  // Pour start_signature  
  templateId: string,      // ID du template de contrat
  formId: string,          // Formulaire source des données (optionnel)
  
  // Pour partner_task
  partnerId: string,       // UUID du partenaire assigné
  partnerInstructions: string, // Instructions pour le partenaire
  isBlocking: boolean,     // Bloque le workflow si non terminé
  
  // Commun
  message: string,         // Message à envoyer au client
  hasClientAction: boolean | null, // null = partenaire, true = client, false = commercial
  managementMode: 'automatic' | 'manual', // IA ou humain gère
  createTask: boolean,     // Créer une tâche pour le commercial
  taskTitle: string,       // Titre de la tâche
}
```

---

## 2️⃣ Où V1 récupère la liste des FORMULAIRES

### Hook principal

**Fichier**: `src/hooks/useSupabaseForms.js`

```javascript
// Table: forms
// Filtré par organization_id (multi-tenant)
const { data } = await supabase
  .from('forms')
  .select('*')
  .or(`organization_id.eq.${organizationId},organization_id.is.null`)

// Structure retournée:
{
  [form_id]: {
    id: string,
    name: string,
    fields: Field[],        // Champs du formulaire
    projectIds: string[],   // Types de projet associés
    audience: 'client' | 'internal', // Destinataire
  }
}
```

### Consommation dans WorkflowsCharlyPage

**Fichier**: `src/pages/admin/WorkflowsCharlyPage.jsx` L543-557

```javascript
const { forms: supabaseForms } = useSupabaseForms(organizationId);

// Filtré par audience pour show_form (client uniquement)
{Object.values(forms)
  .filter(form => form.audience === 'client' || !form.audience)
  .map(form => <SelectItem key={form.id} value={form.id}>{form.name}</SelectItem>)}
```

### Audience des formulaires

| Audience | Description | Visible dans |
|----------|-------------|--------------|
| `client` | Envoyé au client via chat | Actions `show_form` |
| `internal` | Utilisé en interne (commercial) | Onglet "Formulaires internes" |

---

## 3️⃣ Où V1 récupère les types de SIGNATURE / templates

### Hook principal

**Fichier**: `src/hooks/useSupabaseContractTemplates.js`

```javascript
// Table: contract_templates
// Filtré par organization_id (multi-tenant)
const { data } = await supabase
  .from('contract_templates')
  .select('*')
  .eq('organization_id', organizationId)

// Structure retournée:
{
  id: string,
  name: string,
  projectType: string,    // Type de projet associé
  contentHtml: string,    // Template HTML du contrat
  version: number,
  isActive: boolean,      // Visible dans les sélecteurs
}
```

### Consommation dans WorkflowsCharlyPage

**Fichier**: `src/pages/admin/WorkflowsCharlyPage.jsx` L305-315

```javascript
const { templates: contractTemplates } = useSupabaseContractTemplates(organizationId);

// Filtré par isActive
{contractTemplates
  .filter(template => template.isActive)
  .map(template => (
    <SelectItem key={template.id} value={template.id}>
      {template.name}
    </SelectItem>
  ))}
```

### Procédure de signature (exécution)

**Fichier**: `src/hooks/useSignatureProcedures.js`

```javascript
// Table: signature_procedures
{
  id: UUID,
  organization_id: UUID,
  prospect_id: UUID,
  project_type: string,
  file_id: UUID,           // Lien vers project_files
  signer_name: string,
  signer_email: string,
  access_token: string,    // Token unique pour le lien
  status: 'pending' | 'signed' | 'expired' | 'refused',
  signature_metadata: {
    document_type: 'contract_pdf',
    created_by: 'workflow_automation',
  }
}
```

---

## 4️⃣ Où est géré le choix "Associée au client/commercial/partenaire"

### UI de sélection

**Fichier**: `src/pages/admin/WorkflowsCharlyPage.jsx` L72-147

```jsx
// 3 boutons exclusifs
<button onClick={() => handleActionChange('hasClientAction', true)}>
  👤 Associée au client
</button>

<button onClick={() => handleActionChange('hasClientAction', false)}>
  💼 Associée au commercial
</button>

<button onClick={() => onChange({ ...action, type: 'partner_task', hasClientAction: null })}>
  🤝 Associée au partenaire
</button>
```

### Logique de stockage

| Cible | `hasClientAction` | `type` |
|-------|-------------------|--------|
| Client | `true` | `show_form` / `start_signature` / `request_document` |
| Commercial | `false` | (checklist interne) |
| Partenaire | `null` | `partner_task` |

### Impact sur l'exécution

**Fichier**: `src/hooks/useWorkflowExecutor.js` L60-72

```javascript
// Ignorer les actions commerciales (hasClientAction === false)
if (action.hasClientAction === false) {
  logger.debug('Action commerciale, skip automatisation');
  continue;
}
```

---

## 5️⃣ Le "petit robot" — Trigger d'exécution

### Localisation du bouton

**Fichier**: `src/components/admin/ProspectDetailsAdmin.jsx` L804

```jsx
<button onClick={() => handleSelectPrompt(prompt)}>
  🤖 {prompt.name}
</button>
```

### Fonction déclenchée

**Fichier**: `src/components/admin/ProspectDetailsAdmin.jsx` L419-720

```javascript
const handleSelectPrompt = async (prompt, specificActionId = null) => {
  const stepConfig = prompt.stepsConfig?.[currentStepIndex];
  
  // Trier les actions par ordre
  const sortedActions = [...stepConfig.actions].sort((a, b) => (a.order || 0) - (b.order || 0));
  
  for (const action of sortedActions) {
    // Vérifier si action déjà envoyée
    const actionAlreadySent = existingMessages.some(msg => ...);
    if (actionAlreadySent) continue;
    
    // Exécuter selon le type
    if (action.type === 'show_form') {
      // 1. Envoyer message dans chat
      // 2. Enregistrer dans client_form_panels
      // 3. Ajouter événement dans project_history
    }
    
    if (action.type === 'start_signature') {
      // 1. Extraire form_data du prospect
      // 2. Générer PDF via executeContractSignatureAction()
      // 3. Créer signature_procedures
      // 4. Envoyer lien dans chat
    }
    
    // Arrêter après la première action non envoyée
    break;
  }
}
```

### Payload attendu par handleSelectPrompt

```javascript
// Input
{
  prompt: {
    id: string,
    projectId: string,      // Type de projet
    stepsConfig: {
      [stepIndex]: {
        actions: Action[],  // Liste des actions configurées
        autoCompleteStep: boolean,
      }
    }
  },
  specificActionId: string | null, // Force une action spécifique
}

// Contexte implicite (depuis le composant)
{
  prospectId: string,
  projectType: string,
  currentStepIndex: number,
  messages: ChatMessage[],  // Messages existants
  forms: Object,            // Formulaires disponibles
  projectsData: Object,     // Données des projets
}
```

---

## 6️⃣ Exécution automatique (sans clic robot)

### Hook d'auto-exécution

**Fichier**: `src/hooks/useWorkflowExecutor.js`

```javascript
export function useWorkflowExecutor({ prospectId, projectType, currentSteps, activeAdminUser }) {
  useEffect(() => {
    // Charger le prompt/workflow
    // Trouver l'étape in_progress
    // Exécuter les actions automatiques (managementMode === 'automatic')
  }, [prospectId, projectType, currentSteps]);
}
```

### Switch d'exécution

```javascript
switch (action.type) {
  case 'start_signature':
    await executeStartSignatureAction({ action, prospectId, projectType });
    break;
  case 'show_form':
    // Géré côté client (pas d'auto-exécution)
    break;
  case 'partner_task':
    await executePartnerTaskAction({ action, prospectId, projectType });
    break;
}
```

---

## 📊 Résumé pour V2

### Sources de données READ-ONLY à exposer

| Catalogue | Hook source | Table |
|-----------|-------------|-------|
| Formulaires | `useSupabaseForms` | `forms` |
| Templates contrat | `useSupabaseContractTemplates` | `contract_templates` |
| Partenaires | `useSupabasePartners` | `partners` |

### Actions V2 (phase 1)

| Type V2 | Équivalent V1 | Cible |
|---------|---------------|-------|
| `FORMULAIRE` | `show_form` | client |
| `LANCER_SIGNATURE` | `start_signature` | client |

### Points de branchement V2 → V1

| Étape | Fichier V1 | Fonction |
|-------|-----------|----------|
| Exécution manuelle | `ProspectDetailsAdmin.jsx` | `handleSelectPrompt(prompt, actionId)` |
| Exécution auto | `useWorkflowExecutor.js` | `executeAction({ action, prospectId, projectType })` |

---

## ✅ Prochaines étapes

1. **Catalogue read-only** — Créer `src/lib/catalogueV2.js` exposant formulaires + templates
2. **Enrichir moduleAIConfig** — Ajouter `allowedActionTypes`, `targetAudience`, `allowedFormIds`
3. **UI config actions** — Sélecteurs dans ModuleConfigPanel
4. **Validateur** — Fonction `isModuleConfigComplete(moduleId, projectType)`
5. **Simulation ActionOrder** — Prévisualisation sans exécution
6. **Branchement V2→V1** — `executeActionOrder(order)` sous feature flag

