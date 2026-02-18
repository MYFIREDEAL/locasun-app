# PROMPT 2: Bridge V2→V1 pour Actions PARTENAIRE (✅ CORRIGÉ)

**Date**: 2025-02-18 (CORRIGÉ après analyse structure réelle)  
**Pré-requis**: Step 1 complété (colonne `is_blocking` ajoutée à `missions`)  
**Objectif**: Ajouter case `PARTENAIRE` dans `executeActionOrderV2.js`

---

## 🚨 CORRECTION CRITIQUE

**Erreur initiale**: Le code proposait d'accéder à `order.partnerId` / `order.partnerInstructions` / `order.isBlocking`, mais ces champs **n'existent PAS** dans l'objet ActionOrder généré par `buildActionOrder()`.

**Structure réelle** (vérifiée dans `actionOrderV2.js` lignes 100-170):

```javascript
// ActionOrder généré
{
  id: 'sim-xxx',
  version: 'v2.0',
  target: 'PARTENAIRE',       // ✅ Existe
  actionType: 'FORM',          // ✅ Existe
  formIds: [...],
  managementMode: 'HUMAN',
  // partnerId: ???            // ❌ N'EXISTE PAS
  // partnerInstructions: ???  // ❌ N'EXISTE PAS
  // isBlocking: ???           // ❌ N'EXISTE PAS
}
```

**Solution**: Les champs partenaire sont dans `actionConfig` (paramètre séparé passé à `executeActionOrder`).

---

## 📋 CONTEXTE

**Fichiers concernés**:
- ✏️ `src/lib/executeActionOrderV2.js` (ajouter case PARTENAIRE)
- ✏️ `src/hooks/useWorkflowExecutor.js` (exporter fonction)
- ⚠️ `src/lib/moduleAIConfig.js` (étendre typedef ActionConfig - FUTUR)

**Contrainte EVATIME**: Workflow V2 doit créer missions partenaire via V1 (comportement identique)

**Architecture découverte**:
```
WorkflowV2ConfigPage → actionConfig { partnerId, instructions, isBlocking }
                              ↓
buildActionOrder() → order { target: 'PARTENAIRE' } + actionConfig séparé
                              ↓
executeActionOrder(order, context) → case 'PARTENAIRE' accède actionConfig
                              ↓
executePartnerTaskAction({ action: { partnerId, ... } })
```

---

## 🔍 ANALYSE PRÉ-IMPLÉMENTATION

### État actuel `executeActionOrder` (ligne 57)

```javascript
export async function executeActionOrder(order, context = {}) {
  // ...
  switch (order.actionType) {
    case 'FORM':
      result = await executeFormAction(order, context);
      break;
      
    case 'SIGNATURE':
      result = await executeSignatureAction(order, context);
      break;
      
    default:
      result = {
        success: false,
        status: 'error',
        message: `Type d'action non supporté: ${order.actionType}`,
      };
  }
  // ...
}
```

**Problème**: Switch sur `order.actionType` (valeurs: 'FORM', 'SIGNATURE')  
**Mais**: Actions partenaire ont `target = 'PARTENAIRE'`, pas `actionType = 'PARTENAIRE'`

**Solution**: Ajouter un check sur `order.target === 'PARTENAIRE'` AVANT le switch actionType

---

## 🎯 MODIFICATIONS REQUISES

### 1. Exporter `executePartnerTaskAction` depuis `useWorkflowExecutor.js`

**Fichier**: `src/hooks/useWorkflowExecutor.js`

**Ligne 372** (fonction interne, pas exportée):

```javascript
// AVANT
async function executePartnerTaskAction({ action, prospectId, projectType }) {
  // ...
}

// APRÈS
export async function executePartnerTaskAction({ action, prospectId, projectType }) {
  // ...
}
```

**Justification**: `executeActionOrderV2.js` doit pouvoir importer cette fonction

---

### 2. Ajouter logique PARTENAIRE dans `executeActionOrderV2.js`

**Fichier**: `src/lib/executeActionOrderV2.js`

#### 2a. Ajouter import (ligne ~25)

```javascript
import { executePartnerTaskAction } from '@/hooks/useWorkflowExecutor';
```

#### 2b. Ajouter case PARTENAIRE (ligne ~143, AVANT le switch actionType)

```javascript
export async function executeActionOrder(order, context = {}) {
  // ... (gardes existantes: feature flag, simulation, validation)
  
  logV2('🚀 executeActionOrder START', { 
    orderId: order.id, 
    actionType: order.actionType,
    target: order.target,
    prospectId: order.prospectId,
  });
  
  try {
    let result;
    
    // ───────────────────────────────────────────────────────────────
    // 🤝 CAS SPÉCIAL: Actions PARTENAIRE
    // ───────────────────────────────────────────────────────────────
    if (order.target === 'PARTENAIRE') {
      // Récupérer actionConfig depuis context (où il doit être passé)
      const actionConfig = context?.actionConfig || {};
      
      // Validation partnerId
      if (!actionConfig.partnerId) {
        logV2('⚠️ executeActionOrder PARTENAIRE sans partnerId', { 
          orderId: order.id,
          moduleId: order.moduleId, 
          prospectId: order.prospectId, 
          projectType: order.projectType 
        });
        
        toast({
          title: "⚠️ Configuration incomplète",
          description: "Aucun partenaire sélectionné pour cette action",
          variant: "destructive",
        });
        
        return {
          success: false,
          status: 'error',
          message: 'partnerId manquant pour action PARTENAIRE',
          data: { orderId: order.id },
        };
      }

      // Bridge V2 → V1: Appeler moteur existant
      await executePartnerTaskAction({
        action: {
          type: 'partner_task',
          partnerId: actionConfig.partnerId,
          partnerInstructions: actionConfig.instructions || '',
          isBlocking: actionConfig.isBlocking !== false,
        },
        prospectId: order.prospectId,
        projectType: order.projectType,
      });

      logV2('✅ executeActionOrder PARTENAIRE mission créée', { 
        orderId: order.id,
        moduleId: order.moduleId, 
        partnerId: actionConfig.partnerId,
        isBlocking: actionConfig.isBlocking,
      });
      
      return {
        success: true,
        status: 'executed',
        message: 'Mission partenaire créée avec succès',
        data: { 
          orderId: order.id, 
          partnerId: actionConfig.partnerId,
          isBlocking: actionConfig.isBlocking !== false,
        },
      };
    }
    
    // ───────────────────────────────────────────────────────────────
    // SWITCH NORMAL: FORM / SIGNATURE
    // ───────────────────────────────────────────────────────────────
    switch (order.actionType) {
      case 'FORM':
        result = await executeFormAction(order, context);
        break;
        
      case 'SIGNATURE':
        result = await executeSignatureAction(order, context);
        break;
        
      default:
        result = {
          success: false,
          status: 'error',
          message: `Type d'action non supporté: ${order.actionType}`,
          data: { orderId: order.id, actionType: order.actionType },
        };
    }
    
    const duration = Date.now() - startTime;
    logV2(`✅ executeActionOrder COMPLETE (${duration}ms)`, result);
    
    return result;
    
  } catch (error) {
    const duration = Date.now() - startTime;
    logV2(`❌ executeActionOrder ERROR (${duration}ms)`, { error: error.message });
    
    return {
      success: false,
      status: 'error',
      message: `Erreur d'exécution: ${error.message}`,
      data: { orderId: order.id, error: error.message },
    };
  }
}
```

**Changements**:
- ✅ Check `order.target === 'PARTENAIRE'` AVANT le switch
- ✅ Accès via `context.actionConfig.partnerId` (pas `order.partnerId`)
- ✅ Validation + toast si `partnerId` manquant
- ✅ Return ExecutionResult structuré (success/status/message/data)
- ✅ Log debug avec `logV2` (pas `logger.debug`)

---

## ⚠️ LIMITATIONS ACTUELLES

### Gap 1: `actionConfig` non passé dans `context`

**Problème**: `executeActionOrder(order, context)` reçoit `context` mais pas `actionConfig`

**Impact**: `context.actionConfig` sera `undefined` → validation échouera

**Solution temporaire**: Le code appelant (ActionOrderSimulator.jsx) doit passer actionConfig dans context:

```javascript
// src/components/admin/workflow-v2/ActionOrderSimulator.jsx
await executeActionOrder(order, {
  organizationId,
  adminUser,
  actionConfig: currentActionConfig, // ← À AJOUTER
});
```

### Gap 2: WorkflowV2ConfigPage n'a pas d'UI pour partnerId/instructions/isBlocking

**Statut actuel**: `ModuleConfigTab.jsx` affiche 'PARTENAIRE' dans targetAudience mais pas de champs dédiés

**Impact**: Impossible de configurer ces champs depuis la WorkflowV2ConfigPage

**Solution**: Step 3 du plan (ajouter UI dans ModuleConfigTab.jsx)

---

## ✅ CHECKLIST PRÉ-COMMIT

- [ ] Aucune modification de logique dans `executePartnerTaskAction`
- [ ] Import `executePartnerTaskAction` au top de `executeActionOrderV2.js`
- [ ] Check `order.target === 'PARTENAIRE'` placé AVANT switch actionType
- [ ] Accès via `context.actionConfig.partnerId` (pas `order.partnerId`)
- [ ] Validation `!actionConfig.partnerId` avant exécution
- [ ] Structure `action` identique à V1 (`type`, `partnerId`, `partnerInstructions`, `isBlocking`)
- [ ] Log avec `logV2` (pas `logger.debug`)
- [ ] Return `ExecutionResult` structuré ({ success, status, message, data })
- [ ] Toast d'erreur si `partnerId` manquant
- [ ] Aucun feature flag ajouté (déjà géré par `executeActionOrder` global)

---

## 🧪 TESTS MANUELS (après application)

### Test 1: V1 inchangé

```bash
# Ouvrir ProspectDetailsAdmin.jsx → Workflow V1
# Créer action "Associée au partenaire" → Sauvegarder
# Déclencher workflow → Vérifier mission créée
# ✅ Comportement identique à avant (V1 non impacté)
```

### Test 2: V2 validation partnerId manquant

```javascript
// Créer ActionOrder avec target='PARTENAIRE' mais sans actionConfig.partnerId
const order = buildActionOrder({ 
  moduleId: 'test', 
  prospectId: 'xxx', 
  actionConfig: { targetAudience: 'PARTENAIRE' } // sans partnerId
});

await executeActionOrder(order, { actionConfig: {} });
// ✅ Doit afficher toast "Configuration incomplète"
// ✅ Doit return { success: false, status: 'error' }
// ✅ Aucune mission créée en DB
```

### Test 3: V2 bridge fonctionnel

```javascript
// Avec partnerId valide
const order = buildActionOrder({ 
  moduleId: 'test', 
  prospectId: 'xxx', 
  actionConfig: { 
    targetAudience: 'PARTENAIRE',
    partnerId: 'uuid-partner',
    instructions: 'Faire visite',
    isBlocking: true
  }
});

await executeActionOrder(order, { 
  actionConfig: {
    partnerId: 'uuid-partner',
    instructions: 'Faire visite',
    isBlocking: true
  }
});
// ✅ Mission créée dans missions table
// ✅ mission.partner_id = 'uuid-partner'
// ✅ mission.description = 'Faire visite'
// ✅ mission.is_blocking = true
// ✅ mission.status = 'pending'
```

---

## 🔄 ROLLBACK

Si problème détecté :

```bash
# Retirer l'export
git diff src/hooks/useWorkflowExecutor.js
# Supprimer le if PARTENAIRE dans executeActionOrderV2.js
git checkout -- src/lib/executeActionOrderV2.js src/hooks/useWorkflowExecutor.js
```

---

## 📝 NOTES

- ✅ Code corrigé basé sur analyse structure réelle ActionOrder
- ✅ Accès via `context.actionConfig` (pas `order` directement)
- ⚠️ Nécessite que ActionOrderSimulator passe actionConfig dans context (Gap 1)
- ⚠️ Nécessite UI pour configurer partnerId/instructions (Gap 2 - Step 3)
- ✅ Respect strict architecture EVATIME (bridge V2→V1, pas de refactor)
- ✅ Conserve comportement V1 identique (executePartnerTaskAction inchangé)

---

## 📚 RÉFÉRENCES

- `ANALYSE_STRUCTURE_ACTION_ORDER_PARTENAIRE.md` — Analyse complète structure
- `actionOrderV2.js` lignes 100-170 — buildActionOrder() structure
- `executeActionOrderV2.js` ligne 57 — Signature executeActionOrder()
- `useWorkflowExecutor.js` ligne 372 — executePartnerTaskAction() structure
- `MIGRATION_PARTENAIRES_V1_TO_V2_ANALYSE.md` ligne 1130 — Proposition initiale
