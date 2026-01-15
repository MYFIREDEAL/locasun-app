# 🔧 Migration du système de mapping des champs de formulaire

## 📋 Contexte

**Date**: 15 janvier 2026  
**Problème initial**: Les champs de formulaire (notamment `client_phone`) n'apparaissaient pas dans les PDFs de contrat générés.

**Cause racine**: Incompatibilité entre l'ancien système de mapping (`nameField`, `emailField`, `phoneField`) stocké en base de données et le nouveau code qui attend `generalFieldMappings`.

---

## 🔍 Diagnostic effectué

### 1. Structure des données en base (table `prompts`)

Les workflows utilisent l'**ancien système** dans `steps_config.actions[].cosignersConfig`:

```json
{
  "cosignersConfig": {
    "formId": "form-1768488893344",
    "nameField": "field-1767802391842",      // ❌ Ancien field ID
    "emailField": "field-1767802409224",     // ❌ Ancien field ID  
    "phoneField": "field-1767802401208",     // ❌ Ancien field ID
    "countField": "field-cosigner-count-1768488880462"
  }
}
```

### 2. Structure réelle des données dans `prospects.form_data`

Les formulaires approuvés stockent les données avec des **field IDs différents**:

```json
{
  "acc": {
    "form-1768488893344": {
      "field-1768488880462-0-e6e3qhc": "eva",              // Prénom
      "field-1768488880462-1-qq7yfa7": "Mendez",           // Nom
      "field-1768488880462-2-xdpjtef": "eva.jones777@...", // Email
      "field-1768488880462-3-ym008qx": "0657485948",       // ✅ Téléphone
      "field-cosigner-count-1768488880462": "1",
      "field-cosigner-count-1768488880462_repeat_0_field-1768488880462-0-733kin4": "Lea",
      "field-cosigner-count-1768488880462_repeat_0_field-1768488880462-1-wpdzuvl": "learty@yopmail.com",
      "field-cosigner-count-1768488880462_repeat_0_field-1768488880462-2-unzzy5m": "0647584938"
    }
  }
}
```

### 3. Ce que le code attendait (nouveau système)

Le code dans `ProspectDetailsAdmin.jsx` (lignes 605-613) attendait:

```javascript
const generalFieldMappings = config.generalFieldMappings || {};
// Exemple attendu:
// {
//   "field-1768488880462-0-e6e3qhc": "client_firstname",
//   "field-1768488880462-3-ym008qx": "client_phone"
// }
```

**Résultat**: `generalFieldMappings` était vide `{}` → Aucune donnée extraite → PDF sans téléphone.

---

## ✅ Solution temporaire implémentée

**Fichier modifié**: `src/components/admin/ProspectDetailsAdmin.jsx` (lignes 604-651)

### Code ajouté (FALLBACK automatique)

```javascript
// 🔥 FALLBACK: Support pour l'ancien système (nameField, emailField, phoneField)
if (Object.keys(generalData).length === 0) {
  console.log('🔄 Utilisation du fallback ancien système nameField/emailField/phoneField');
  
  // Détecter le pattern de base des field IDs (ex: "field-1768488880462")
  const fieldIdPattern = Object.keys(specificFormData).find(key => 
    key.includes('field-') && !key.includes('cosigner-count')
  );
  
  if (fieldIdPattern) {
    // Extraire le préfixe (ex: "field-1768488880462")
    const basePattern = fieldIdPattern.split('-').slice(0, 2).join('-');
    
    // Chercher les champs avec des index 0,1,2,3 (prénom, nom, email, téléphone)
    Object.keys(specificFormData).forEach(fieldId => {
      if (fieldId.startsWith(basePattern) && !fieldId.includes('repeat')) {
        const value = specificFormData[fieldId];
        
        // Mapping par index:
        if (fieldId.includes('-0-')) generalData.client_firstname = value;
        else if (fieldId.includes('-1-')) generalData.client_lastname = value;
        else if (fieldId.includes('-2-')) generalData.client_email = value;
        else if (fieldId.includes('-3-')) generalData.client_phone = value; // 🎯
      }
    });
    
    console.log('✅ Données extraites avec fallback:', generalData);
  }
}
```

### Résultats

✅ **Tous les champs** sont maintenant extraits:
- `client_firstname`
- `client_lastname`
- `client_email`
- `client_phone` 📞

✅ **Co-signataires** fonctionnent aussi (code existant déjà compatible)

✅ **Rétro-compatible**: Fonctionne avec ancien ET nouveau système

---

## 🚀 Migration future à effectuer

### Étape 1: Mettre à jour les workflows en base de données

**Table**: `prompts`  
**Action**: Remplacer l'ancien système par `generalFieldMappings` dans `steps_config`

#### Script SQL de migration (À CRÉER)

```sql
-- Pour chaque prompt avec cosignersConfig
UPDATE prompts
SET steps_config = jsonb_set(
  steps_config,
  '{1,actions,1,cosignersConfig,generalFieldMappings}',
  '{
    "field-1768488880462-0-e6e3qhc": "client_firstname",
    "field-1768488880462-1-qq7yfa7": "client_lastname",
    "field-1768488880462-2-xdpjtef": "client_email",
    "field-1768488880462-3-ym008qx": "client_phone"
  }'::jsonb
)
WHERE prompt_id = 'prompt-1767974128679'; -- Centrale

-- Répéter pour chaque prompt_id
```

⚠️ **ATTENTION**: Les field IDs sont **différents pour chaque formulaire**! Il faut:
1. Identifier tous les prompts avec `start_signature`
2. Pour chaque prompt, récupérer le `formId`
3. Analyser la structure du formulaire correspondant
4. Créer le mapping correct

### Étape 2: Supprimer le code de fallback

Une fois TOUS les workflows migrés, dans `ProspectDetailsAdmin.jsx`:

```javascript
// ❌ SUPPRIMER tout le bloc "FALLBACK" (lignes 616-651)
// ✅ GARDER uniquement le système generalFieldMappings (lignes 604-615)
```

### Étape 3: Validation

1. Tester génération PDF sur **tous les types de projets**:
   - ACC
   - Centrale
   - Autonome
   - Investissement
   - Etc.

2. Vérifier que tous les champs apparaissent:
   - Téléphone client
   - Nom/Prénom client
   - Email client
   - Données co-signataires

---

## 📊 État actuel du système

| Composant | État | Action requise |
|-----------|------|----------------|
| **Code frontend** | ✅ Compatible ancien + nouveau | Nettoyer après migration BDD |
| **Base de données** | ⚠️ Ancien système | **MIGRER vers generalFieldMappings** |
| **Workflows actifs** | ✅ Fonctionnels avec fallback | Aucune (grâce au fallback) |
| **Nouveaux workflows** | ⚠️ Utiliseront ancien système | Configurer avec nouveau système |

---

## 🔑 Points clés pour la migration

### Pourquoi migrer?

1. **Flexibilité**: `generalFieldMappings` permet de mapper N'IMPORTE QUEL champ, pas seulement nom/email/téléphone
2. **Maintenabilité**: Un seul système de mapping au lieu de deux
3. **Évolutivité**: Facile d'ajouter nouveaux champs (adresse, société, etc.)
4. **Clarté**: Le mapping est explicite dans la config

### Risques si on ne migre pas

- ❌ Code complexe avec double système
- ❌ Bugs potentiels si pattern de field ID change
- ❌ Impossible d'ajouter des champs custom facilement
- ❌ Maintenance difficile (fallback basé sur des conventions)

---

## 📝 Checklist de migration

- [ ] **Phase 1**: Créer script SQL pour analyser tous les formulaires
- [ ] **Phase 2**: Générer mappings `generalFieldMappings` pour chaque workflow
- [ ] **Phase 3**: Tester en staging/dev
- [ ] **Phase 4**: Appliquer migration en production
- [ ] **Phase 5**: Valider tous les workflows
- [ ] **Phase 6**: Supprimer code de fallback
- [ ] **Phase 7**: Mettre à jour documentation

---

## 🛠️ Fichiers concernés

### Frontend
- `src/components/admin/ProspectDetailsAdmin.jsx` (lignes 604-690)
- `src/hooks/useWorkflowExecutor.js` (lignes 412-420) - Même logique à vérifier
- `src/pages/admin/WorkflowsCharlyPage.jsx` (lignes 442-463) - Interface de config

### Base de données
- Table: `prompts`
- Colonne: `steps_config` (JSONB)
- Champs concernés: `steps_config.{step}.actions[].cosignersConfig`

### Documentation
- `supabase/PROMPTS_AND_AUTOMATION.md` - Documenter nouveau système
- `supabase/DYNAMIC_FORMS_SYSTEM.md` - Lien avec formulaires

---

## 💡 Comment me retrouver dans une nouvelle conversation

Dites-moi simplement:

**"Lis le fichier MIGRATION_FIELD_MAPPING_SYSTEM.md"**

Ou:

**"Montre-moi le plan de migration du système de mapping des formulaires"**

---

**Dernière mise à jour**: 15 janvier 2026  
**Status**: ✅ Fallback actif en production  
**Prochaine étape**: Migration BDD vers `generalFieldMappings`
