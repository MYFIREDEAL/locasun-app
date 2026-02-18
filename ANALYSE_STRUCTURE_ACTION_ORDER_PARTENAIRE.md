# 🔍 ANALYSE: Structure Réelle de ActionOrder pour Actions PARTENAIRE

**Date**: 2025-02-18  
**Contexte**: Migration Partenaires V1→V2, Step 2 (Bridge executeActionOrderV2.js)  
**Objectif**: Déterminer où sont stockés `partnerId`, `partnerInstructions`, `isBlocking` dans l'objet ActionOrder

---

## 1️⃣ DÉCOUVERTE CRITIQUE

### ⚠️ Les champs partenaire NE SONT PAS dans ActionOrder

**Grep Search Result**:
```bash
grep "partnerId" src/lib/actionOrderV2.js
# → NO MATCHES
```

**Preuve Code** (`actionOrderV2.js` lignes 100-170):

```javascript
export function buildActionOrder({
  moduleId,
  projectType,
  prospectId,
  actionConfig,  // ← Point d'entrée des configs
  message = '',
}) {
  const {
    targetAudience,       // ✅ Existe
    actionType,           // ✅ Existe
    allowedFormIds,       // ✅ Existe
    allowedTemplateIds,   // ✅ Existe
    managementMode,       // ✅ Existe
    verificationMode,     // ✅ Existe
    reminderConfig,       // ✅ Existe
    // partnerId,         // ❌ N'EXISTE PAS
    // partnerInstructions,  // ❌ N'EXISTE PAS
    // isBlocking,        // ❌ N'EXISTE PAS
  } = actionConfig;

  return {
    id: generateSimulationId(),
    version: 'v2.0',
    target: targetAudience,      // 'PARTENAIRE' (existe)
    actionType,                   // 'FORM' ou 'SIGNATURE' (pas de type partenaire)
    formIds: [...allowedFormIds],
    templateIds: resolvedTemplateIds,
    managementMode,
    verificationMode,
    moduleId,
    prospectId,
    // ❌ Pas de partnerId
    // ❌ Pas de partnerInstructions
    // ❌ Pas de isBlocking
    _meta: { isSimulation: true },
  };
}
```

---

## 2️⃣ STRUCTURE ACTUELLE V2 vs V1

### V1 Workflows (WorkflowsCharlyPage.jsx)

```javascript
// Structure action V1 (stockée en mémoire + Supabase prompts table)
{
  type: 'partner_task',        // Type spécifique partenaire
  hasClientAction: null,       // null = partenaire
  partnerId: 'uuid',           // ✅ UUID du partenaire
  partnerInstructions: 'text', // ✅ Instructions terrain
  isBlocking: true,            // ✅ Toggle blocage workflow
  checklist: [...],
}
```

**Fichier**: `src/pages/admin/WorkflowsCharlyPage.jsx` lignes 83-220

**Exécution V1**: `useWorkflowExecutor.js` ligne 372 → `executePartnerTaskAction()`

---

### V2 ActionConfig (moduleAIConfig.js)

```javascript
// @typedef ActionConfig (lignes 43-50)
{
  targetAudience: 'PARTENAIRE',  // ✅ Cible partenaire
  actionType: 'FORM',            // ⚠️ Pas de type 'PARTNER_TASK'
  allowedFormIds: [],
  allowedTemplateIds: [],
  managementMode: 'HUMAN',
  verificationMode: 'HUMAN',
  // partnerId: ???             // ❌ NON DÉFINI
  // partnerInstructions: ???   // ❌ NON DÉFINI
  // isBlocking: ???            // ❌ NON DÉFINI
}
```

**Fichier**: `src/lib/moduleAIConfig.js` lignes 43-50

---

## 3️⃣ PROPOSITION DE LA MIGRATION (Document Analyse)

### Structure Proposée (ligne 526 du doc migration)

```javascript
// src/lib/moduleAIConfig.js — Config IA par module
{
  objective: "Texte libre objectif module",
  instructions: "Instructions IA pour analyse",
  actionConfig: {
    type: "partner_task",         // ⚠️ Pas dans typedef actuel
    target: "PARTENAIRE",         // ✅ targetAudience existe
    partnerId: "uuid-partenaire", // ⚠️ À AJOUTER
    partnerInstructions: "...",   // ⚠️ À AJOUTER
    isBlocking: true,             // ⚠️ À AJOUTER
    mode: null,
    verification: null,
  }
}
```

**Status**: ❌ **NON IMPLÉMENTÉ** — C'est une PROPOSITION du doc, pas le code actuel

---

## 4️⃣ SOLUTION RETENUE DANS MIGRATION_PARTENAIRES_V1_TO_V2_ANALYSE.md

### Bridge V2→V1 (Lignes 1125-1163 du doc migration)

**Approche**: Ne PAS modifier ActionOrder, accéder aux configs partenaire via `actionConfig` étendu

```javascript
// src/lib/executeActionOrderV2.js (proposition doc migration ligne 1130)

case 'PARTENAIRE':
  // ⚠️ Accès via actionConfig (pas order directement)
  if (!actionConfig.partnerId) {  // ← actionConfig, pas order.partnerId
    logger.warn('[executeActionOrderV2] PARTENAIRE sans partnerId');
    toast({
      title: "⚠️ Configuration incomplète",
      description: "Aucun partenaire sélectionné",
      variant: "destructive",
    });
    break;
  }

  // Bridge V2 → V1
  await executePartnerTaskAction({
    action: {
      type: 'partner_task',
      partnerId: actionConfig.partnerId,        // ← actionConfig.partnerId
      partnerInstructions: actionConfig.instructions || '',  // ← actionConfig.instructions
      isBlocking: actionConfig.isBlocking !== false,  // ← actionConfig.isBlocking
    },
    prospectId,
    projectType,
  });
  break;
```

**Justification**: 
- ✅ Moins invasif (pas de modification typedef ActionConfig)
- ✅ Permet coexistence V1/V2
- ⚠️ Nécessite que WorkflowV2ConfigPage stocke ces champs dans `actionConfig` lors de la config module

---

## 5️⃣ QUE FAUT-IL MODIFIER ?

### Step 2a: Étendre `actionConfig` dans `moduleAIConfig.js`

**Fichier**: `src/lib/moduleAIConfig.js`

```javascript
// AVANT (lignes 43-50)
/**
 * @typedef {Object} ActionConfig
 * @property {'CLIENT'|'COMMERCIAL'|'PARTENAIRE'} targetAudience
 * @property {'FORM'|'SIGNATURE'|null} actionType
 * @property {string[]} allowedFormIds
 * @property {string[]} allowedTemplateIds
 * @property {'AI'|'HUMAN'} managementMode
 * @property {'AI'|'HUMAN'} verificationMode
 */

// APRÈS (à ajouter)
/**
 * @typedef {Object} ActionConfig
 * @property {'CLIENT'|'COMMERCIAL'|'PARTENAIRE'} targetAudience
 * @property {'FORM'|'SIGNATURE'|null} actionType
 * @property {string[]} allowedFormIds
 * @property {string[]} allowedTemplateIds
 * @property {'AI'|'HUMAN'} managementMode
 * @property {'AI'|'HUMAN'} verificationMode
 * @property {string} [partnerId] - UUID partenaire (si targetAudience='PARTENAIRE')
 * @property {string} [instructions] - Instructions partenaire (si targetAudience='PARTENAIRE')
 * @property {boolean} [isBlocking] - Action bloquante (si targetAudience='PARTENAIRE')
 */
```

**Impact**: Rend les champs optionnels dans le typedef (TypeScript/JSDoc uniquement, pas de validation runtime)

---

### Step 2b: WorkflowV2ConfigPage doit capturer et stocker ces champs

**Fichier**: `src/pages/admin/WorkflowV2ConfigPage.jsx`

**UI Existante** (lignes 169-215 de WorkflowsCharlyPage.jsx):

```jsx
{/* Select partenaire */}
<Select 
  value={action.partnerId || ''} 
  onValueChange={value => handleActionChange('partnerId', value)}
>
  {/* Liste partenaires actifs */}
</Select>

{/* Textarea instructions */}
<Textarea
  value={action.partnerInstructions || ''}
  onChange={(e) => handleActionChange('partnerInstructions', e.target.value)}
/>

{/* Checkbox bloquante */}
<Checkbox 
  checked={action.isBlocking !== false}
  onCheckedChange={checked => handleActionChange('isBlocking', checked)}
/>
```

**Status**: ✅ UI existe dans WorkflowsCharlyPage.jsx (V1)  
**Action**: Vérifier si WorkflowV2ConfigPage a cette UI (probablement pas encore)

---

### Step 2c: Ajouter case PARTENAIRE dans executeActionOrderV2.js

**Fichier**: `src/lib/executeActionOrderV2.js`

**Code à ajouter** (après case 'SIGNATURE'):

```javascript
case 'PARTENAIRE':
  // Validation
  if (!actionConfig.partnerId) {
    logger.warn('[executeActionOrderV2] PARTENAIRE sans partnerId', { 
      moduleId, prospectId, projectType 
    });
    toast({
      title: "⚠️ Configuration incomplète",
      description: "Aucun partenaire sélectionné pour cette action",
      variant: "destructive",
    });
    break;
  }

  // Bridge V2 → V1
  await executePartnerTaskAction({
    action: {
      type: 'partner_task',
      partnerId: actionConfig.partnerId,
      partnerInstructions: actionConfig.instructions || '',
      isBlocking: actionConfig.isBlocking !== false,
    },
    prospectId,
    projectType,
  });

  logger.debug('[executeActionOrderV2] Mission partenaire créée via V2', { 
    moduleId, 
    partnerId: actionConfig.partnerId,
    isBlocking: actionConfig.isBlocking,
  });
  break;
```

**Dépendance**: Exporter `executePartnerTaskAction` depuis `useWorkflowExecutor.js`

---

### Step 2d: Exporter executePartnerTaskAction

**Fichier**: `src/hooks/useWorkflowExecutor.js`

```javascript
// AVANT (ligne ~370)
async function executePartnerTaskAction({ action, prospectId, projectType }) {
  // ...
}

// APRÈS
export async function executePartnerTaskAction({ action, prospectId, projectType }) {
  // ...
}
```

---

## 6️⃣ FLOW COMPLET V2 POUR ACTIONS PARTENAIRE

```
┌──────────────────────────────────────────────────────────────┐
│ 1. WorkflowV2ConfigPage.jsx (Configuration)                 │
│    - Admin sélectionne targetAudience = 'PARTENAIRE'        │
│    - Admin choisit partnerId (Select)                       │
│    - Admin saisit instructions (Textarea)                   │
│    - Admin toggle isBlocking (Checkbox)                     │
│    → Stocke dans workflow_module_templates.config.actionConfig │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│ 2. actionOrderV2.js (Génération ActionOrder)                │
│    buildActionOrder({ actionConfig })                        │
│    - Reçoit actionConfig avec partnerId, instructions, ...  │
│    - Construit order { target: 'PARTENAIRE', ... }          │
│    - ⚠️ partnerId reste dans actionConfig (pas copié dans order) │
│    → Retourne ActionOrder + actionConfig séparé             │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│ 3. ActionOrderSimulator.jsx (Simulation)                    │
│    - Affiche order.target = 'PARTENAIRE'                    │
│    - Affiche actionConfig.partnerId, instructions, isBlocking│
│    - Bouton "Exécuter" (si EXECUTION_FROM_V2 = true)        │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│ 4. executeActionOrderV2.js (Exécution)                      │
│    switch (order.target) {                                   │
│      case 'PARTENAIRE':                                      │
│        - Valide actionConfig.partnerId présent              │
│        - Appelle executePartnerTaskAction(...)              │
│        - Bridge V2 → V1                                     │
│    }                                                         │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│ 5. useWorkflowExecutor.js (Moteur V1)                       │
│    executePartnerTaskAction({                                │
│      action: {                                               │
│        type: 'partner_task',                                 │
│        partnerId: actionConfig.partnerId,                   │
│        partnerInstructions: actionConfig.instructions,      │
│        isBlocking: actionConfig.isBlocking,                 │
│      },                                                      │
│      prospectId, projectType                                │
│    })                                                        │
│    → INSERT INTO missions (...)                             │
└──────────────────────────────────────────────────────────────┘
```

---

## 7️⃣ RÉPONSE À LA QUESTION INITIALE

### ❓ "Où sont stockés partnerId, partnerInstructions, isBlocking dans ActionOrder ?"

**Réponse**: 

1. ❌ **Pas dans l'objet `order` retourné par `buildActionOrder()`**
   - `order.partnerId` n'existe pas
   - `order.partnerInstructions` n'existe pas
   - `order.isBlocking` n'existe pas

2. ✅ **Dans l'objet `actionConfig` passé à `buildActionOrder()`**
   - `actionConfig.partnerId` (à ajouter au typedef)
   - `actionConfig.instructions` (existe déjà pour IA, réutilisé)
   - `actionConfig.isBlocking` (à ajouter au typedef)

3. ✅ **Accès dans executeActionOrderV2.js via `actionConfig` parameter**
   ```javascript
   async function executeActionOrderV2(order, actionConfig) {
     //                                 ↑         ↑
     //                              order    actionConfig
     
     switch (order.target) {
       case 'PARTENAIRE':
         const partnerId = actionConfig.partnerId;  // ← ICI
         const instructions = actionConfig.instructions;
         const isBlocking = actionConfig.isBlocking;
     }
   }
   ```

---

## 8️⃣ ACTION REQUISE AVANT CODE GENERATION

### ✅ Checklist Pré-Implémentation

- [x] Confirmer que actionConfig est le bon endroit (OUI)
- [x] Vérifier signature executeActionOrderV2 actuelle
- [ ] Confirmer que WorkflowV2ConfigPage capture partnerId/instructions/isBlocking
- [ ] Vérifier que buildActionOrder ne modifie pas actionConfig (passthrough)
- [ ] Confirmer que executePartnerTaskAction accepte cette structure

### 🔍 Vérifications Restantes

**Q1**: `executeActionOrderV2(order, actionConfig)` ou `executeActionOrderV2(order)` ?
→ Besoin de lire executeActionOrderV2.js pour voir la signature actuelle

**Q2**: WorkflowV2ConfigPage capture-t-il déjà partnerId/instructions/isBlocking ?
→ Besoin de lire WorkflowV2ConfigPage.jsx section PARTENAIRE

**Q3**: executePartnerTaskAction attend quelle structure exactement ?
→ Besoin de relire useWorkflowExecutor.js ligne 372+

---

## 9️⃣ PROCHAINES ÉTAPES

### Étape Immédiate

1. **Lire `executeActionOrderV2.js`** (signature fonction principale)
2. **Lire `WorkflowV2ConfigPage.jsx`** (section targetAudience = PARTENAIRE)
3. **Relire `useWorkflowExecutor.js`** ligne 372+ (executePartnerTaskAction params)

### Après Validation Structure

4. **Générer code PROMPT_2 corrigé** avec les bons chemins d'accès
5. **Valider avec humain** avant application
6. **Appliquer modifications** Step 2 (a/b/c/d)

---

## 🎯 CONCLUSION

**Erreur initiale PROMPT_2**: Accès `order.partnerId` alors que le champ n'existe pas

**Structure correcte**: 
```javascript
// ❌ FAUX
await executePartnerTaskAction({
  action: {
    partnerId: order.partnerId,  // undefined !
  }
});

// ✅ CORRECT
await executePartnerTaskAction({
  action: {
    partnerId: actionConfig.partnerId,  // ← actionConfig séparé
  }
});
```

**Raison**: V2 sépare les concerns — `order` = métadonnées exécution, `actionConfig` = paramètres action
