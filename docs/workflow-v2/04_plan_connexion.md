# Plan de Connexion & Tests - Workflow V2

## Vue d'ensemble

Ce document décrit le plan de connexion du Workflow V2 avec le système existant et les tests manuels à effectuer pour valider le mode READ_ONLY.

---

## Garde-fous Techniques

### Fichiers clés

| Fichier | Rôle |
|---------|------|
| `src/lib/workflowV2Config.js` | Configuration centrale + garde-fous |
| `src/hooks/useWorkflowV2.js` | Hook avec wrappers sécurisés |

### Flags de sécurité

```javascript
// src/lib/workflowV2Config.js
export const WORKFLOW_V2_CONFIG = {
  readOnlyMode: true,    // ⚠️ DOIT rester true en Phase 1
  mockProceed: true,     // ⚠️ DOIT rester true en Phase 1
  disableRouting: true,  // ⚠️ DOIT rester true en Phase 1
  debugMode: true,       // Logs détaillés
};
```

### Fonctions de garde

| Fonction | Rôle |
|----------|------|
| `guardWriteAction(action, context)` | Bloque toute écriture si READ_ONLY |
| `safeProceed(realAction, context)` | Wrapper sécurisé pour PROCEED |
| `safeNeedData(realAction, context)` | Wrapper sécurisé pour NEED_DATA |
| `runSecurityChecks()` | Vérifications au mount |
| `isFunctionAllowedReadOnly(name)` | Vérifie si fonction autorisée |

### Fonctions interdites en READ_ONLY

```javascript
export const FORBIDDEN_FUNCTIONS_READ_ONLY = [
  'updateStepStatus',
  'completeStepAndProceed',
  'executeContractSignatureAction',
  'handleSelectPrompt',
  'sendChatMessage',
  'submitForm',
  'uploadFile',
  'createSignatureProcedure',
  'updateProspect',
  'deleteProspect',
  'navigate', // Navigation automatique
];
```

---

## Logs Dev

### Console logs automatiques

Tous les logs V2 utilisent le préfixe `[V2]` pour faciliter le filtrage:

| Préfixe | Type |
|---------|------|
| `[V2]` | Log général (debug) |
| `[V2 GUARD]` | Action bloquée par garde-fou |
| `[V2 PROCEED]` | Action PROCEED |
| `[V2 NEED_DATA]` | Action NEED_DATA |
| `[V2 SECURITY]` | Vérifications de sécurité |

### Exemple de sortie console

```
[V2 SECURITY] 🔐 Vérifications de sécurité: {
  readOnlyMode: true,
  mockProceed: true,
  routingDisabled: true,
  status: '✅ Toutes les protections actives'
}

[V2] Steps depuis Supabase { count: 5 }
[V2] Navigation step (visuelle) { from: 0, to: 2 }
[V2 PROCEED] 🔒 Mode READ_ONLY - Action simulée { timestamp: '...', context: {...} }
```

### Filtrer dans la console Chrome

```javascript
// Dans la console
// Afficher uniquement les logs V2
console.log = ((orig) => (...args) => {
  if (args[0]?.includes?.('[V2')) orig(...args);
})(console.log);
```

---

## Tests Manuels

### ✅ Checklist de validation Phase 1

#### 1. Vérification des imports interdits

**Commande:**
```bash
grep -rE "useWorkflowExecutor|useWorkflowActionTrigger|completeStepAndProceed|executeContractSignatureAction" \
  src/components/admin/workflow-v2/ \
  src/hooks/useWorkflowV2.js \
  src/pages/admin/WorkflowV2Page.jsx
```

**Résultat attendu:** Aucune correspondance

---

#### 2. Test PROCEED ne fait aucun write

**Étapes:**
1. Ouvrir la console Dev Tools (F12)
2. Naviguer vers `/admin/workflow-v2/{prospectId}/{projectType}`
3. Cliquer sur le bouton "Valider et continuer" (PROCEED)
4. Observer la console

**Vérifications:**
- [ ] Log `[V2 PROCEED] 🔒 Mode READ_ONLY - Action simulée` apparaît
- [ ] Aucune requête réseau vers Supabase (onglet Network)
- [ ] Le statut de l'étape n'a PAS changé (rester sur la même étape)
- [ ] Toast "Action simulée" s'affiche

**Résultat attendu:**
```
[V2 PROCEED] 🔒 Mode READ_ONLY - Action simulée {
  timestamp: "2026-01-27T...",
  context: { stepId: "...", stepName: "...", ... },
  wouldExecute: "anonymous"
}
```

---

#### 3. Test NEED_DATA ne fait aucun write

**Étapes:**
1. Ouvrir la console Dev Tools (F12)
2. Naviguer vers `/admin/workflow-v2/{prospectId}/{projectType}`
3. Cliquer sur le bouton "J'ai besoin d'infos" (NEED_DATA)
4. Observer la console

**Vérifications:**
- [ ] Log `[V2 NEED_DATA] 🔒 Mode READ_ONLY - Action simulée` apparaît
- [ ] Aucune requête réseau vers Supabase
- [ ] Toast "Action simulée" s'affiche

---

#### 4. Test pas de navigation automatique

**Étapes:**
1. Charger la page Workflow V2
2. Observer la console au mount

**Vérifications:**
- [ ] Log `[V2 SECURITY] 🔐 Vérifications de sécurité` apparaît
- [ ] `routingDisabled: true` est affiché
- [ ] L'utilisateur reste sur l'étape chargée (pas de redirect auto)

---

#### 5. Test pas d'updateStepStatus

**Étapes:**
1. Ouvrir Network tab (filtrer par "supabase" ou "project_steps")
2. Naviguer dans le workflow (cliquer sur différentes étapes)
3. Cliquer sur PROCEED plusieurs fois

**Vérifications:**
- [ ] Aucune requête PATCH/POST vers `project_steps_status`
- [ ] Aucune requête vers `updateStepStatus`
- [ ] Seules des requêtes GET sont visibles (lecture)

---

#### 6. Test pas d'envoi chat

**Étapes:**
1. Ouvrir Network tab
2. Observer la section Chat dans le panneau
3. Vérifier qu'il n'y a pas de champ de saisie actif

**Vérifications:**
- [ ] Pas de champ de saisie pour envoyer un message
- [ ] Aucune requête POST vers `chat_messages`
- [ ] Affichage en lecture seule uniquement

---

#### 7. Test vérifications au mount

**Étapes:**
1. Ouvrir la console avant de charger la page
2. Naviguer vers `/admin/workflow-v2/{prospectId}/{projectType}`
3. Observer les premiers logs

**Vérifications:**
- [ ] Log `[V2 SECURITY] 🔐 Vérifications de sécurité` avec status ✅
- [ ] Tous les flags sont `true`:
  - `readOnlyMode: true`
  - `mockProceed: true`
  - `routingDisabled: true`

---

### ⛔ Tests de régression (ne doivent JAMAIS passer en Phase 1)

Ces tests vérifient que les actions réelles sont bien bloquées:

#### R1. Tenter de modifier readOnlyMode

**Étapes:**
1. Modifier temporairement `readOnlyMode: false` dans `workflowV2Config.js`
2. Recharger la page

**Vérification:**
- [ ] Log `[V2 SECURITY] ⛔ DANGER: readOnlyMode est désactivé!` doit apparaître
- [ ] Le système doit loguer un avertissement critique

**⚠️ Remettre `readOnlyMode: true` après le test!**

---

#### R2. Vérifier qu'aucun hook V1 n'est importé

**Commande:**
```bash
grep -rE "from.*useWorkflowExecutor|from.*useWorkflowActionTrigger" \
  src/components/admin/workflow-v2/ \
  src/hooks/useWorkflowV2.js
```

**Résultat attendu:** Aucune correspondance

---

### 📋 Tableau récapitulatif

| Test | Action | Résultat attendu | ✅/❌ |
|------|--------|------------------|-------|
| T1 | Imports interdits | Aucune correspondance grep | |
| T2 | PROCEED click | Log mock, pas de write | |
| T3 | NEED_DATA click | Log mock, pas de write | |
| T4 | Navigation auto | routingDisabled: true | |
| T5 | updateStepStatus | Aucune requête PATCH | |
| T6 | Chat send | Pas de champ saisie | |
| T7 | Mount checks | Security ✅ dans console | |
| R1 | readOnlyMode=false | Warning DANGER | |
| R2 | Imports V1 hooks | Aucune correspondance | |

---

## URL de test

```
http://localhost:5173/admin/workflow-v2/{prospectId}/{projectType}
```

Exemple avec prospect test:
```
http://localhost:5173/admin/workflow-v2/2e37238f-7ce5-4fa9-97f6-33238d2aabc7/centrale
```

---

## Prochaines étapes (Phase 2)

Avant de passer en Phase 2 (actions réelles), il faudra:

1. [ ] Créer des tests automatisés (Vitest/Jest)
2. [ ] Implémenter le rollback en cas d'erreur
3. [ ] Ajouter un flag `CONFIRM_PHASE_2 = true` requis
4. [ ] Documenter les migrations de données nécessaires
5. [ ] Faire une revue de code complète
