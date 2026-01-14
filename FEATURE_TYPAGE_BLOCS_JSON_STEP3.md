# 🔖 Feature : Typage Blocs + Paraphe + Génération JSON (Step 3)

## 🎯 Objectif
Ajouter un **système de typage** aux blocs overlay avec **listes fermées** de variables et rôles, puis générer un **JSON structuré** exploitable.

## ✅ Ce qui a été implémenté

### 1. **Types de blocs (liste FERMÉE)**
```javascript
const BLOCK_TYPES = [
  { value: 'text_variable', label: '📝 Variable texte' },
  { value: 'signature', label: '✍️ Signature' },
  { value: 'paraphe', label: '🔖 Paraphe' },
  { value: 'reserve_block', label: '📦 Bloc réservé' }
];
```

**⚠️ Aucun ajout possible** : liste fermée et validée.

### 2. **Variables texte (liste FERMÉE)**

Organisées par catégories :

**CLIENT**
- `{{client_firstname}}` - Prénom client
- `{{client_lastname}}` - Nom client
- `{{client_email}}` - Email client
- `{{client_phone}}` - Téléphone client
- `{{client_address}}` - Adresse client
- `{{client_zip}}` - Code postal client
- `{{client_city}}` - Ville client

**SOCIÉTÉ**
- `{{company_name}}` - Nom société
- `{{company_representative_name}}` - Nom représentant
- `{{company_representative_role}}` - Rôle représentant

**DATES / LIEU**
- `{{contract_date}}` - Date du contrat
- `{{signature_date}}` - Date de signature
- `{{contract_place}}` - Lieu du contrat

**RÉFÉRENCE / MONTANT**
- `{{contract_reference}}` - Référence contrat
- `{{contract_amount}}` - Montant contrat

**CO-SIGNATAIRES**
- `{{cosigner_label_X}}` - Label co-signataire X
- `{{cosigner_name_X}}` - Nom co-signataire X
- `{{cosigner_email_X}}` - Email co-signataire X
- `{{cosigner_phone_X}}` - Téléphone co-signataire X
- `{{cosigner_section_X}}` - Section co-signataire X
- `{{cosigner_signature_line_X}}` - Ligne signature co-signataire X

**⚠️ Aucun champ libre** : sélection uniquement depuis la liste.

### 3. **Rôles pour signatures/paraphes (liste FERMÉE)**
```javascript
const SIGNATURE_ROLES = [
  { value: 'client', label: 'Client' },
  { value: 'company', label: 'Société' },
  { value: 'cosigner_1', label: 'Co-signataire 1' },
  { value: 'cosigner_2', label: 'Co-signataire 2' },
  { value: 'cosigner_3', label: 'Co-signataire 3' }
];
```

**⚠️ Aucun ajout possible** : liste fermée.

### 4. **Nouvelle modal de configuration**

Lors de l'ajout d'un bloc, une modal s'ouvre :

**Étape 1 : Sélection du type**
- Dropdown avec les 4 types de blocs
- Icônes visuelles pour chaque type

**Étape 2 : Configuration selon type**

**Si `text_variable` :**
- Dropdown avec toutes les variables (groupées par catégorie)
- Validation : variable obligatoire

**Si `signature` ou `paraphe` :**
- Dropdown avec les rôles
- Validation : rôle obligatoire

**Si `reserve_block` :**
- Aucune configuration supplémentaire
- Message informatif

### 5. **Structure des blocs enrichie**
```javascript
{
  id: 'block-1705228800000',
  type: 'text_variable',           // Type de bloc
  variable: '{{client_firstname}}', // Si text_variable
  role: null,                       // Si signature/paraphe
  page: 1,                          // Numéro de page
  x: 150,                           // Position X
  y: 200,                           // Position Y
  width: 250,                       // Largeur
  height: 120                       // Hauteur
}
```

### 6. **Génération JSON structuré**

**Fonction `handleGenerateJson()` :**
```javascript
const jsonData = overlayBlocks.map(block => {
  const obj = {
    type: block.type,
    page: block.page,
    x: block.x,
    y: block.y,
    width: block.width,
    height: block.height
  };

  if (block.type === 'text_variable' && block.variable) {
    obj.variable = block.variable;
  }

  if ((block.type === 'signature' || block.type === 'paraphe') && block.role) {
    obj.role = block.role;
  }

  return obj;
});
```

**Exemple de JSON généré :**
```json
[
  {
    "type": "text_variable",
    "variable": "{{client_firstname}}",
    "page": 1,
    "x": 120,
    "y": 340,
    "width": 200,
    "height": 24
  },
  {
    "type": "text_variable",
    "variable": "{{client_email}}",
    "page": 1,
    "x": 120,
    "y": 380,
    "width": 250,
    "height": 24
  },
  {
    "type": "signature",
    "role": "client",
    "page": 1,
    "x": 150,
    "y": 650,
    "width": 200,
    "height": 80
  },
  {
    "type": "paraphe",
    "role": "company",
    "page": 1,
    "x": 500,
    "y": 200,
    "width": 60,
    "height": 40
  },
  {
    "type": "reserve_block",
    "page": 1,
    "x": 50,
    "y": 500,
    "width": 150,
    "height": 100
  }
]
```

### 7. **Interface utilisateur enrichie**

**Affichage des blocs sur PDF :**
- Label du type centré en haut du bloc (📝, ✍️, 🔖, 📦)
- Icônes déplacement/suppression/resize inchangées

**Bouton "Générer JSON" :**
- Visible uniquement si blocs > 0
- Dans la barre d'info (à côté du compteur)
- Bouton vert avec icône 📋

**Zone d'affichage JSON :**
- Fond noir (style terminal)
- Texte vert (style code)
- Bouton "Copier" pour clipboard
- Scroll si JSON trop long
- Formatage indenté (2 espaces)

## 🔧 Détails techniques

### Validation stricte
```javascript
// text_variable DOIT avoir une variable
if (blockType === 'text_variable' && !selectedVariable) {
  toast({ title: "❌ Erreur", description: "Variable obligatoire" });
  return;
}

// signature/paraphe DOIT avoir un rôle
if ((blockType === 'signature' || blockType === 'paraphe') && !selectedRole) {
  toast({ title: "❌ Erreur", description: "Rôle obligatoire" });
  return;
}
```

### Workflow d'ajout
```
1. Clic "Ajouter un bloc"
   ↓
2. Modal configuration s'ouvre
   ↓
3. Sélection type
   ↓
4. Configuration (selon type)
   ↓
5. Validation
   ↓
6. Création du bloc sur PDF
   ↓
7. Bloc positionné et déplaçable
```

### Génération JSON
```
1. Clic "Générer JSON"
   ↓
2. Parcours de tous les blocs
   ↓
3. Extraction type + coordonnées
   ↓
4. Ajout variable/role si applicable
   ↓
5. Formatage JSON
   ↓
6. Affichage + copie clipboard
```

## ⚠️ Interdictions respectées

✅ **Aucune génération HTML** (juste JSON)  
✅ **Aucune injection dans textarea** (pas de modification du formulaire)  
✅ **Aucune modification moteur HTML**  
✅ **Aucune modification formulaire existant**  
✅ **Aucune logique juridique** (paraphe = simple bloc visuel)  
✅ **Listes fermées strictes** (aucun champ libre)  

## 📦 Fichiers modifiés

### `/src/pages/admin/ContractTemplatesPage.jsx`
**Ajouts :**
- 3 constantes : `BLOCK_TYPES`, `TEXT_VARIABLES`, `SIGNATURE_ROLES`
- Composant `BlockConfigForm` (modal de configuration)
- 3 états : `isBlockConfigOpen`, `blockConfigData`, `generatedJson`
- Fonction `handleSaveBlockConfig` (sauvegarde bloc configuré)
- Fonction `handleGenerateJson` (génération JSON)
- Modification `handleAddBlock` (ouvre modal au lieu de créer directement)
- Modal de configuration complète
- Affichage JSON avec bouton copier
- Label type sur chaque bloc

**Statistiques :**
- Lignes ajoutées : **~250**
- Lignes modifiées : **~20**
- Aucune suppression

## 🚀 Workflow utilisateur complet

### Scénario : Créer un contrat avec 3 blocs

**1. Ajouter un bloc "Prénom client"**
```
Clic "Ajouter un bloc"
→ Modal s'ouvre
→ Type : "📝 Variable texte"
→ Variable : "Prénom client" ({{client_firstname}})
→ Clic "Créer le bloc"
→ Bloc apparaît sur PDF avec label "📝"
→ Déplacer en (120, 340)
→ Redimensionner à 200x24
```

**2. Ajouter un bloc "Signature client"**
```
Clic "Ajouter un bloc"
→ Type : "✍️ Signature"
→ Rôle : "Client"
→ Créer
→ Déplacer en (150, 650)
→ Redimensionner à 200x80
```

**3. Ajouter un bloc "Paraphe société"**
```
Clic "Ajouter un bloc"
→ Type : "🔖 Paraphe"
→ Rôle : "Société"
→ Créer
→ Déplacer en (500, 200)
→ Redimensionner à 60x40
```

**4. Générer le JSON**
```
Clic "📋 Générer JSON"
→ Zone JSON apparaît
→ JSON formaté avec 3 blocs
→ Clic "Copier"
→ Toast "✅ Copié !"
```

**Résultat :**
```json
[
  {
    "type": "text_variable",
    "variable": "{{client_firstname}}",
    "page": 1,
    "x": 120,
    "y": 340,
    "width": 200,
    "height": 24
  },
  {
    "type": "signature",
    "role": "client",
    "page": 1,
    "x": 150,
    "y": 650,
    "width": 200,
    "height": 80
  },
  {
    "type": "paraphe",
    "role": "company",
    "page": 1,
    "x": 500,
    "y": 200,
    "width": 60,
    "height": 40
  }
]
```

## 🧪 Tests effectués

✅ Build production (`npm run build`) : OK  
✅ Aucune erreur ESLint  
✅ Aucune erreur TypeScript  
✅ Aucun warning bloquant  

## 📊 Tests manuels recommandés

1. **Ouvrir** `/admin/contract-templates`
2. **Créer** template (mode PDF)
3. **Uploader** PDF
4. **Cliquer** "Ajouter un bloc"
5. **Vérifier** modal de configuration
6. **Sélectionner** type "Variable texte"
7. **Vérifier** dropdown variables (groupées par catégorie)
8. **Sélectionner** "Prénom client"
9. **Créer** le bloc
10. **Vérifier** :
    - ✓ Bloc apparaît avec label "📝"
    - ✓ Toast "Bloc ajouté"
11. **Ajouter** un bloc "Signature" (rôle Client)
12. **Ajouter** un bloc "Paraphe" (rôle Société)
13. **Ajouter** un bloc "Bloc réservé"
14. **Vérifier** : 4 blocs avec labels différents
15. **Cliquer** "Générer JSON"
16. **Vérifier** :
    - ✓ Zone JSON apparaît
    - ✓ 4 objets dans le tableau
    - ✓ Chaque objet a les bonnes propriétés
    - ✓ Variables/rôles présents selon type
17. **Cliquer** "Copier"
18. **Vérifier** : JSON dans clipboard

## 🔮 Prochaines étapes (Step 4)

- [ ] Convertir le JSON en HTML
- [ ] Mapper les variables aux balises HTML
- [ ] Gérer les zones de signature/paraphe
- [ ] Injecter le HTML dans le textarea (Step 5)

## 📝 Exemples de JSON par type

**Text variable :**
```json
{
  "type": "text_variable",
  "variable": "{{client_email}}",
  "page": 1,
  "x": 120,
  "y": 380,
  "width": 250,
  "height": 24
}
```

**Signature :**
```json
{
  "type": "signature",
  "role": "client",
  "page": 1,
  "x": 150,
  "y": 650,
  "width": 200,
  "height": 80
}
```

**Paraphe :**
```json
{
  "type": "paraphe",
  "role": "cosigner_1",
  "page": 1,
  "x": 450,
  "y": 150,
  "width": 60,
  "height": 40
}
```

**Bloc réservé :**
```json
{
  "type": "reserve_block",
  "page": 1,
  "x": 50,
  "y": 500,
  "width": 150,
  "height": 100
}
```

---

**Développé par** : Claude (EVATIME Team)  
**Date** : 14 janvier 2026  
**Step** : 3/5 (Typage + JSON)  
**Status** : ✅ TERMINÉ
