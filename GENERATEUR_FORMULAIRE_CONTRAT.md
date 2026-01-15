# 🎯 Générateur de Formulaire depuis Template de Contrat

## 📋 Vue d'ensemble

Système permettant de **générer automatiquement un formulaire** à partir des variables détectées dans un template de contrat HTML. L'admin peut ensuite ajuster le formulaire avant de le sauvegarder.

---

## 🔄 Workflow Complet

### **1️⃣ Création du template de contrat**

**Page** : `/admin/contract-templates`

L'admin crée un template avec des variables :

```html
<h1>Contrat {{contract_reference}}</h1>

<p>Entre :</p>
{{#if_company}}
  <p><strong>{{company_name}}</strong> ({{company_legal_form}})</p>
  <p>SIRET : {{company_siret}}</p>
  <p>Capital : {{company_capital}} €</p>
{{/if_company}}

{{#if_individual}}
  <p><strong>{{client_firstname}} {{client_lastname}}</strong></p>
  <p>Email : {{client_email}}</p>
  <p>Téléphone : {{client_phone}}</p>
{{/if_individual}}

{{#if_cosigner_1}}
  <p>Co-signataire 1 : {{cosigner_name_1}}</p>
  <p>Email : {{cosigner_email_1}}</p>
{{/if_cosigner_1}}
```

**Action** : Cliquer sur **"Enregistrer"**

---

### **2️⃣ Génération du formulaire**

**Bouton** : **"🎯 Générer formulaire"** (apparaît après sauvegarde)

**Au clic** :
1. **Extraction automatique** des variables `{{xxx}}`
2. **Génération des champs** avec types intelligents
3. **Redirection** vers `/admin/forms-management` avec formulaire pré-rempli

**Exemple de détection** :

| Variable détectée | Champ généré |
|-------------------|--------------|
| `{{company_name}}` | **Nom de la société** (text, requis) |
| `{{company_legal_form}}` | **Forme juridique** (select: SARL, SAS, SASU...) |
| `{{company_siret}}` | **Numéro SIRET** (text) |
| `{{company_capital}}` | **Capital social (€)** (number) |
| `{{client_firstname}}` | **Prénom du client** (text, requis) |
| `{{client_lastname}}` | **Nom du client** (text, requis) |
| `{{client_email}}` | **Email du client** (email) |
| `{{client_phone}}` | **Téléphone du client** (phone) |
| `{{cosigner_name_1}}` | **Nom du co-signataire 1** (text) |
| `{{cosigner_email_1}}` | **Email co-signataire 1** (email) |

---

### **3️⃣ Ajustement du formulaire**

**Page** : `/admin/forms-management` (ouvert automatiquement)

Le formulaire est **pré-rempli** avec tous les champs détectés.

**L'admin peut** :
- ✅ Ajouter/supprimer des champs
- ✅ Modifier les labels
- ✅ Ajouter des **conditions d'affichage** (ex: afficher "SIRET" seulement si "Type = Société")
- ✅ Configurer des **répétitions** (ex: répéter les champs co-signataire N fois)
- ✅ Changer les types de champs
- ✅ Ajouter des options pour les select

**Exemple d'ajout de condition** :
```
Champ "Nom société" s'affiche SI "Type de signataire" = "Société"
```

---

### **4️⃣ Sauvegarde**

**Action** : Cliquer sur **"Enregistrer le formulaire"**

Le formulaire est sauvegardé dans la table `forms` de Supabase avec :
- `name` : "Formulaire - [Nom du template]"
- `fields` : Tous les champs générés + ajustements
- `projectIds` : Type de projet du template
- `audience` : `'internal'` (formulaire admin)

---

## 🧩 Architecture Technique

### **Fichiers modifiés**

1. **`ContractTemplatesPage.jsx`** (nouvelles fonctions)
   - `extractVariablesFromTemplate()` : Extrait les variables `{{xxx}}`
   - `generateFormFieldsFromVariables()` : Crée les champs avec types intelligents
   - `handleGenerateForm()` : Redirige avec formulaire pré-rempli
   - Bouton "Générer formulaire" (conditionnel, visible après sauvegarde)

2. **`FormsManagementPage.jsx`** (récupération pré-remplissage)
   - `useLocation()` : Récupère le `state` de navigation
   - `useEffect()` : Détecte `prefilledForm` et ouvre l'éditeur
   - Toast de confirmation

---

## 🎨 Mapping Intelligent des Champs

### **Configuration dans `FIELD_CONFIG_MAP`**

```javascript
const FIELD_CONFIG_MAP = {
  // SOCIÉTÉ
  'company_name': { 
    label: 'Nom de la société', 
    type: 'text', 
    required: true 
  },
  'company_legal_form': { 
    label: 'Forme juridique', 
    type: 'select', 
    options: ['SARL', 'SAS', 'SASU', 'SA', 'EURL', 'SCI', 'Auto-entrepreneur', 'Autre'] 
  },
  'company_siret': { 
    label: 'Numéro SIRET', 
    type: 'text', 
    placeholder: '123 456 789 00012' 
  },
  
  // CLIENT
  'client_firstname': { 
    label: 'Prénom du client', 
    type: 'text', 
    required: true 
  },
  'client_email': { 
    label: 'Email du client', 
    type: 'email' 
  },
  
  // CO-SIGNATAIRES
  'cosigner_name_1': { 
    label: 'Nom du co-signataire 1', 
    type: 'text' 
  },
  
  // ... 90+ variables mappées
};
```

### **Types supportés**

- `text` : Champ texte simple
- `email` : Validation email
- `phone` : Numéro de téléphone
- `number` : Chiffres uniquement
- `select` : Liste déroulante avec options prédéfinies

---

## 🔥 Variables Exclues de la Génération

Certaines variables sont **automatiquement exclues** :

```javascript
// Exclusions dans generateFormFieldsFromVariables()
- Variables contenant "signature" (gérées par le système de signature)
- Variables contenant "signature_line" (lignes de signature)
- "current_date" (date auto-générée)
```

**Raison** : Ces variables sont remplies automatiquement par le système, pas besoin de les demander à l'admin.

---

## 📊 Exemple Complet

### **Template créé**

```html
<h1>CONTRAT DE PRESTATION {{contract_reference}}</h1>

<h2>ENTRE LES SOUSSIGNÉS :</h2>

{{#if_company}}
<p><strong>{{company_name}}</strong>, {{company_legal_form}}</p>
<p>Au capital de {{company_capital}} euros</p>
<p>SIRET : {{company_siret}}</p>
<p>Représentée par {{company_representative_name}}, {{company_representative_role}}</p>
{{/if_company}}

{{#if_individual}}
<p><strong>{{client_firstname}} {{client_lastname}}</strong></p>
<p>Né(e) le {{client_birthdate}} à {{client_birthplace}}</p>
<p>Demeurant {{client_address}}, {{client_zip}} {{client_city}}</p>
{{/if_individual}}

<h2>ET</h2>
<p><strong>MY FIRE DEAL SAS</strong></p>

<p>Fait à {{contract_place}}, le {{contract_date}}</p>
```

### **Variables détectées**

```
contract_reference, company_name, company_legal_form, company_capital, 
company_siret, company_representative_name, company_representative_role,
client_firstname, client_lastname, client_birthdate, client_birthplace,
client_address, client_zip, client_city, contract_place, contract_date
```

### **Formulaire généré (17 champs)**

```javascript
[
  { label: 'Référence du contrat', type: 'text', placeholder: 'CTR-2026-001' },
  { label: 'Nom de la société', type: 'text', required: true },
  { label: 'Forme juridique', type: 'select', options: ['SARL', 'SAS'...] },
  { label: 'Capital social (€)', type: 'number', placeholder: '10000' },
  { label: 'Numéro SIRET', type: 'text', placeholder: '123 456 789 00012' },
  { label: 'Nom du représentant légal', type: 'text' },
  { label: 'Fonction du représentant', type: 'text', placeholder: 'Gérant...' },
  { label: 'Prénom du client', type: 'text', required: true },
  { label: 'Nom du client', type: 'text', required: true },
  { label: 'Date de naissance', type: 'text', placeholder: 'JJ/MM/AAAA' },
  { label: 'Lieu de naissance', type: 'text' },
  { label: 'Adresse du client', type: 'text' },
  { label: 'Code postal client', type: 'text', placeholder: '75001' },
  { label: 'Ville du client', type: 'text' },
  { label: 'Lieu du contrat', type: 'text', placeholder: 'Paris, Lyon...' },
  { label: 'Date du contrat', type: 'text', placeholder: 'JJ/MM/AAAA' }
]
```

### **Admin ajuste ensuite**

1. Ajoute un champ **"Type de signataire"** (select: Particulier / Société)
2. Configure les **conditions** :
   - Champs société s'affichent SI "Type de signataire" = "Société"
   - Champs client s'affichent SI "Type de signataire" = "Particulier"
3. **Sauvegarde** le formulaire

---

## ✅ Avantages du Système

1. **Gain de temps** : Plus besoin de recréer manuellement les champs
2. **Cohérence** : Les champs correspondent exactement aux variables du template
3. **Flexibilité** : L'admin peut ajuster avant de sauvegarder
4. **Intelligent** : Types détectés automatiquement (email, phone, number...)
5. **Extensible** : Facile d'ajouter de nouvelles variables dans `FIELD_CONFIG_MAP`

---

## 🚀 Utilisation du Formulaire Généré

Une fois sauvegardé, le formulaire peut être utilisé dans :

1. **Actions de workflow** (Charly AI)
   - Action "Lancer signature" → Sélectionner le formulaire pour collecter les infos
   
2. **Fiche prospect**
   - Affichage automatique du formulaire dans l'onglet "Formulaires"
   
3. **Pré-remplissage avant signature**
   - Les données saisies dans le formulaire sont injectées dans le template
   - Génération du PDF de contrat avec toutes les infos

---

## 📝 Notes Techniques

### **Regex d'extraction**

```javascript
const regex = /\{\{([^}#/]+)\}\}/g;
```

- Capture toutes les variables `{{xxx}}`
- Exclut les balises conditionnelles `{{#if_xxx}}` et `{{/if_xxx}}`

### **Redirection avec state**

```javascript
navigate('/admin/forms-management', { 
  state: { 
    prefilledForm: {
      name: 'Formulaire - Template ACC',
      fields: [...],
      projectIds: ['ACC'],
      audience: 'internal'
    }
  }
});
```

### **Nettoyage du state**

```javascript
window.history.replaceState({}, document.title);
```

Empêche le formulaire de se ré-ouvrir si l'admin rafraîchit la page.

---

## 🔮 Évolutions Possibles

1. **Détection automatique des conditions** : Analyser les blocs `{{#if_company}}` pour créer automatiquement les conditions d'affichage
2. **Détection des répétitions** : Si `cosigner_1`, `cosigner_2`, `cosigner_3` → Créer automatiquement un système de répétition
3. **Validation des données** : Ajouter des règles de validation selon le type de champ
4. **Aperçu du formulaire** : Prévisualiser le formulaire avant de le sauvegarder

---

**Créé le** : 15 janvier 2026  
**Version** : 1.0  
**Fichiers concernés** : `ContractTemplatesPage.jsx`, `FormsManagementPage.jsx`
