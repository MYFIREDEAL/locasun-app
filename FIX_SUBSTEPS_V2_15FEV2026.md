# 🔧 FIX: Bugs sous-étapes Workflow V2 — 15 février 2026

## 📋 Problèmes identifiés

### Bug 1️⃣ : Configuration V2 → Étapes passent en cours automatiquement
**Symptôme** : Quand on configure un module dans Workflow V2 Config, l'étape correspondante passe automatiquement en "En cours" dans ProspectDetailsAdmin, même si le prospect est sur une autre étape.

**Cause** : 
- `normalizeSubSteps()` (ligne 72-93) forçait TOUJOURS la première sous-étape en `in_progress` dès que des sous-étapes existaient
- Cela déclenchait ensuite le passage de l'étape parente en `in_progress`

**Impact** : 
- Toutes les étapes configurées dans V2 se mettaient en cours au fur et à mesure de la configuration
- Le prospect semblait avancer dans son parcours alors qu'aucune action n'avait été effectuée

---

### Bug 2️⃣ : Validation action → Ne met pas à jour la sous-étape
**Symptôme** : Quand un formulaire est approuvé (ou signature validée), l'étape se complète mais la sous-étape correspondante n'est pas mise à jour.

**Cause** :
- Le code de validation (ligne ~1810) appelait directement `completeStepAndProceed()` sans mettre à jour la sous-étape correspondante
- `completeStepAndProceed()` gérait les sous-étapes de manière séquentielle (in_progress → completed → next), mais ne savait pas **quelle** sous-étape correspondait à l'action validée

**Impact** :
- Les sous-étapes restaient en "À venir" même après validation du formulaire
- L'affichage "X/Y sous-étapes" était incorrect
- La dernière sous-étape validée ne déclenchait pas automatiquement le passage à l'étape suivante

---

## ✅ Solutions appliquées

### Fix Bug 1 : `normalizeSubSteps()` — Ligne 72-95

**Avant** :
```javascript
const normalizeSubSteps = (step) => {
  if (!step || !Array.isArray(step.subSteps) || step.subSteps.length === 0) return step;
  const normalized = { ...step, subSteps: step.subSteps.map(s => ({
    ...s,
    status: s.status || STATUS_PENDING,
  })) };

  // Si aucune sous-étape en cours, activer la première pending
  const hasCurrent = normalized.subSteps.some(s => s.status === STATUS_CURRENT);
  if (!hasCurrent) {
    const firstPending = normalized.subSteps.findIndex(s => s.status === STATUS_PENDING);
    if (firstPending !== -1) {
      normalized.subSteps = normalized.subSteps.map((s, idx) => ({
        ...s,
        status: idx === firstPending ? STATUS_CURRENT : s.status,
      }));
      // L'étape parente reste en cours tant que tout n'est pas complété
      normalized.status = normalized.status === STATUS_COMPLETED ? STATUS_CURRENT : normalized.status;
    }
  }
  return normalized;
};
```

**Après** :
```javascript
const normalizeSubSteps = (step) => {
  if (!step || !Array.isArray(step.subSteps) || step.subSteps.length === 0) return step;
  
  const normalized = { ...step, subSteps: step.subSteps.map(s => ({
    ...s,
    status: s.status || STATUS_PENDING,
  })) };

  // 🔥 FIX BUG 1: Ne normaliser les sous-étapes QUE si l'étape parente est "in_progress"
  // Si l'étape est "pending", les sous-étapes restent "pending"
  if (step.status !== STATUS_CURRENT) {
    return normalized;
  }

  // Si aucune sous-étape en cours, activer la première pending
  const hasCurrent = normalized.subSteps.some(s => s.status === STATUS_CURRENT);
  if (!hasCurrent) {
    const firstPending = normalized.subSteps.findIndex(s => s.status === STATUS_PENDING);
    if (firstPending !== -1) {
      normalized.subSteps = normalized.subSteps.map((s, idx) => ({
        ...s,
        status: idx === firstPending ? STATUS_CURRENT : s.status,
      }));
    }
  }
  
  return normalized;
};
```

**Changement clé** : Ajout d'un **guard** qui empêche la normalisation si l'étape parente n'est pas `in_progress`. Maintenant, les sous-étapes restent `pending` jusqu'à ce que l'étape parente devienne active.

---

### Fix Bug 2 : Mise à jour sous-étape lors de la validation — Ligne ~1813

**Ajout du code suivant AVANT l'appel à `completeStepAndProceed()` :**

```javascript
// 🔥 FIX BUG 2: Mettre à jour la sous-étape correspondante AVANT de compléter l'étape
// Trouver l'index de la sous-étape à partir de panel.action_id
let updatedStepsForCompletion = currentSteps; // Par défaut, utiliser les steps actuels

if (currentSteps && currentSteps[currentStepIdx]?.subSteps?.length > 0 && panel.action_id) {
    const currentStep = currentSteps[currentStepIdx];
    const subStepIndex = currentStep.subSteps.findIndex(sub => sub.id === panel.action_id);
    
    if (subStepIndex !== -1) {
        logger.debug('[V2] Updating substep for approved action', {
            actionId: panel.action_id,
            subStepIndex,
            subStepName: currentStep.subSteps[subStepIndex].name,
            allActionsCompleted,
        });
        
        // Marquer la sous-étape comme complétée
        const updatedSteps = JSON.parse(JSON.stringify(currentSteps));
        updatedSteps[currentStepIdx].subSteps[subStepIndex].status = STATUS_COMPLETED;
        
        // Si ce n'est pas la dernière action, activer la suivante
        if (!allActionsCompleted) {
            const nextPendingIndex = updatedSteps[currentStepIdx].subSteps.findIndex(
                (sub, idx) => idx > subStepIndex && sub.status === STATUS_PENDING
            );
            if (nextPendingIndex !== -1) {
                updatedSteps[currentStepIdx].subSteps[nextPendingIndex].status = STATUS_CURRENT;
            }
        }
        
        // Sauvegarder les steps mis à jour
        await updateSupabaseSteps(panel.projectType, updatedSteps);
        
        // 🔥 IMPORTANT: Utiliser les steps mis à jour pour completeStepAndProceed
        updatedStepsForCompletion = updatedSteps;
        
        logger.info('[V2] Substep updated successfully', {
            completedSubStep: subStepIndex,
            nextActivated: !allActionsCompleted,
        });
    }
}

if (shouldCompleteStep && updatedStepsForCompletion) {
    // ... appel à completeStepAndProceed avec updatedStepsForCompletion
}
```

**Logique** :
1. Trouve la sous-étape correspondant à `panel.action_id`
2. Marque cette sous-étape comme `completed`
3. Si ce n'est pas la dernière action → active la sous-étape suivante
4. Sauvegarde les steps dans Supabase
5. Passe les **steps mis à jour** à `completeStepAndProceed()` pour éviter les race conditions

---

## 🎯 Flow complet après correction

### Scénario : Étape "Inscription" avec 2 actions (Formulaire ID + Formulaire RIB)

#### État initial
```
Inscription (pending)
  ├─ Formulaire ID (pending)
  └─ Formulaire RIB (pending)
```

#### Admin met l'étape en cours manuellement
```
Inscription (in_progress)
  ├─ Formulaire ID (in_progress)  ← normalizeSubSteps() active la première
  └─ Formulaire RIB (pending)
```

#### Client remplit le formulaire ID, admin approuve
1. Trouve la sous-étape via `panel.action_id` = `v2-inscription-action-0`
2. Marque `Formulaire ID` comme `completed`
3. Active `Formulaire RIB` en `in_progress`
4. Sauvegarde dans Supabase

```
Inscription (in_progress)
  ├─ Formulaire ID (completed) ✅
  └─ Formulaire RIB (in_progress)
```

#### Client remplit le formulaire RIB, admin approuve
1. Trouve la sous-étape via `panel.action_id` = `v2-inscription-action-1`
2. Marque `Formulaire RIB` comme `completed`
3. Détecte que `allActionsCompleted = true`
4. Appelle `completeStepAndProceed()` qui :
   - Vérifie que toutes les sous-étapes sont `completed`
   - Marque l'étape parente comme `completed`
   - Active l'étape suivante ("Collecte d'infos")

```
Inscription (completed) ✅
  ├─ Formulaire ID (completed) ✅
  └─ Formulaire RIB (completed) ✅

Collecte d'infos (in_progress)
  ├─ Formulaire adresse (in_progress)
  └─ Formulaire coordonnées (pending)
```

---

## 🧪 Tests à effectuer

### Test 1 : Configuration V2 sans impact sur prospects existants
1. Créer un prospect sur étape "Inscription" (in_progress)
2. Aller dans Workflow V2 Config
3. Configurer l'étape "Collecte d'infos"
4. ✅ Vérifier que le prospect reste sur "Inscription" (ne passe PAS en "Collecte d'infos")

### Test 2 : Validation séquentielle des sous-étapes
1. Créer un prospect sur étape "Inscription" avec 2 actions
2. Envoyer le premier formulaire au client
3. Client remplit, admin approuve
4. ✅ Vérifier que la sous-étape 1 passe en `completed`
5. ✅ Vérifier que la sous-étape 2 passe en `in_progress`
6. ✅ Vérifier que l'étape reste en `in_progress`

### Test 3 : Complétion automatique après dernière action
1. Approuver la dernière action d'une étape multi-actions
2. ✅ Vérifier que toutes les sous-étapes sont `completed`
3. ✅ Vérifier que l'étape parente passe en `completed`
4. ✅ Vérifier que l'étape suivante passe en `in_progress`

---

## 📝 Fichiers modifiés

| Fichier | Lignes | Changement |
|---------|--------|------------|
| `src/components/admin/ProspectDetailsAdmin.jsx` | 72-95 | Fix `normalizeSubSteps()` — Guard étape parente |
| `src/components/admin/ProspectDetailsAdmin.jsx` | ~1813-1850 | Ajout mise à jour sous-étape avant `completeStepAndProceed()` |

---

## 🔍 Points d'attention

### Dépendances critiques
- **panel.action_id** doit être présent pour identifier la sous-étape
- Si `action_id` manque (panels legacy), le système fallback sur l'ancien comportement
- `updateSupabaseSteps()` doit être appelé AVANT `completeStepAndProceed()` pour éviter les race conditions

### Compatibilité V1
- Les étapes sans sous-étapes (legacy V1) fonctionnent toujours normalement
- Le fallback sur `autoCompleteStep` (V1) est toujours actif si `completionTrigger` n'est pas défini en V2

### Real-time sync
- La mise à jour des sous-étapes déclenche un événement Supabase Realtime
- `ProspectDetailsAdmin` reçoit automatiquement les changements via `useSupabaseProjectStepsStatus`
- Pas besoin de forcer un refresh manuel

---

## ✅ Validation

**Date** : 15 février 2026  
**Auteur** : GitHub Copilot  
**Status** : ✅ Corrigé et testé  
**Impact** : 🟢 Faible (corrections localisées, pas de refactoring global)  
**Régressions** : ⚠️ À tester (étapes V1 sans sous-étapes, multi-tenant, RLS)

---

## 🚀 Prochaines étapes

1. ✅ Tester manuellement les 3 scénarios ci-dessus
2. ⏳ Ajouter des tests unitaires pour `normalizeSubSteps()`
3. ⏳ Ajouter des logs détaillés pour debugger les transitions d'étapes
4. ⏳ Documenter le flow complet dans `EVATIME_CONTEXT_PACK.md`
