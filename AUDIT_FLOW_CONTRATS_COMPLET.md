# 🔍 AUDIT TECHNIQUE COMPLET - FLOW CONTRATS

**Date** : 15 janvier 2026  
**Auditeur** : Claude (Développeur VS Code)  
**Statut** : ⚠️ OBSERVATION UNIQUEMENT - AUCUNE MODIFICATION

---

## 📋 SOMMAIRE

1. [Création du contrat](#1-création-du-contrat)
2. [Génération automatique du formulaire](#2-génération-automatique-du-formulaire)
3. [Association au workflow](#3-association-au-workflow)
4. [Soumission côté client](#4-soumission-côté-client)
5. [Génération du PDF](#5-génération-du-pdf)
6. [Schéma du flux complet](#6-schéma-du-flux-complet)

---

## 1️⃣ CRÉATION DU CONTRAT

### 📂 Fichiers impliqués

| Fichier | Rôle |
|---------|------|
| `src/pages/admin/ContractTemplatesPage.jsx` | Interface principale de création/édition de templates |
| `src/pages/admin/ContractTemplateEditorPage.jsx` | Éditeur visuel (mode PDF) avec ReactQuill |
| `src/constants/contractVariables.js` | Définition centralisée des variables disponibles |
| `src/hooks/useSupabaseContractTemplates.js` | Hook CRUD pour templates (Supabase) |

### 🔧 Fonctions clés

#### `ContractTemplatesPage.jsx`

```javascript
// Ligne 826-881: handleSaveContractTemplate
const handleSaveContractTemplate = async (templateToSave) => {
  const isNew = !templateToSave.id;
  
  // 🔥 Nettoie les balises conditionnelles {{#if_xxx}} hors des <p>
  const cleanedHtml = cleanConditionalTags(templateToSave.contentHtml);
  
  const result = isNew 
    ? await createTemplate({
        name: templateToSave.name,
        projectType: templateToSave.projectType || 'ACC',
        contentHtml: cleanedHtml || '',
      })
    : await updateTemplate(templateToSave.id, {
        name: templateToSave.name,
        projectType: templateToSave.projectType,
        contentHtml: cleanedHtml,
      });
}
```

```javascript
// Ligne 746-823: cleanConditionalTags
// Nettoie AGRESSIVEMENT les balises conditionnelles
// Ex: <p>{{#if_company}}</p> → {{#if_company}}
// Support: if_individual, if_company, if_cosigner_1/2/3
```

### 📊 Structure des données

**Table Supabase : `contract_templates`**

```sql
{
  id: UUID,
  name: TEXT,                    -- Ex: "Contrat ACC Standard"
  project_type: TEXT,            -- Ex: "ACC", "centrale-3-500-kwc", null (universel)
  content_html: TEXT,            -- HTML brut avec variables {{xxx}}
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP,
  is_active: BOOLEAN,
  organization_id: UUID          -- Multi-tenant
}
```

### 🎨 Variables supportées

**Source** : `src/constants/contractVariables.js` (205 lignes)

```javascript
export const CONTRACT_VARIABLES = {
  // CLIENT (Particulier)
  'client_firstname': { label: 'Prénom du client', type: 'text', required: true },
  'client_lastname': { label: 'Nom du client', type: 'text', required: true },
  'client_email': { label: 'Email du client', type: 'email' },
  'client_phone': { label: 'Téléphone du client', type: 'phone' },
  
  // SOCIÉTÉ
  'company_name': { label: 'Nom de la société', type: 'text', required: true },
  'company_siret': { label: 'Numéro SIRET', type: 'text', placeholder: '123 456 789 00012' },
  
  // CO-SIGNATAIRES (1, 2, 3)
  'cosigner_name_1': { label: 'Nom du co-signataire 1', type: 'text' },
  'cosigner_email_1': { label: 'Email co-signataire 1', type: 'email' },
  // ... idem pour _2 et _3
  
  // PROJET / DATES
  'contract_date': { label: 'Date du contrat', type: 'text' },
  'contract_place': { label: 'Lieu du contrat', type: 'text' },
  // ... etc (205 lignes au total)
}
```

### 🧱 Ordre du flow

1. **Admin ouvre** `/admin/contract-templates`
2. **Clique** "Créer un template"
3. **Choisit mode** :
   - **Manuel** : Textarea HTML direct
   - **PDF** : Upload PDF → Placement blocs (non utilisé actuellement)
4. **Rédige** le HTML avec variables `{{xxx}}` et conditions `{{#if_xxx}}`
5. **Sauvegarde** → `cleanConditionalTags()` → Supabase `contract_templates`

---

## 2️⃣ GÉNÉRATION AUTOMATIQUE DU FORMULAIRE

### 📂 Fichiers impliqués

| Fichier | Rôle |
|---------|------|
| `src/pages/admin/ContractTemplatesPage.jsx` | Extraction variables + génération champs |
| `src/pages/admin/FormsManagementPage.jsx` | Récupération formulaire pré-rempli |
| `src/hooks/useSupabaseForms.js` | CRUD formulaires (Supabase) |

### 🔧 Fonctions clés

#### `ContractTemplatesPage.jsx`

```javascript
// Ligne 306-319: extractVariablesFromTemplate
const extractVariablesFromTemplate = (htmlContent) => {
  if (!htmlContent) return [];
  
  const regex = /\{\{([^}#/]+)\}\}/g;  // Capture {{xxx}} mais pas {{#if_xxx}}
  const variables = new Set();
  let match;
  
  while ((match = regex.exec(htmlContent)) !== null) {
    const varName = match[1].trim();
    variables.add(varName);
  }
  
  return Array.from(variables);
};
```

```javascript
// Ligne 321-502: generateFormFieldsFromVariables
const generateFormFieldsFromVariables = (variables, htmlContent) => {
  const fields = [];
  let fieldCounter = 0;
  
  // 1️⃣ DÉTECTION blocs conditionnels
  const hasCompanyBlock = htmlContent.includes('{{#if_company}}');
  const hasIndividualBlock = htmlContent.includes('{{#if_individual}}');
  const hasCosigner1 = variables.some(v => v.startsWith('cosigner_') && v.includes('_1'));
  // ...
  
  // 2️⃣ CATÉGORISATION variables
  const companyVars = variables.filter(v => v.startsWith('company_'));
  const clientVars = variables.filter(v => v.startsWith('client_'));
  const cosignerVars = variables.filter(v => v.startsWith('cosigner_'));
  const otherVars = variables.filter(...);
  
  // 3️⃣ SI template a if_company ET if_individual → Créer champ "Type"
  if (hasCompanyBlock && hasIndividualBlock) {
    fields.push({
      id: `field-type-${Date.now()}`,
      label: 'Type de signataire',
      type: 'select',
      required: true,
      options: ['Particulier', 'Société']
    });
    
    // 3a. Ajouter champs CLIENT avec condition show_if
    clientVars.forEach(varName => {
      fields.push({
        id: `field-${Date.now()}-${fieldCounter++}-${Math.random()}`,
        label: CONTRACT_VARIABLES[varName].label,
        type: CONTRACT_VARIABLES[varName].type,
        show_if_conditions: [{ field: typeFieldId, equals: 'Particulier' }]
      });
    });
    
    // 3b. Ajouter champs SOCIÉTÉ avec condition show_if
    // ...
  }
  
  // 4️⃣ Ajouter champs généraux (dates, projet...)
  otherVars.forEach(...);
  
  // 5️⃣ SI co-signataires détectés → Système de répétition
  if (hasCosigner1 || hasCosigner2 || hasCosigner3) {
    const maxCosigners = hasCosigner3 ? 3 : (hasCosigner2 ? 2 : 1);
    
    fields.push({
      id: `field-cosigner-count-${Date.now()}`,
      label: 'Nombre de co-signataires',
      type: 'select',
      options: ['0', '1', '2', '3'],
      is_repeater: true,
      repeats_fields: [/* IDs des champs répétables */]
    });
    
    // Créer champs répétables (name, email, phone...)
    // Ex: cosigner_name_1/2/3 → 1 seul champ "Nom" qui se répète
  }
  
  return fields;
};
```

```javascript
// Ligne 883-943: handleGenerateForm
const handleGenerateForm = () => {
  // 1. Extraire variables du template
  const variables = extractVariablesFromTemplate(editingContractTemplate.contentHtml);
  
  // 2. Générer champs intelligents
  const formFields = generateFormFieldsFromVariables(variables, editingContractTemplate.contentHtml);
  
  // 3. Créer formulaire pré-rempli
  const prefilledForm = {
    name: `Formulaire - ${editingContractTemplate.name}`,
    fields: formFields,
    projectIds: editingContractTemplate.projectType ? [editingContractTemplate.projectType] : [],
    audience: 'internal' // 🔥 Formulaire interne pour admins
  };
  
  // 4. Rediriger vers FormsManagementPage avec state
  navigate('/admin/forms-management', { 
    state: { prefilledForm }
  });
};
```

#### `FormsManagementPage.jsx`

```javascript
// Ligne 453-652: Composant principal
const FormsManagementPage = () => {
  const location = useLocation();
  
  // Récupération du formulaire pré-rempli depuis navigation
  useEffect(() => {
    if (location.state?.prefilledForm) {
      const form = location.state.prefilledForm;
      
      // Ouvrir directement l'éditeur avec le formulaire
      setEditingForm(form);
      setDialogOpen(true);
      
      toast({
        title: "🎯 Formulaire pré-rempli depuis le template",
        description: `${form.fields.length} champs détectés`,
        className: "bg-blue-500 text-white"
      });
      
      // Nettoyer le state pour éviter réaffichage
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);
};
```

### 📊 Structure des champs générés

**Champ simple :**
```javascript
{
  id: "field-1736950123456-0-abc123",
  label: "Prénom du client",
  type: "text",
  required: true,
  placeholder: "",
  show_if_conditions: []  // Optionnel
}
```

**Champ répéteur (co-signataires) :**
```javascript
{
  id: "field-cosigner-count-1736950123456",
  label: "Nombre de co-signataires",
  type: "select",
  options: ["0", "1", "2", "3"],
  is_repeater: true,
  repeats_fields: [
    "field-xxx-name",    // Champ "Nom" qui se répète
    "field-xxx-email",   // Champ "Email" qui se répète
    "field-xxx-phone"    // Champ "Téléphone" qui se répète
  ]
}
```

### 🔍 Vérification du pré-remplissage

**NON**, le formulaire généré est vide. Il contient :
- ✅ La structure des champs (id, label, type)
- ✅ Les conditions d'affichage (`show_if_conditions`)
- ✅ Les options de select
- ❌ AUCUNE donnée pré-remplie (c'est normal, c'est un template vide)

### 💾 Sauvegarde en base

**Table Supabase : `forms`**

```sql
{
  form_id: TEXT,                 -- Ex: "form-1736950123456"
  name: TEXT,                    -- Ex: "Formulaire - Contrat ACC Standard"
  fields: JSONB,                 -- Tableau des champs structurés
  project_ids: TEXT[],           -- Ex: ["ACC"]
  audience: TEXT,                -- "client" ou "internal"
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP,
  organization_id: UUID
}
```

---

## 3️⃣ ASSOCIATION AU WORKFLOW

### 📂 Fichiers impliqués

| Fichier | Rôle |
|---------|------|
| `src/pages/admin/WorkflowsCharlyPage.jsx` | Configuration workflows Charly |
| `src/hooks/useWorkflowExecutor.js` | Exécution actions workflow |
| `src/components/admin/ProspectDetailsAdmin.jsx` | Déclenchement manuel/auto |

### 🔧 Association au workflow

L'association se fait **MANUELLEMENT** dans la page **Workflows (Charly AI)** :

1. **Admin configure** un workflow pour un projet
2. **Ajoute une étape** (ex: "Signature du contrat")
3. **Définit une action** de type `launch_signature`
4. **Sélectionne** :
   - Le template de contrat
   - Le formulaire source des données
   - Le mapping champs → variables

### 📊 Structure configuration workflow

**Table Supabase : `prompts`**

```javascript
{
  id: UUID,
  name: "Workflow ACC",
  project_id: "ACC",
  steps_config: {
    "3": {  // Index de l'étape
      actions: [
        {
          type: "launch_signature",
          templateId: "uuid-du-template",
          cosignersConfig: {
            formId: "form-1736950123456",
            countField: "field-cosigner-count-xxx",  // Champ "Nombre de co-signataires"
            
            // 🔥 Mapping GÉNÉRAL (champs non répétés)
            generalFieldMappings: {
              "field-xxx-firstname": "client_firstname",
              "field-xxx-lastname": "client_lastname",
              "field-xxx-email": "client_email",
              "field-xxx-phone": "client_phone"
            },
            
            // 🔥 Mapping CO-SIGNATAIRES (champs répétés)
            fieldMappings: {
              "field-xxx-name": "cosigner_name",    // Devient cosigner_name_1, _2, _3
              "field-xxx-email": "cosigner_email",
              "field-xxx-phone": "cosigner_phone"
            }
          }
        }
      ]
    }
  }
}
```

### 🔗 Tables / clés utilisées

- **`prompts.steps_config`** : Configuration JSON des étapes
- **`forms.form_id`** : ID du formulaire source
- **`contract_templates.id`** : ID du template à utiliser
- **`prospects.form_data`** : Données soumises par le client
- **`client_form_panels`** : Historique formulaires envoyés

---

## 4️⃣ SOUMISSION CÔTÉ CLIENT

### 📂 Fichiers impliqués

| Fichier | Rôle |
|---------|------|
| `src/components/client/ClientFormPanel.jsx` | Composant de soumission client |
| `src/hooks/useSupabaseProjectFiles.js` | Upload fichiers (Storage) |
| `src/hooks/useSupabaseClientFormPanels.js` | CRUD panneaux formulaires |

### 🔧 Fonction de soumission

#### `ClientFormPanel.jsx`

```javascript
// Ligne 117-400: handleSubmit
const handleSubmit = async (panel) => {
  const { panelId, prospectId, projectType, formId } = panel;
  
  // 1️⃣ Récupérer form_data EXISTANT
  const { data: existingData } = await supabase
    .from('prospects')
    .select('form_data')
    .eq('id', prospectId)
    .single();
  
  const existingFormData = existingData?.form_data || {};
  const existingFieldsData = existingFormData[projectType]?.[formId] || {};
  
  // 2️⃣ UPLOAD fichiers (si champs type "file")
  const formDefinition = forms[formId];
  const fileFields = formDefinition?.fields?.filter(f => f.type === 'file') || [];
  
  for (const field of fileFields) {
    const fileValue = draft[field.id];
    
    if (fileValue instanceof File) {  // Nouveau fichier sélectionné
      // a. Supprimer l'ancien fichier SI existe
      const existingFile = existingFieldsData[field.id];
      if (existingFile?.id && existingFile?.storagePath) {
        await supabase.storage.from('project-files').remove([existingFile.storagePath]);
        await supabase.from('project_files').delete().eq('id', existingFile.id);
      }
      
      // b. Upload nouveau fichier
      const uploadedFile = await uploadFile({
        file: fileValue,
        uploadedBy: currentUser?.id,
        fieldLabel: field.label  // 🔥 Label du champ stocké
      });
      
      // c. Remplacer File par métadonnées
      draft[field.id] = {
        id: uploadedFile.id,
        name: uploadedFile.file_name,
        storagePath: uploadedFile.storage_path,
        fieldLabel: field.label
      };
    }
  }
  
  // 3️⃣ STRUCTURE form_data : projectType > formId > fields
  const currentFormData = currentData?.form_data || {};
  
  const updatedFormData = {
    ...currentFormData,
    [projectType]: {
      ...(currentFormData[projectType] || {}),
      [formId]: draft  // 🔥 Écraser seulement CE formulaire
    }
  };
  
  // 4️⃣ SAUVEGARDER dans Supabase
  await supabase
    .from('prospects')
    .update({ form_data: updatedFormData })
    .eq('id', prospectId);
  
  // 5️⃣ BROADCAST aux admins (real-time)
  const broadcastChannel = supabase.channel('prospects-broadcast-global');
  await broadcastChannel.send({
    type: 'broadcast',
    event: 'prospect-updated',
    payload: transformedProspect
  });
  
  // 6️⃣ Message chat "Formulaire complété"
  addChatMessage(prospectId, projectType, {
    sender: 'client',
    text: `A complété le formulaire : ${formDefinition?.name}`,
    completedFormId: formId
  });
};
```

### 📊 Structure `form_data` sauvegardée

**Table : `prospects.form_data`** (JSONB)

```javascript
{
  "ACC": {  // projectType
    "form-1736950123456": {  // formId
      "field-xxx-firstname": "Eva",
      "field-xxx-lastname": "JONES",
      "field-xxx-email": "eva@example.com",
      "field-xxx-phone": "0612345678",
      
      // 🔥 RÉPÉTEUR : Nombre de co-signataires
      "field-cosigner-count-xxx": "2",
      
      // 🔥 RÉPÉTEUR : Co-signataire 1
      "field-cosigner-count-xxx_repeat_0_field-xxx-name": "Alice MARTIN",
      "field-cosigner-count-xxx_repeat_0_field-xxx-email": "alice@example.com",
      "field-cosigner-count-xxx_repeat_0_field-xxx-phone": "0698765432",
      
      // 🔥 RÉPÉTEUR : Co-signataire 2
      "field-cosigner-count-xxx_repeat_1_field-xxx-name": "Bob DURAND",
      "field-cosigner-count-xxx_repeat_1_field-xxx-email": "bob@example.com",
      "field-cosigner-count-xxx_repeat_1_field-xxx-phone": "0611223344",
      
      // 🔥 FICHIER : Métadonnées (pas le File)
      "field-xxx-kbis": {
        id: "uuid-file",
        name: "kbis.pdf",
        storagePath: "project-files/ACC/uuid-prospect/kbis.pdf",
        fieldLabel: "KBIS de la société"
      }
    }
  },
  
  "centrale-3-500-kwc": {  // Autre projet
    "form-9876543210": { /* ... */ }
  }
}
```

### 🔑 Clés importantes

- **`[projectType]`** : Premier niveau = type de projet
- **`[formId]`** : Deuxième niveau = ID du formulaire
- **`[fieldId]`** : Troisième niveau = ID du champ
- **`_repeat_X_`** : Suffix pour champs répétés (X = index 0, 1, 2...)

---

## 5️⃣ GÉNÉRATION DU PDF

### 📂 Fichiers impliqués

| Fichier | Rôle |
|---------|------|
| `src/lib/contractPdfGenerator.js` | Génération PDF + Upload Storage |
| `src/utils/contractRenderer.js` | Moteur de rendu HTML (variables + conditions) |
| `src/components/admin/ProspectDetailsAdmin.jsx` | Déclenchement depuis fiche prospect |
| `src/hooks/useWorkflowExecutor.js` | Déclenchement automatique workflow |

### 🔧 Route déclenchée

**Déclenchement MANUEL** :
1. Admin ouvre fiche prospect
2. Clique "Générer contrat" dans une étape workflow
3. → Appelle `executeContractSignatureAction()`

**Déclenchement AUTO** :
1. Client complète une étape avec action `launch_signature`
2. → `useWorkflowExecutor.js` détecte l'action
3. → Appelle `executeContractSignatureAction()`

### 🔧 Fonction principale

#### `contractPdfGenerator.js`

```javascript
// Ligne 407-473: executeContractSignatureAction
export async function executeContractSignatureAction({
  templateId,
  projectType,
  prospectId,
  cosigners = [],
  formData = {},  // 🔥 Données générales mappées
  organizationId
}) {
  // 1️⃣ Charger le template
  const { data: template } = await supabase
    .from('contract_templates')
    .select('*')
    .eq('id', templateId)
    .single();
  
  // 2️⃣ Charger le prospect
  const { data: prospect } = await supabase
    .from('prospects')
    .select('*')
    .eq('id', prospectId)
    .single();
  
  // 3️⃣ Générer le PDF (inclut upload automatique)
  const pdfResult = await generateContractPDF({
    templateHtml: template.content_html,
    prospectData: prospect,
    cosigners,        // 🔥 Tableau [{name, email, phone}, ...]
    formData,         // 🔥 Données mappées {client_firstname: "Eva", ...}
    projectType,
    prospectId,
    organizationId
  });
  
  return { success: true, fileData: pdfResult.fileData };
}
```

```javascript
// Ligne 18-176: generateContractPDF
export async function generateContractPDF({
  templateHtml,
  prospectData,
  cosigners = [],
  formData = {},
  projectType,
  prospectId,
  organizationId
}) {
  // 1️⃣ Injecter données dans HTML
  const htmlWithData = injectProspectData(
    templateHtml, 
    prospectData, 
    cosigners, 
    formData
  );
  
  // 2️⃣ Créer conteneur temporaire visible
  tempContainer = document.createElement('div');
  tempContainer.innerHTML = htmlWithData;
  tempContainer.style.cssText = `
    position: absolute;
    width: 794px;
    min-height: 1123px;
    padding: 40px;
    background: white;
    font-family: Arial, sans-serif;
  `;
  document.body.appendChild(tempContainer);
  
  // 3️⃣ Capturer avec html2canvas
  const canvas = await html2canvas(tempContainer, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff'
  });
  
  // 4️⃣ Générer PDF avec jsPDF
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  const imgData = canvas.toDataURL('image/png');
  pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
  
  // 5️⃣ Upload vers Supabase Storage
  const pdfBlob = pdf.output('blob');
  const fileName = `contract-${prospectId}-${Date.now()}.pdf`;
  
  const { data: uploadData, error } = await supabase.storage
    .from('project-files')
    .upload(`contracts/${organizationId}/${fileName}`, pdfBlob);
  
  // 6️⃣ Créer entrée dans project_files
  const { data: fileData } = await supabase
    .from('project_files')
    .insert({
      prospect_id: prospectId,
      project_type: projectType,
      file_name: fileName,
      file_type: 'application/pdf',
      storage_path: uploadData.path,
      file_size: pdfBlob.size,
      uploaded_by: activeAdminUser?.id,
      organization_id: organizationId
    })
    .select()
    .single();
  
  return { success: true, fileData };
}
```

### 🔧 Construction de `contractData`

#### `contractPdfGenerator.js`

```javascript
// Ligne 177-300: injectProspectData
function injectProspectData(html, prospect, cosigners = [], formData = {}) {
  // 1️⃣ Parser adresse du prospect
  const addressParts = (prospect.address || '').split(',');
  const street = addressParts[0] || '';
  const cityZip = addressParts[1] || '';
  const [zipCode, city] = cityZip.match(/(\d{5})\s+(.+)/) || [];
  
  // 2️⃣ Séparer prénom/nom
  const nameParts = (prospect.name || '').split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';
  
  // 3️⃣ PRÉPARER contractData (formData PRIORITAIRE sur prospect)
  const contractData = {
    // CLIENT (formData prioritaire)
    client_firstname: formData.client_firstname || firstName,
    client_lastname: formData.client_lastname || lastName,
    client_email: formData.client_email || prospect.email,
    client_phone: formData.client_phone || prospect.phone,
    client_address: formData.client_address || street,
    client_city: formData.client_city || city,
    client_zip: formData.client_zip || zipCode,
    
    // SOCIÉTÉ
    company_name: formData.company_name || prospect.company_name || '',
    company_siret: formData.company_siret || '',
    
    // DATES
    contract_date: formData.contract_date || new Date().toLocaleDateString('fr-FR'),
    
    // 🔥 FUSIONNER TOUT formData
    ...formData
  };
  
  // 4️⃣ AJOUTER CO-SIGNATAIRES DYNAMIQUEMENT
  cosigners.forEach((cosigner, index) => {
    const num = index + 1;
    
    Object.entries(cosigner).forEach(([varName, value]) => {
      // Ex: name → cosigner_name_1
      contractData[`cosigner_${varName}_${num}`] = value || '';
    });
  });
  
  // 5️⃣ APPELER LE RENDERER
  const renderedHtml = renderContractTemplate(html, contractData);
  
  return renderedHtml;
}
```

### 🔧 Injection dans le template

#### `contractRenderer.js`

```javascript
// Ligne 1-100: renderContractTemplate
export function renderContractTemplate(template, data) {
  let result = template;
  
  // 1️⃣ Traiter blocs conditionnels
  result = processConditionalBlocks(result, data);
  
  // 2️⃣ Remplacer variables simples
  result = replaceVariables(result, data);
  
  return result;
}

function processConditionalBlocks(template, data) {
  const conditions = [
    'if_individual',    // Affiche si client_firstname existe
    'if_company',       // Affiche si company_name existe
    'if_cosigner_1',    // Affiche si cosigner_name_1 existe
    'if_cosigner_2',
    'if_cosigner_3'
  ];
  
  conditions.forEach(condition => {
    const regex = new RegExp(`\\{\\{#${condition}\\}\\}([\\s\\S]*?)\\{\\{\\/${condition}\\}\\}`, 'g');
    
    template = template.replace(regex, (match, blockContent) => {
      const shouldDisplay = evaluateCondition(condition, data);
      return shouldDisplay ? blockContent : '';  // Afficher ou masquer le bloc
    });
  });
  
  return template;
}

function replaceVariables(template, data) {
  let result = template;
  
  // Remplacer {{variable}} par data.variable
  Object.keys(data).forEach(key => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, data[key] || '');
  });
  
  return result;
}
```

### 🔧 Extraction des données du formulaire

#### `ProspectDetailsAdmin.jsx`

```javascript
// Ligne 550-700: Extraction form_data AVANT génération PDF
if (action.cosignersConfig?.formId) {
  // 1️⃣ Charger form_data du prospect
  const { data: prospectData } = await supabase
    .from('prospects')
    .select('form_data')
    .eq('id', prospectId)
    .single();
  
  const formData = prospectData.form_data;
  const projectFormData = formData[projectType] || {};
  const specificFormData = projectFormData[config.formId] || {};
  
  // 2️⃣ Charger définition du formulaire
  const { data: formDefinition } = await supabase
    .from('forms')
    .select('fields')
    .eq('form_id', config.formId)
    .single();
  
  // 3️⃣ Auto-mapping (si pas configuré manuellement)
  const autoGeneralFieldMappings = {};
  formDefinition.fields.forEach(field => {
    const variableName = findVariableByLabel(field.label);
    if (variableName) {
      autoGeneralFieldMappings[field.id] = variableName;
    }
  });
  
  // 4️⃣ Extraction données GÉNÉRALES
  const generalData = {};
  Object.entries(generalFieldMappings).forEach(([fieldId, varName]) => {
    const value = specificFormData[fieldId];
    if (value) {
      generalData[varName] = value;  // Ex: client_firstname = "Eva"
    }
  });
  
  // 5️⃣ Extraction CO-SIGNATAIRES
  const cosignerCount = parseInt(specificFormData[config.countField] || '0', 10);
  const cosignersData = {};
  
  for (let i = 0; i < cosignerCount; i++) {
    const index = i + 1;
    
    Object.entries(config.fieldMappings).forEach(([baseFieldId, variableBase]) => {
      const repeatKey = `${config.countField}_repeat_${i}_${baseFieldId}`;
      const value = specificFormData[repeatKey];
      
      if (value) {
        cosignersData[`${variableBase}_${index}`] = value;
        // Ex: cosigner_name_1 = "Alice MARTIN"
      }
    });
  }
  
  // 6️⃣ FUSIONNER tout
  formGeneralData = {
    ...generalData,
    ...cosignersData
  };
  
  // 7️⃣ CONSTRUIRE tableau cosigners (backward compatibility)
  const cosigners = [];
  for (let i = 0; i < cosignerCount; i++) {
    const cosignerData = {};
    
    Object.entries(config.fieldMappings).forEach(([fieldId, varName]) => {
      const dataKey = `${config.countField}_repeat_${i}_${fieldId}`;
      cosignerData[varName] = specificFormData[dataKey] || '';
    });
    
    cosigners.push(cosignerData);
  }
}

// 8️⃣ PASSER À executeContractSignatureAction
await executeContractSignatureAction({
  templateId: action.templateId,
  projectType,
  prospectId,
  cosigners,           // [{name: "Alice", email: "...", phone: "..."}, ...]
  formData: formGeneralData,  // {client_firstname: "Eva", cosigner_name_1: "Alice", ...}
  organizationId
});
```

### 📊 Transformations des données

**Input (form_data Supabase)** :
```javascript
{
  "ACC": {
    "form-1736950123456": {
      "field-xxx-firstname": "Eva",
      "field-cosigner-count-xxx": "2",
      "field-cosigner-count-xxx_repeat_0_field-xxx-name": "Alice MARTIN",
      "field-cosigner-count-xxx_repeat_1_field-xxx-name": "Bob DURAND"
    }
  }
}
```

**Transformation 1 (formGeneralData)** :
```javascript
{
  client_firstname: "Eva",
  cosigner_name_1: "Alice MARTIN",
  cosigner_name_2: "Bob DURAND"
}
```

**Transformation 2 (cosigners array)** :
```javascript
[
  { name: "Alice MARTIN", email: "alice@...", phone: "06..." },
  { name: "Bob DURAND", email: "bob@...", phone: "06..." }
]
```

**Transformation 3 (contractData final)** :
```javascript
{
  client_firstname: "Eva",
  client_lastname: "JONES",
  client_email: "eva@example.com",
  client_phone: "0612345678",
  cosigner_name_1: "Alice MARTIN",
  cosigner_email_1: "alice@...",
  cosigner_phone_1: "06...",
  cosigner_name_2: "Bob DURAND",
  cosigner_email_2: "bob@...",
  cosigner_phone_2: "06...",
  contract_date: "15/01/2026"
}
```

---

## 6️⃣ SCHÉMA DU FLUX COMPLET

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1️⃣ CRÉATION DU CONTRAT                                              │
├─────────────────────────────────────────────────────────────────────┤
│ Admin ouvre ContractTemplatesPage                                   │
│   ↓                                                                  │
│ Clique "Créer un template"                                          │
│   ↓                                                                  │
│ Rédige HTML avec variables {{client_firstname}}, {{company_name}}   │
│ et blocs {{#if_company}}...{{/if_company}}                          │
│   ↓                                                                  │
│ Sauvegarde → cleanConditionalTags() → Supabase contract_templates   │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 2️⃣ GÉNÉRATION FORMULAIRE                                            │
├─────────────────────────────────────────────────────────────────────┤
│ Admin clique "Générer formulaire" dans ContractTemplatesPage        │
│   ↓                                                                  │
│ extractVariablesFromTemplate() → ["client_firstname", "company..."] │
│   ↓                                                                  │
│ generateFormFieldsFromVariables() → Détecte if_company/if_cosigner  │
│   ↓                                                                  │
│ Crée champs intelligents :                                          │
│  - Champ "Type" (si if_company ET if_individual)                    │
│  - Champs CLIENT avec show_if_conditions                            │
│  - Champs SOCIÉTÉ avec show_if_conditions                           │
│  - Champ répéteur "Nombre de co-signataires" (si cosigner_1/2/3)   │
│   ↓                                                                  │
│ navigate('/admin/forms-management', { prefilledForm })              │
│   ↓                                                                  │
│ FormsManagementPage détecte prefilledForm → Ouvre éditeur          │
│   ↓                                                                  │
│ Admin sauvegarde → Supabase forms                                   │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 3️⃣ ASSOCIATION AU WORKFLOW                                          │
├─────────────────────────────────────────────────────────────────────┤
│ Admin ouvre WorkflowsCharlyPage                                     │
│   ↓                                                                  │
│ Configure étape avec action "launch_signature"                      │
│   ↓                                                                  │
│ Sélectionne :                                                        │
│  - Template de contrat                                              │
│  - Formulaire source (form_id)                                      │
│  - Mapping champs → variables                                       │
│   ↓                                                                  │
│ Sauvegarde → Supabase prompts.steps_config                         │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 4️⃣ SOUMISSION CÔTÉ CLIENT                                           │
├─────────────────────────────────────────────────────────────────────┤
│ Admin envoie formulaire au client (via chat)                        │
│   ↓                                                                  │
│ Supabase client_form_panels.INSERT                                  │
│   ↓                                                                  │
│ Client voit formulaire dans ClientFormPanel                         │
│   ↓                                                                  │
│ Client remplit champs (texte, select, fichiers...)                  │
│   ↓                                                                  │
│ Client clique "Soumettre"                                           │
│   ↓                                                                  │
│ handleSubmit() :                                                     │
│  1. Upload fichiers → Supabase Storage project-files               │
│  2. Structurer form_data : projectType > formId > fields            │
│  3. UPDATE prospects.form_data                                      │
│  4. Broadcast real-time aux admins                                  │
│  5. Ajouter message chat "Formulaire complété"                     │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 5️⃣ GÉNÉRATION DU PDF                                                │
├─────────────────────────────────────────────────────────────────────┤
│ DÉCLENCHEMENT (manuel ou auto) :                                    │
│  - Admin clique "Générer contrat" dans ProspectDetailsAdmin        │
│  - OU workflow auto si étape complétée                             │
│   ↓                                                                  │
│ ProspectDetailsAdmin extrait form_data :                            │
│  1. Charge prospects.form_data[projectType][formId]                │
│  2. Charge forms.fields pour auto-mapping                          │
│  3. Extrait données GÉNÉRALES (client_firstname, company_name...)   │
│  4. Extrait CO-SIGNATAIRES (cosigner_name_1/2/3...)                │
│  5. Fusionne dans formGeneralData                                   │
│   ↓                                                                  │
│ executeContractSignatureAction() :                                   │
│  1. Charge contract_templates (templateHtml)                        │
│  2. Charge prospects (prospectData)                                 │
│  3. Appelle generateContractPDF()                                   │
│   ↓                                                                  │
│ generateContractPDF() :                                             │
│  1. injectProspectData() :                                          │
│     - Fusionne prospect + formData → contractData                   │
│     - Ajoute co-signataires dynamiquement                           │
│     - Appelle renderContractTemplate()                             │
│  2. renderContractTemplate() :                                      │
│     - Traite blocs {{#if_company}}...{{/if_company}}               │
│     - Remplace {{client_firstname}} par contractData.client_first... │
│  3. html2canvas() → Capture HTML en image                          │
│  4. jsPDF → Génère PDF                                             │
│  5. Upload → Supabase Storage project-files/contracts/...          │
│  6. INSERT project_files (métadonnées)                             │
│   ↓                                                                  │
│ Retourne fileData.id pour créer signature_procedures               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📊 TABLEAU RÉCAPITULATIF

### Fichiers clés par étape

| Étape | Fichiers principaux | Rôle |
|-------|---------------------|------|
| **1. Création contrat** | `ContractTemplatesPage.jsx` | UI création + nettoyage HTML |
| | `ContractTemplateEditorPage.jsx` | Éditeur visuel (mode PDF) |
| | `contractVariables.js` | Définition variables centralisées |
| | `useSupabaseContractTemplates.js` | CRUD Supabase |
| **2. Génération formulaire** | `ContractTemplatesPage.jsx` | Extraction variables + génération champs |
| | `FormsManagementPage.jsx` | Récupération pré-remplissage |
| | `useSupabaseForms.js` | CRUD formulaires |
| **3. Association workflow** | `WorkflowsCharlyPage.jsx` | Configuration mapping |
| | `useWorkflowExecutor.js` | Exécution auto |
| **4. Soumission client** | `ClientFormPanel.jsx` | UI + upload fichiers + sauvegarde |
| | `useSupabaseProjectFiles.js` | Upload Storage |
| **5. Génération PDF** | `contractPdfGenerator.js` | Génération PDF + upload |
| | `contractRenderer.js` | Moteur rendu HTML |
| | `ProspectDetailsAdmin.jsx` | Extraction form_data + mapping |

### Fonctions critiques

| Fonction | Fichier | Ligne | Rôle |
|----------|---------|-------|------|
| `cleanConditionalTags` | ContractTemplatesPage.jsx | 746-823 | Nettoie balises {{#if_xxx}} hors <p> |
| `extractVariablesFromTemplate` | ContractTemplatesPage.jsx | 306-319 | Extrait {{xxx}} du HTML |
| `generateFormFieldsFromVariables` | ContractTemplatesPage.jsx | 321-502 | Génère champs intelligents |
| `handleSubmit` | ClientFormPanel.jsx | 117-400 | Soumission client + upload fichiers |
| `executeContractSignatureAction` | contractPdfGenerator.js | 407-473 | Orchestration génération PDF |
| `generateContractPDF` | contractPdfGenerator.js | 18-176 | html2canvas + jsPDF + upload |
| `injectProspectData` | contractPdfGenerator.js | 177-300 | Fusion données + appel renderer |
| `renderContractTemplate` | contractRenderer.js | 14-30 | Blocs conditionnels + variables |

### Structures de données

| Structure | Format | Exemple |
|-----------|--------|---------|
| **contract_templates.content_html** | HTML avec {{xxx}} et {{#if_xxx}} | `<p>{{client_firstname}}</p>{{#if_company}}<p>{{company_name}}</p>{{/if_company}}` |
| **forms.fields** | Array JSONB | `[{id: "field-xxx", label: "Prénom", type: "text", show_if_conditions: [...]}]` |
| **prospects.form_data** | JSONB 3 niveaux | `{projectType: {formId: {fieldId: value}}}` |
| **prompts.steps_config** | JSONB | `{stepIndex: {actions: [{type: "launch_signature", templateId: "...", cosignersConfig: {...}}]}}` |
| **contractData** | Object JS | `{client_firstname: "Eva", cosigner_name_1: "Alice", ...}` |

---

## ✅ CONCLUSION

### Points clés identifiés

1. **Création contrat** : HTML brut avec variables + nettoyage agressif des balises conditionnelles
2. **Génération formulaire** : AUTOMATIQUE avec détection intelligente des blocs if_company/if_individual/if_cosigner
3. **Association workflow** : MANUELLE via WorkflowsCharlyPage avec mapping champs → variables
4. **Soumission client** : Structure `form_data` à 3 niveaux avec upload fichiers + broadcast real-time
5. **Génération PDF** : Extraction form_data → Mapping → Fusion → Rendu HTML → html2canvas → jsPDF → Upload

### Données à chaque étape

| Étape | Données sauvegardées | Format |
|-------|---------------------|--------|
| 1. Création | `contract_templates.content_html` | HTML brut |
| 2. Formulaire | `forms.fields` | JSONB array |
| 3. Workflow | `prompts.steps_config` | JSONB object |
| 4. Soumission | `prospects.form_data` | JSONB 3 niveaux |
| 5. PDF | `project_files` + Storage | Binaire PDF |

### Transformations clés

1. **HTML → Variables** : Regex `/\{\{([^}#/]+)\}\}/g`
2. **Variables → Champs** : Lookup `CONTRACT_VARIABLES[varName]`
3. **form_data → formGeneralData** : Mapping via `cosignersConfig.generalFieldMappings`
4. **formGeneralData + prospect → contractData** : Fusion avec priorité formData
5. **contractData + HTML → PDF** : `renderContractTemplate()` → `html2canvas()` → `jsPDF()`

---

**FIN DE L'AUDIT** ✅  
Aucun code modifié. Retour structuré à Jack.
