# Vision Workflow V2 — Séparation V1/V2

> Document de référence pour la coexistence V1/V2

---

## 🎯 Objectif

**Créer un Workflow V2 LIVE** qui fonctionne **à côté** de V1 sans le casser.

- **V1** = Système actuel, fragile, non terminé
- **V2** = Nouveau système isolé, safe, incrémental

---

## 📐 Architecture de séparation

```
┌─────────────────────────────────────────────────────────────────┐
│                        LOCASUN PRO                              │
├─────────────────────────────┬───────────────────────────────────┤
│         V1 (Legacy)         │           V2 (LIVE)               │
├─────────────────────────────┼───────────────────────────────────┤
│ ProspectDetailsAdmin.jsx    │ ProspectDetailsV2.jsx             │
│ - 3800+ lignes              │ - ~300 lignes                     │
│ - useWorkflowExecutor       │ - useWorkflowV2                   │
│ - useWorkflowActionTrigger  │ - ZERO hooks V1                   │
│ - Cascade automatique       │ - READ_ONLY                       │
│ - Mutations directes        │ - Mock PROCEED                    │
├─────────────────────────────┼───────────────────────────────────┤
│ /admin/pipeline (V1)        │ /admin/workflow-v2/:id/:type      │
│ → Ouvre ProspectDetails     │ → Ouvre WorkflowV2Page            │
├─────────────────────────────┼───────────────────────────────────┤
│ Feature Flag: N/A           │ WORKFLOW_V2_CONFIG.enabled        │
└─────────────────────────────┴───────────────────────────────────┘
```

---

## 🚫 Imports INTERDITS en V2

Ces imports déclenchent des cascades et des mutations :

```javascript
// ❌ JAMAIS dans /workflow-v2/ ou /ProspectDetailsV2
import { useWorkflowExecutor } from '@/hooks/useWorkflowExecutor';
import { useWorkflowActionTrigger } from '@/hooks/useWorkflowActionTrigger';
import { completeStepAndProceed } from '@/lib/workflowEngine';
import { executeContractSignatureAction } from '@/lib/contractPdfGenerator';
```

### Vérification automatique

```bash
# Avant chaque commit V2
grep -rE "useWorkflowExecutor|useWorkflowActionTrigger|completeStepAndProceed|executeContractSignatureAction" \
  src/components/admin/workflow-v2/ \
  src/pages/admin/WorkflowV2Page.jsx \
  src/components/admin/ProspectDetailsV2.jsx \
  2>/dev/null && echo "❌ IMPORTS V1 DÉTECTÉS" || echo "✅ Aucun import V1"
```

---

## 📁 Structure fichiers V2

```
src/
├── lib/
│   └── workflowV2Config.js          # Feature flags + config
├── hooks/
│   └── useWorkflowV2.js             # Hook READ_ONLY centralisé
├── components/admin/
│   ├── workflow-v2/
│   │   ├── index.js                 # Barrel exports
│   │   ├── ModuleNavigation.jsx     # Timeline gauche
│   │   ├── ModulePanel.jsx          # Panel central
│   │   ├── ActionButtons.jsx        # Boutons PROCEED/NEED_DATA
│   │   └── ModuleLiveCard.jsx       # Carte interactive IA
│   └── ProspectDetailsV2.jsx        # Page prospect simplifiée
├── pages/admin/
│   └── WorkflowV2Page.jsx           # Page workflow complète
└── docs/workflow-v2/
    ├── PROGRESS.md                  # Suivi tickets
    ├── CARTOGRAPHIE.md              # Map système
    ├── TICKETS.md                   # Détail tickets
    ├── 01_vision.md                 # Ce document
    └── 02_pattern_module_live.md    # Pattern carte IA
```

---

## 🔄 Phases de migration

### Phase 1 : READ_ONLY (actuelle) ✅

- [x] Feature flag activable
- [x] Route dédiée `/admin/workflow-v2/`
- [x] Lecture données depuis Supabase
- [x] Affichage étapes + statuts
- [x] Navigation entre modules
- [x] Boutons mockés (console.log)
- [x] ZERO écriture DB
- [x] ZERO routing automatique

### Phase 2 : WRITE_CONTROLLED (future)

- [ ] Activer `readOnlyMode: false`
- [ ] PROCEED → vraie action (un seul step)
- [ ] NEED_DATA → Charly AI répond
- [ ] Historique actions persisté
- [ ] Pas de cascade automatique

### Phase 3 : FULL_WORKFLOW (future)

- [ ] Cascade contrôlée step par step
- [ ] Routing intelligent
- [ ] Prompts dynamiques
- [ ] Migration progressive V1 → V2

---

## 🛡️ Règles de sécurité

1. **Jamais d'import V1** dans les fichiers V2
2. **Feature flag** pour activer/désactiver
3. **Console.log** au lieu d'actions réelles en Phase 1
4. **Grep de vérification** avant chaque PR
5. **Tests manuels** : cliquer partout ne doit rien casser

---

## 🔗 Points d'entrée

### Depuis Pipeline V1 (T7 - en pause)

```jsx
// Dans ProspectCard.jsx ou FinalPipeline.jsx
<Button onClick={() => navigate(`/admin/workflow-v2/${prospectId}/${projectType}`)}>
  Ouvrir V2
</Button>
```

### Depuis Prospect V2

```jsx
// Dans ProspectDetailsV2.jsx
<Button onClick={() => navigate(`/admin/workflow-v2/${prospectId}/${projectType}`)}>
  Ouvrir Workflow V2
</Button>
```

### URL directe

```
http://localhost:5173/admin/workflow-v2/{prospectId}/{projectType}
```

---

## 📊 Comparaison V1 vs V2

| Aspect | V1 | V2 |
|--------|----|----|
| Lignes de code | 3800+ | ~300 |
| Hooks workflow | 3 | 1 |
| Cascades auto | ✅ Oui | ❌ Non |
| Mutations directes | ✅ Oui | ❌ Non |
| Feature flag | ❌ Non | ✅ Oui |
| Mode lecture | ❌ Non | ✅ Oui |
| Tests isolés | ❌ Difficile | ✅ Facile |
| Risque régression | 🔴 Élevé | 🟢 Faible |

---

## 🎬 Scénario d'usage

1. **Admin** ouvre le pipeline V1
2. Clique sur un prospect
3. Voit le bouton "Ouvrir Workflow V2" (si feature flag activé)
4. Page V2 s'ouvre avec les étapes en lecture
5. Admin navigue entre modules
6. Clique PROCEED → console.log (Phase 1)
7. Clique NEED_DATA → discussion stub
8. **Aucune donnée modifiée**

---

## ✅ Checklist avant activation Phase 2

- [ ] Tous les tests manuels passent
- [ ] Aucun import V1 détecté
- [ ] Feature flag documenté
- [ ] Rollback possible (flag → false)
- [ ] Monitoring en place
- [ ] Users informés du mode beta
