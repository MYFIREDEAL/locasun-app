# 🎯 WORKFLOW COMPLET : Système de génération de contrats PDF

## Architecture du système

```
┌─────────────────────────────────────────────────────────────────────┐
│                      WORKFLOW COMPLET                                │
└─────────────────────────────────────────────────────────────────────┘

ÉTAPE 1: Création du template de contrat (Admin)
   ↓
ÉTAPE 2: Création du formulaire dynamique (Admin)
   ↓
ÉTAPE 3: Configuration du workflow (Admin)
   ↓
ÉTAPE 4: Client remplit le formulaire
   ↓
ÉTAPE 5: Extraction des données (❌ PROBLÈME ICI)
   ↓
ÉTAPE 6: Génération du PDF
```

---

## ÉTAPE 1 : Création du template de contrat

**Où** : Interface admin → Templates de contrats  
**Fichier** : Géré via UI, stocké dans `contract_templates` table

### Template HTML exemple
```html
<h1>CONTRAT MY FIRE DEAL</h1>

<p>Monsieur/Madame {{client_firstname}} {{client_lastname}}</p>
<p>Email: {{client_email}}</p>
<p>Téléphone: {{client_phone}}</p>

{{#if_cosigner_1}}
<h2>Co-signataire 1</h2>
<p>Nom: {{cosigner_name_1}}</p>
<p>Email: {{cosigner_email_1}}</p>
<p>Téléphone: {{cosigner_phone_1}}</p>
{{/if_cosigner_1}}
```

### Variables disponibles
Définies dans `src/constants/contractVariables.js` :

**Client (particulier)** :
- `client_firstname`, `client_lastname`
- `client_email`, `client_phone`
- `client_address`, `client_city`, `client_zip`
- `client_birthdate`, `client_birthplace`

**Société (entreprise)** :
- `company_name`, `company_legal_form`
- `company_siret`, `company_capital`
- `company_address`, `company_city`, `company_zip`

**Co-signataires** :
- `cosigner_name_1`, `cosigner_email_1`, `cosigner_phone_1`
- `cosigner_name_2`, `cosigner_email_2`, `cosigner_phone_2`
- `cosigner_name_3`, `cosigner_email_3`, `cosigner_phone_3`

---

## ÉTAPE 2 : Création du formulaire dynamique

**Où** : Interface admin → Gestion des formulaires  
**Table** : `forms`

### Structure du formulaire dans la DB

```javascript
{
  id: "uuid-xxx",
  form_id: "form-1768488893344",
  name: "Formulaire LOCATION DE TOITURE",
  fields: [
    {
      id: "field-1768488880462-0-e6e3qhc",
      label: "Prénom du client",
      type: "text",
      placeholder: "Jean",
      required: true
    },
    {
      id: "field-1768488880462-1-qq7yfa7",
      label: "Nom du client",
      type: "text",
      placeholder: "Dupont",
      required: true
    },
    {
      id: "field-1768488880462-2-xdpjtef",
      label: "Email du client",
      type: "email",
      placeholder: "jean.dupont@email.com",
      required: true
    },
    {
      id: "field-1768488880462-3-ym008qx",
      label: "Téléphone du client",
      type: "phone",
      placeholder: "0612345678",
      required: true
    },
    {
      id: "field-cosigner-count-1768488880462",
      label: "Nombre de co-signataires",
      type: "number",
      min: 0,
      max: 3
    }
  ],
  project_ids: ["centrale-3-500-kwc"],
  created_at: "2025-01-10T10:00:00Z"
}
```

---

## ÉTAPE 3 : Configuration du workflow

**Où** : Interface admin → Workflows Charly → Workflow "LOCATION DE TOITURE"  
**Table** : `prompts` (colonne `steps_config`)

### Configuration actuelle (❌ PROBLÈME)

```javascript
{
  steps_config: [
    {
      stepName: "Étude Technique et Financière",
      actions: [
        {
          type: "start_signature",
          templateId: "template-centrale-my-fire-deal",
          cosignersConfig: {
            formId: "form-1768488893344",
            countField: "field-cosigner-count-1768488880462",
            
            // ❌ PROBLÈME : Ces deux configs sont VIDES
            generalFieldMappings: {},
            fieldMappings: {}
          }
        }
      ]
    }
  ]
}
```

### Configuration correcte (✅ CE QU'IL DEVRAIT Y AVOIR)

```javascript
{
  steps_config: [
    {
      stepName: "Étude Technique et Financière",
      actions: [
        {
          type: "start_signature",
          templateId: "template-centrale-my-fire-deal",
          cosignersConfig: {
            formId: "form-1768488893344",
            countField: "field-cosigner-count-1768488880462",
            
            // ✅ Mapping des champs généraux (client, société, projet)
            generalFieldMappings: {
              "field-1768488880462-0-e6e3qhc": "client_firstname",
              "field-1768488880462-1-qq7yfa7": "client_lastname",
              "field-1768488880462-2-xdpjtef": "client_email",
              "field-1768488880462-3-ym008qx": "client_phone"
            },
            
            // ✅ Mapping des champs répétables (co-signataires)
            fieldMappings: {
              "field-1768488880462-0-733kin4": "cosigner_name",
              "field-1768488880462-1-wpdzuvl": "cosigner_email",
              "field-1768488880462-2-unzzy5m": "cosigner_phone"
            }
          }
        }
      ]
    }
  ]
}
```

---

## ÉTAPE 4 : Client remplit le formulaire

**Où** : Interface client → Onglet projet → Formulaire reçu via chat  
**Table** : `prospects` (colonne `form_data`)

### Données soumises par Mickael London

```javascript
// Dans prospects.form_data
{
  "centrale-3-500-kwc-copie-1768128637592": {  // Type de projet
    "form-1768488893344": {  // ID du formulaire
      
      // Champs généraux
      "field-1768488880462-0-e6e3qhc": "FRANCKY",
      "field-1768488880462-1-qq7yfa7": "MOULOUD",
      "field-1768488880462-2-xdpjtef": "mickael.london55@yopmail.com",
      "field-1768488880462-3-ym008qx": "0564758473",
      
      // Nombre de co-signataires
      "field-cosigner-count-1768488880462": "0"
    }
  }
}
```

---

## ÉTAPE 5 : Extraction des données (❌ PROBLÈME ICI)

**Fichier** : `src/components/admin/ProspectDetailsAdmin.jsx` (lignes 540-680)

### Code actuel

```javascript
// 1. Récupérer form_data depuis Supabase
const { data: prospectData } = await supabase
  .from('prospects')
  .select('form_data')
  .eq('id', prospectId)
  .single();

const formData = prospectData.form_data;
const config = action.cosignersConfig;

// 2. Accéder aux données du formulaire spécifique
const projectFormData = formData[projectType] || {};
const specificFormData = projectFormData[config.formId] || {};

console.log('specificFormData:', specificFormData);
// ✅ Output:
// {
//   'field-1768488880462-0-e6e3qhc': 'FRANCKY',
//   'field-1768488880462-1-qq7yfa7': 'MOULOUD',
//   'field-1768488880462-3-ym008qx': '0564758473'
// }

// 3. ❌ EXTRACTION AVEC MAPPING (C'EST LÀ QUE ÇA CASSE)
const generalFieldMappings = config.generalFieldMappings || {};
console.log('generalFieldMappings:', generalFieldMappings);
// ❌ Output: {}

const generalData = {};

Object.entries(generalFieldMappings).forEach(([fieldId, varName]) => {
  const value = specificFormData[fieldId];
  if (value) {
    generalData[varName] = value;
  }
});

console.log('generalData:', generalData);
// ❌ Output: {}  (VIDE car generalFieldMappings est vide)

// 4. Passer au générateur
formGeneralData = generalData;  // {}
```

### Logs de debug

```javascript
🔥🔥🔥 DEBUG form_data COMPLET:
  formDataKeys: ['centrale-3-500-kwc-copie-1768128637592']
  projectType: "centrale-3-500-kwc-copie-1768128637592"
  formId: "form-1768488893344"
  configComplet: {
    formId: 'form-1768488893344',
    countField: 'field-cosigner-count-1768488880462'
    // ❌ Pas de generalFieldMappings !
  }

🔥🔥🔥 DEBUG APRÈS extraction:
  specificFormData: {
    'field-1768488880462-0-e6e3qhc': 'FRANCKY',     // ✅ Données présentes
    'field-1768488880462-1-qq7yfa7': 'MOULOUD',
    'field-1768488880462-3-ym008qx': '0564758473'
  }
  
📋 Données générales extraites:
  generalData: {}  // ❌ VIDE !
```

---

## ÉTAPE 6 : Génération du PDF

**Fichier** : `src/lib/contractPdfGenerator.js`

### 6A. Appel du générateur

```javascript
const result = await executeContractSignatureAction({
  templateId: action.templateId,
  prospectId: prospectId,
  projectType: projectType,
  cosigners: [],
  formData: formGeneralData,  // ❌ {} VIDE !
  organizationId: activeAdminUser.organization_id
});
```

### 6B. Fonction injectProspectData

```javascript
function injectProspectData(html, prospect, cosigners = [], formData = {}) {
  // formData = {} ❌
  
  console.log('🔥🔥🔥 AVANT renderContractTemplate', {
    formDataKeys: Object.keys(formData),
    formDataSample: formData
  });
  // Output:
  // formDataKeys: []
  // formDataSample: {}
  
  // Séparer nom du prospect
  const nameParts = (prospect.name || '').split(' ');
  const firstName = nameParts[0] || '';  // "mickael"
  const lastName = nameParts.slice(1).join(' ') || '';  // ""
  
  // Construire contractData
  const contractData = {
    // 🔥 PRIORITÉ : formData PUIS prospect
    client_firstname: formData.client_firstname || firstName,
    // formData.client_firstname = undefined
    // Donc utilise firstName = "mickael"
    // ❌ Au lieu de "FRANCKY"
    
    client_lastname: formData.client_lastname || lastName,
    // formData.client_lastname = undefined
    // lastName = ""
    // ❌ Vide au lieu de "MOULOUD"
    
    client_phone: formData.client_phone || prospect.phone,
    // formData.client_phone = undefined
    // prospect.phone = undefined
    // ❌ Vide au lieu de "0564758473"
    
    client_email: formData.client_email || prospect.email,
    // formData.client_email = undefined
    // prospect.email = "mickael.london55@yopmail.com"
    // ✅ OK (car prospect.email existe)
  };
  
  console.log('sampleValues:', {
    client_firstname: contractData.client_firstname,
    client_phone: contractData.client_phone,
    client_email: contractData.client_email
  });
  // Output:
  // {
  //   client_firstname: 'mickael',  // ❌
  //   client_phone: '',              // ❌
  //   client_email: 'mickael.london55@yopmail.com'  // ✅
  // }
  
  // Remplacer les variables dans le template
  const htmlWithData = renderContractTemplate(templateHtml, contractData);
  
  return htmlWithData;
}
```

### 6C. Rendu final du template

```javascript
// Template original :
<p>Monsieur/Madame {{client_firstname}} {{client_lastname}}</p>
<p>Email: {{client_email}}</p>
<p>Téléphone: {{client_phone}}</p>

// contractData utilisé :
{
  client_firstname: 'mickael',  // ❌
  client_lastname: '',           // ❌
  client_email: 'mickael.london55@yopmail.com',  // ✅
  client_phone: ''               // ❌
}

// Résultat dans le PDF :
<p>Monsieur/Madame mickael </p>  // ❌
<p>Email: mickael.london55@yopmail.com</p>  // ✅
<p>Téléphone: </p>  // ❌
```

---

## RÉSUMÉ DU PROBLÈME

### Données disponibles à chaque étape

| Étape | Données | Status |
|-------|---------|--------|
| Base de données (form_data) | `{ 'field-xxx': 'FRANCKY', ... }` | ✅ OK |
| Extraction (specificFormData) | `{ 'field-xxx': 'FRANCKY', ... }` | ✅ OK |
| Mapping (generalFieldMappings) | `{}` | ❌ VIDE |
| Résultat mapping (generalData) | `{}` | ❌ VIDE |
| Passé au générateur (formData) | `{}` | ❌ VIDE |
| Utilisé dans PDF (contractData) | `{ client_firstname: 'mickael', ... }` | ❌ MAUVAIS |
| Rendu final | "Monsieur/Madame mickael" | ❌ INCORRECT |

### Chaîne de causalité

```
generalFieldMappings vide (ÉTAPE 3)
   ↓
generalData reste vide (ÉTAPE 5B)
   ↓
formData passé au générateur est vide (ÉTAPE 6A)
   ↓
contractData utilise prospect.name au lieu de formData (ÉTAPE 6B)
   ↓
PDF affiche "mickael" au lieu de "FRANCKY MOULOUD" (ÉTAPE 6C)
```

---

## SOLUTIONS POSSIBLES

### Solution 1 : Auto-mapping ⭐ RECOMMANDÉE

**Principe** : Charger automatiquement le formulaire depuis la table `forms`, lire les labels des champs, et mapper automatiquement vers les variables de template.

**Avantages** :
- ✅ Zéro configuration manuelle
- ✅ Fonctionne pour tous les formulaires
- ✅ Mise à jour automatique si le formulaire change

**Code à ajouter** dans `ProspectDetailsAdmin.jsx` :

```javascript
// Charger le formulaire depuis Supabase
const { data: formDefinition } = await supabase
  .from('forms')
  .select('fields')
  .eq('form_id', config.formId)
  .single();

// Construire automatiquement les mappings
const autoGeneralFieldMappings = {};

formDefinition.fields.forEach(field => {
  // Utiliser findVariableByLabel pour mapper le label à une variable
  const variableName = findVariableByLabel(field.label);
  // "Prénom du client" → "client_firstname"
  
  if (variableName) {
    autoGeneralFieldMappings[field.id] = variableName;
  }
});

// Résultat :
// {
//   'field-1768488880462-0-e6e3qhc': 'client_firstname',
//   'field-1768488880462-1-qq7yfa7': 'client_lastname',
//   'field-1768488880462-3-ym008qx': 'client_phone'
// }

// Utiliser les mappings auto OU la config manuelle
const generalFieldMappings = Object.keys(autoGeneralFieldMappings).length > 0
  ? autoGeneralFieldMappings
  : (config.generalFieldMappings || {});
```

### Solution 2 : Configuration manuelle

**Principe** : Aller dans l'interface du workflow et configurer manuellement chaque mapping.

**Avantages** :
- ✅ Contrôle total sur les mappings

**Inconvénients** :
- ❌ Long et répétitif
- ❌ Doit être refait pour chaque formulaire
- ❌ Doit être mis à jour manuellement si le formulaire change

### Solution 3 : Fallback intelligent

**Principe** : Si `generalFieldMappings` est vide, passer directement `specificFormData` au générateur avec une transformation automatique.

**Avantages** :
- ✅ Simple à implémenter

**Inconvénients** :
- ❌ Les noms de variables ne matcheront pas (field-xxx vs client_firstname)
- ❌ Ne fonctionnera qu'avec des conversions hacky

---

## RECOMMANDATION

**👉 Implémenter la Solution 1 (Auto-mapping)**

C'est la seule solution qui :
1. Résout le problème définitivement
2. Ne nécessite aucune action manuelle
3. Fonctionne pour tous les formulaires existants et futurs
4. S'adapte automatiquement aux changements

**Étapes d'implémentation** :
1. Ajouter import de `useSupabaseForms` dans `ProspectDetailsAdmin.jsx`
2. Charger le formulaire depuis la DB
3. Utiliser `findVariableByLabel()` pour mapper les champs
4. Utiliser les mappings auto en priorité, avec fallback sur config manuelle
