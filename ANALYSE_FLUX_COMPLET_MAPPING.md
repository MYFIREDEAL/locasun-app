# 🔍 ANALYSE COMPLÈTE DU FLUX DE MAPPING DES CHAMPS

**Date**: 15 janvier 2026  
**Objectif**: Comprendre le flux complet depuis la configuration workflow jusqu'à l'affichage dans le PDF

---

## 📊 VUE D'ENSEMBLE DU FLUX

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. ADMIN CONFIGURE LE WORKFLOW                                     │
│    WorkflowsCharlyPage.jsx                                          │
│    ├─ Sélectionne un formulaire                                    │
│    ├─ Configure generalFieldMappings (champs client/société)       │
│    └─ Configure fieldMappings (champs co-signataires)              │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. SAUVEGARDE EN BASE DE DONNÉES                                   │
│    Table: prompts                                                   │
│    Colonne: steps_config                                            │
│    {                                                                │
│      "cosignersConfig": {                                           │
│        "formId": "form-XXX",                                        │
│        "generalFieldMappings": {                                    │
│          "field-1768488880462-0-e6e3qhc": "client_firstname",      │
│          "field-1768488880462-3-ym008qx": "client_phone"           │
│        },                                                           │
│        "fieldMappings": {                                           │
│          "field-1768488880462-0-733kin4": "name"                   │
│        }                                                            │
│      }                                                              │
│    }                                                                │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. CLIENT REMPLIT LE FORMULAIRE                                    │
│    Prospect.form_data                                               │
│    {                                                                │
│      "centrale-3-500-kwc": {                                        │
│        "form-1768488893344": {                                      │
│          "field-1768488880462-0-e6e3qhc": "Eva",                   │
│          "field-1768488880462-3-ym008qx": "0757485748",            │
│          "field-cosigner-count_repeat_0_field-XXX": "Lea"          │
│        }                                                            │
│      }                                                              │
│    }                                                                │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 4. ADMIN VALIDE → CHARLY DÉCLENCHE "Lancer une signature"         │
│    ProspectDetailsAdmin.jsx (lignes 590-665)                       │
│    ├─ Récupère config.generalFieldMappings                         │
│    ├─ Récupère config.fieldMappings                                │
│    ├─ Extrait les valeurs depuis prospects.form_data               │
│    └─ Crée les objets generalData et cosigners[]                   │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 5. GÉNÉRATION DU PDF                                               │
│    contractPdfGenerator.js                                          │
│    ├─ Fonction: injectProspectData()                               │
│    ├─ Prépare contractData avec:                                   │
│    │  - client_firstname, client_phone, etc.                       │
│    │  - cosigner_name_1, cosigner_email_1, etc.                    │
│    └─ Appelle renderContractTemplate(html, contractData)           │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 6. REMPLACEMENT DES VARIABLES                                      │
│    contractRenderer.js                                              │
│    ├─ Fonction: replaceVariables(template, data)                   │
│    ├─ Regex: /\{\{(\w+)\}\}/g                                      │
│    ├─ Remplace {{client_phone}} → "0757485748"                     │
│    └─ Retourne le HTML final                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔥 PROBLÈME IDENTIFIÉ

### Cas 1: Mapping non configuré (ANCIEN SYSTÈME)

```json
// ❌ Dans prompts.steps_config (ancien système)
{
  "cosignersConfig": {
    "formId": "form-1768488893344",
    "nameField": "field-1767802391842",  // ❌ Field ID ancien/incorrect
    "emailField": "field-1767802409224",
    "phoneField": "field-1767802401208"
  }
}
```

**Résultat**: 
- `generalFieldMappings` est vide ou undefined
- Ligne 605 : `const generalFieldMappings = config.generalFieldMappings || {};` → `{}`
- Ligne 608 : Aucune itération dans `Object.entries(generalFieldMappings)`
- `generalData` reste vide `{}`
- `formData` passé à `executeContractSignatureAction` est vide
- Les variables `{{client_phone}}` ne sont pas remplies dans le PDF

### Cas 2: Mapping configuré mais field IDs incorrects

```json
// ⚠️ Dans prompts.steps_config
{
  "cosignersConfig": {
    "formId": "form-1768488893344",
    "generalFieldMappings": {
      "field-1767802391842": "client_firstname",  // ❌ Ce field ID n'existe pas
      "field-1767802401208": "client_phone"       // ❌ Ce field ID n'existe pas
    }
  }
}

// ✅ Dans prospects.form_data
{
  "centrale-3-500-kwc": {
    "form-1768488893344": {
      "field-1768488880462-0-e6e3qhc": "Eva",        // ✅ Le vrai field ID
      "field-1768488880462-3-ym008qx": "0757485748"  // ✅ Le vrai field ID
    }
  }
}
```

**Résultat**:
- Ligne 609 : `const value = specificFormData[fieldId];` → `undefined`
- Ligne 610 : La condition `if (value)` est fausse
- `generalData` reste vide `{}`
- Les variables ne sont pas remplies dans le PDF

---

## ✅ SOLUTION: Le système est DÉJÀ en place!

### Interface de configuration (WorkflowsCharlyPage.jsx)

**Lignes 340-470** : Interface complète pour mapper les champs

```javascript
// CHAMPS GÉNÉRAUX (client, société, projet)
{generalFields.map(field => {
  const suggestedVar = findVariableByLabel(field.label); // 🔥 Auto-suggestion!
  const currentMapping = action.cosignersConfig?.generalFieldMappings?.[field.id] || suggestedVar;
  
  return (
    <input
      type="text"
      value={currentMapping}
      onChange={(e) => {
        const newMappings = {
          ...(action.cosignersConfig?.generalFieldMappings || {}),
          [field.id]: e.target.value  // 🔥 Sauvegarde: field.id → varName
        };
        handleActionChange('cosignersConfig', {
          ...(action.cosignersConfig || {}),
          generalFieldMappings: newMappings
        });
      }}
    />
  );
})}
```

**Fonctionnalités**:
1. ✅ Détection automatique des champs du formulaire sélectionné
2. ✅ Suggestion intelligente basée sur `CONTRACT_VARIABLES`
3. ✅ Mapping des field IDs RÉELS vers les variables de contrat
4. ✅ Sauvegarde dans `prompts.steps_config.cosignersConfig.generalFieldMappings`

---

## 🎯 CE QU'IL FAUT VÉRIFIER

### 1. Vérifier que le mapping est sauvegardé

```sql
-- Voir la config d'un workflow spécifique
SELECT 
  p.prompt_id,
  p.name,
  jsonb_pretty(p.steps_config) as config
FROM prompts p
WHERE p.name = 'Charly repeater';
```

**Attendu**:
```json
{
  "cosignersConfig": {
    "formId": "form-1768488893344",
    "generalFieldMappings": {
      "field-1768488880462-0-e6e3qhc": "client_firstname",
      "field-1768488880462-1-qq7yfa7": "client_lastname",
      "field-1768488880462-2-xdpjtef": "client_email",
      "field-1768488880462-3-ym008qx": "client_phone"
    },
    "fieldMappings": {
      "field-1768488880462-0-733kin4": "name",
      "field-1768488880462-1-wpdzuvl": "email",
      "field-1768488880462-2-unzzy5m": "phone"
    }
  }
}
```

### 2. Vérifier que les field IDs correspondent

```sql
-- Comparer les field IDs dans la config et dans les données
WITH config AS (
  SELECT 
    p.steps_config->'cosignersConfig'->'generalFieldMappings' as mappings
  FROM prompts p
  WHERE p.name = 'Charly repeater'
),
real_data AS (
  SELECT 
    jsonb_object_keys(
      pr.form_data->'centrale-3-500-kwc'->'form-1768488893344'
    ) as field_id
  FROM prospects pr
  WHERE pr.email = 'eva.jones777@yopmail.com'
)
SELECT 
  rd.field_id as "Field ID réel",
  EXISTS (SELECT 1 FROM config c WHERE c.mappings ? rd.field_id) as "Dans config?"
FROM real_data rd;
```

### 3. Tester l'extraction dans ProspectDetailsAdmin

**Console logs à vérifier**:
```javascript
// Ligne 615
console.log('📋 Données générales extraites', { generalData });
// Devrait montrer:
// {
//   client_firstname: "Eva",
//   client_lastname: "Longoria",
//   client_email: "eva@yopmail.com",
//   client_phone: "0757485748"
// }

// Ligne 647
console.log('✅ Co-signataires extraits', { count: cosigners.length, cosigners });
// Devrait montrer:
// {
//   count: 1,
//   cosigners: [
//     { name: "Lea", email: "learty@yopmail.com", phone: "0647584938" }
//   ]
// }
```

---

## 🚀 PLAN D'ACTION

### Option A: Migration manuelle (RAPIDE)

1. ✅ L'interface existe déjà dans WorkflowsCharlyPage.jsx
2. ⚠️ L'admin doit ouvrir chaque workflow et configurer les mappings
3. ✅ Sauvegarder → Les field IDs réels seront dans la config
4. ✅ Tester la génération de PDF

**Durée**: 5-10 minutes par workflow

### Option B: Migration automatique (ROBUSTE)

Créer un script de migration qui:
1. Analyse tous les workflows avec `cosignersConfig.formId`
2. Pour chaque workflow:
   - Charge le formulaire réel depuis `forms` table
   - Extrait les field IDs réels
   - Utilise `findVariableByLabel()` pour auto-mapper
   - Met à jour `steps_config` avec les bons mappings
3. Sauvegarde en base de données

**Durée**: 1-2 heures de développement + tests

### Option C: Validation + fallback intelligent

1. ✅ Garder l'interface actuelle
2. Ajouter une validation dans ProspectDetailsAdmin.jsx:
   - Si `generalFieldMappings` est vide/undefined
   - Essayer de détecter automatiquement les champs par leur label
   - Logger un warning pour inciter l'admin à configurer
3. Ajouter un indicateur visuel dans WorkflowsCharlyPage:
   - ⚠️ "Mapping non configuré - Cliquez pour configurer"

---

## 📝 CONCLUSION

**Le système de mapping est COMPLET et FONCTIONNEL** ✅

Le problème n'est PAS un manque de code, mais:
1. ❌ Les workflows existants utilisent l'ancien système (`nameField`, `emailField`)
2. ❌ Les field IDs dans l'ancienne config ne correspondent pas aux field IDs réels

**Solution immédiate**: Utiliser l'interface existante pour re-configurer les workflows avec les bons field IDs.

**Fichiers clés**:
- Configuration: `src/pages/admin/WorkflowsCharlyPage.jsx` (lignes 340-470)
- Extraction: `src/components/admin/ProspectDetailsAdmin.jsx` (lignes 590-665)
- Génération: `src/lib/contractPdfGenerator.js` (lignes 176-280)
- Rendu: `src/utils/contractRenderer.js` (lignes 99-117)

---

**Prochaine action recommandée**: 
1. Vérifier en base de données si les workflows ont déjà `generalFieldMappings` configuré
2. Si non, utiliser l'interface pour configurer
3. Tester avec Eva JONES
