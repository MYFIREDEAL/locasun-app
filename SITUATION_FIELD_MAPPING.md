# 🚨 SITUATION ACTUELLE - Système de mapping des champs de formulaire

**Date**: 15 janvier 2026  
**Conversation précédente**: Fix du système de mapping des champs de contrat

---

## 🎯 PROBLÈME PRINCIPAL

Les champs des formulaires approuvés (téléphone, email, etc.) **n'apparaissent PAS dans les PDFs de contrat**.

### Cause racine identifiée

**Incompatibilité entre les field IDs configurés et les field IDs réels dans les données.**

---

## 📊 DONNÉES RÉELLES (Base de données)

### Dans `prospects.form_data` pour Eva JONES:

```json
{
  "centrale-3-500-kwc": {
    "form-1768488893344": {
      "field-1768488880462-0-e6e3qhc": "eva",              // Prénom ✅
      "field-1768488880462-1-qq7yfa7": "Longoria",         // Nom ✅
      "field-1768488880462-2-xdpjtef": "eva@yopmail.com",  // Email ✅
      "field-1768488880462-3-ym008qx": "0757485748",       // Téléphone ✅
      "field-cosigner-count-1768488880462": "1",
      "field-cosigner-count-1768488880462_repeat_0_field-1768488880462-0-733kin4": "Lea",
      "field-cosigner-count-1768488880462_repeat_0_field-1768488880462-1-wpdzuvl": "learty@yopmail.com",
      "field-cosigner-count-1768488880462_repeat_0_field-1768488880462-2-unzzy5m": "0647584938"
    }
  }
}
```

**Pattern des field IDs RÉELS**: `field-1768488880462-{INDEX}-{RANDOM}`

---

## ⚙️ CONFIGURATION ACTUELLE (Base de données)

### Dans `prompts.steps_config` pour le workflow "Centrale":

```json
{
  "cosignersConfig": {
    "formId": "form-1768488893344",
    "nameField": "field-1767802391842",      // ❌ MAUVAIS field ID (ancien)
    "emailField": "field-1767802409224",     // ❌ MAUVAIS field ID (ancien)
    "phoneField": "field-1767802401208",     // ❌ MAUVAIS field ID (ancien)
    "countField": "field-cosigner-count-1768488880462"
  }
}
```

**Le problème**: Ces field IDs (`field-1767802391842`, etc.) **n'existent PAS** dans les données du formulaire!

---

## 💡 SOLUTION À IMPLÉMENTER

### Utiliser le nouveau système `generalFieldMappings`

Le code attend déjà cette structure (ligne 604 de `ProspectDetailsAdmin.jsx`):

```javascript
const generalFieldMappings = config.generalFieldMappings || {};
// Structure attendue:
// {
//   "field-1768488880462-0-e6e3qhc": "client_firstname",
//   "field-1768488880462-1-qq7yfa7": "client_lastname",
//   "field-1768488880462-2-xdpjtef": "client_email",
//   "field-1768488880462-3-ym008qx": "client_phone"
// }
```

### Même chose pour les co-signataires avec `fieldMappings`:

```javascript
const fieldMappings = config.fieldMappings || {};
// Structure attendue:
// {
//   "field-1768488880462-0-733kin4": "name",
//   "field-1768488880462-1-wpdzuvl": "email",
//   "field-1768488880462-2-unzzy5m": "phone"
// }
```

---

## 🔧 ACTIONS À FAIRE

### 1. Mettre à jour la configuration du workflow

**Interface**: `WorkflowsCharlyPage.jsx` - Action "Lancer une signature"

Il faut ajouter une interface pour configurer `generalFieldMappings` et `fieldMappings` avec les **BONS field IDs**.

### 2. Options possibles:

#### Option A: Interface manuelle
- Admin ouvre le workflow
- Pour chaque champ du formulaire, sélectionne la variable de destination
- Exemple: `field-1768488880462-3-ym008qx` → `client_phone`

#### Option B: Auto-détection (RECOMMANDÉ)
- Quand l'admin sélectionne un formulaire dans l'action "Lancer une signature"
- Le système charge automatiquement les champs du formulaire
- Suggère automatiquement le mapping basé sur les labels
- Admin valide ou corrige

#### Option C: Migration automatique
- Script qui lit l'ancien système (`nameField`, `emailField`, etc.)
- Analyse le formulaire réel pour trouver les field IDs corrects
- Crée automatiquement `generalFieldMappings` et `fieldMappings`

---

## 📝 VARIABLES DISPONIBLES

**Fichier**: `src/constants/contractVariables.js`

Toutes les variables utilisables dans les contrats sont définies dans `CONTRACT_VARIABLES`:

- `client_firstname`, `client_lastname`, `client_email`, `client_phone`
- `client_address`, `client_city`, `client_zip`
- `company_name`, `company_siret`, etc.
- `cosigner_name_1`, `cosigner_email_1`, `cosigner_phone_1`
- `cosigner_name_2`, `cosigner_email_2`, `cosigner_phone_2`
- Et bien d'autres...

Le système de mapping doit pointer vers ces noms de variables.

---

## 🚫 CE QUI A ÉTÉ SUPPRIMÉ

J'ai retiré le **fallback codé en dur** qui faisait:
- Index `-0-` → `client_firstname`
- Index `-1-` → `client_lastname`
- Index `-2-` → `client_email`
- Index `-3-` → `client_phone`

**Raison**: Trop limité, ne fonctionne que pour 4 champs fixes, pas flexible pour d'autres champs (adresse, société, etc.).

---

## 🎯 OBJECTIF FINAL

**Workflow "Lancer une signature"** doit permettre de:

1. Sélectionner un formulaire
2. Voir tous les champs du formulaire avec leurs **vrais field IDs**
3. Pour chaque champ, mapper vers une variable de contrat
4. Sauvegarder dans `generalFieldMappings` et `fieldMappings`
5. Le code d'extraction utilisera ces mappings pour remplir le PDF

---

## 📂 FICHIERS CONCERNÉS

- **Configuration workflow**: `src/pages/admin/WorkflowsCharlyPage.jsx`
- **Extraction données**: `src/components/admin/ProspectDetailsAdmin.jsx` (lignes 604-630)
- **Variables disponibles**: `src/constants/contractVariables.js`
- **Base de données**: Table `prompts`, colonne `steps_config`

---

## 🔍 COMMENT DÉBOGUER

### 1. Vérifier les field IDs réels:

```sql
SELECT 
  email,
  jsonb_pretty(form_data) as form_data_formatted
FROM prospects
WHERE email = 'eva.jones777@yopmail.com';
```

### 2. Vérifier la config du workflow:

```sql
SELECT 
  p.prompt_id,
  p.name,
  jsonb_pretty(p.steps_config) as steps_config_formatted
FROM prompts p
WHERE p.steps_config::text LIKE '%templateId%';
```

### 3. Dans la console du navigateur:

Les logs montreront:
- `🔥🔥🔥 DEBUG form_data COMPLET` → Structure complète des données
- `📋 Données générales extraites` → Ce qui a été extrait (sera vide si mapping incorrect)

---

## ✅ PROCHAINES ÉTAPES

1. **Analyser l'interface de configuration** dans `WorkflowsCharlyPage.jsx`
2. **Ajouter l'interface de mapping** pour `generalFieldMappings`
3. **Tester avec un workflow** (créer le bon mapping manuellement si besoin)
4. **Vérifier que le PDF génère correctement** avec les bonnes données
5. **Migrer tous les workflows existants** vers le nouveau système

---

**Pour relancer cette conversation**: Demandez à Copilot de lire `SITUATION_FIELD_MAPPING.md`
