# 🎫 Workflow V2 — Plan de Tickets

> **Date**: 27 janvier 2026  
> **Objectif**: V2 READ_ONLY sans cascade  
> **Priorité**: Isolation totale de V1

---

## 📋 VUE D'ENSEMBLE

| # | Ticket | Effort | Risque | Dépendances |
|---|--------|--------|--------|-------------|
| T1 | Feature Flag + Config | XS | 🟢 Faible | - |
| T2 | Route + Page Skeleton | S | 🟢 Faible | T1 |
| T3 | Hook READ_ONLY | S | 🟡 Moyen | T1 |
| T4 | Navigation Modules | M | 🟢 Faible | T2, T3 |
| T5 | Panel Module (lecture) | M | 🟡 Moyen | T3, T4 |
| T6 | Boutons PROCEED/NEED_DATA | S | 🟢 Faible | T5 |
| T7 | Lien depuis Pipeline | XS | 🟢 Faible | T2 |

**Total estimé**: 2-3 jours de dev

---

## 🎫 TICKET 1 — Feature Flag + Config

### Objectif
Créer le système de feature flag pour activer/désactiver V2 sans toucher au code.

### Définition du Done
- [ ] Fichier `src/lib/workflowV2Config.js` créé
- [ ] Export `WORKFLOW_V2_ENABLED` lisible partout
- [ ] Mode `READ_ONLY` activé par défaut
- [ ] Liste des imports interdits documentée en commentaire

### Fichiers concernés
```
src/lib/workflowV2Config.js  ← CRÉER
```

### Code attendu
```javascript
/**
 * Configuration Workflow V2
 * 
 * ⚠️ IMPORTS INTERDITS dans les composants V2 (phase 1):
 * - useWorkflowExecutor
 * - useWorkflowActionTrigger
 * - completeStepAndProceed (pour action)
 * - executeContractSignatureAction
 * - handleSelectPrompt
 */

export const WORKFLOW_V2_CONFIG = {
  // Feature flag principal
  enabled: true,
  
  // Phase 1: lecture seule, aucune action réelle
  readOnlyMode: true,
  
  // PROCEED = console.log, pas d'effet
  mockProceed: true,
  
  // Utilisateurs autorisés ('*' = tous)
  allowedUsers: ['*'],
};

export const isWorkflowV2Enabled = () => WORKFLOW_V2_CONFIG.enabled;
export const isReadOnlyMode = () => WORKFLOW_V2_CONFIG.readOnlyMode;
```

### Tests
- [ ] Import fonctionne dans un composant test
- [ ] `isWorkflowV2Enabled()` retourne `true`
- [ ] `npm run build` passe

---

## 🎫 TICKET 2 — Route + Page Skeleton

### Objectif
Créer la route V2 et une page skeleton accessible.

### Définition du Done
- [ ] Route `/admin/workflow-v2/:prospectId/:projectType` ajoutée dans `App.jsx`
- [ ] Page `WorkflowV2Page.jsx` avec skeleton loading
- [ ] Dossier `src/components/admin/workflow-v2/` créé
- [ ] Feature flag vérifié avant rendu
- [ ] Redirect si flag désactivé

### Fichiers concernés
```
src/App.jsx                              ← MODIFIER (1 ligne)
src/pages/admin/WorkflowV2Page.jsx       ← CRÉER
src/components/admin/workflow-v2/        ← CRÉER (dossier)
src/components/admin/workflow-v2/index.js ← CRÉER
```

### Tests
- [ ] Accès `/admin/workflow-v2/xxx/ACC` affiche skeleton
- [ ] Si `enabled: false`, redirect vers pipeline
- [ ] Aucune erreur console
- [ ] `npm run build` passe

---

## 🎫 TICKET 3 — Hook useWorkflowV2 (READ_ONLY)

### Objectif
Créer un hook centralisé qui agrège les données nécessaires en lecture seule.

### Définition du Done
- [ ] Hook `useWorkflowV2.js` créé
- [ ] Lit depuis hooks existants (pas de nouveau fetch)
- [ ] Retourne: prospect, steps, currentStep, forms, files, messages
- [ ] Aucun import de fonctions d'action V1
- [ ] Loading/error states gérés

### Fichiers concernés
```
src/hooks/useWorkflowV2.js  ← CRÉER
```

### Interface attendue
```javascript
const {
  // Données
  prospect,
  projectSteps,
  currentStep,
  currentStepIndex,
  chatMessages,
  formPanels,
  projectFiles,
  
  // États
  loading,
  error,
  
  // Meta
  isReadOnly,  // toujours true en phase 1
} = useWorkflowV2(prospectId, projectType);
```

### Tests
- [ ] Données chargées correctement
- [ ] Pas de double fetch (vérifier Network tab)
- [ ] `isReadOnly` = `true`
- [ ] `npm run build` passe

---

## 🎫 TICKET 4 — Navigation Modules (Steps)

### Objectif
Afficher la liste des modules (= étapes) avec navigation.

### Définition du Done
- [ ] Composant `ModuleNavigation.jsx` créé
- [ ] Affiche toutes les étapes du projet
- [ ] Indique visuellement le module actif
- [ ] Clic = change module affiché (state local, pas d'effet DB)
- [ ] Badge status (pending/in_progress/completed)

### Fichiers concernés
```
src/components/admin/workflow-v2/ModuleNavigation.jsx  ← CRÉER
```

### Tests
- [ ] Liste des modules affichée
- [ ] Clic change le module sélectionné
- [ ] Aucun appel API au clic
- [ ] `npm run build` passe

---

## 🎫 TICKET 5 — Panel Module (lecture données)

### Objectif
Afficher les données d'un module : infos, formulaires, fichiers, chat.

### Définition du Done
- [ ] Composant `ModulePanel.jsx` créé
- [ ] Affiche: nom étape, description, status
- [ ] Section "Formulaires" (liste des forms liés)
- [ ] Section "Fichiers" (liste des docs)
- [ ] Section "Historique chat" (derniers messages)
- [ ] Tout en lecture seule

### Fichiers concernés
```
src/components/admin/workflow-v2/ModulePanel.jsx      ← CRÉER
src/components/admin/workflow-v2/ModuleInfoCard.jsx   ← CRÉER
src/components/admin/workflow-v2/ModuleFormsList.jsx  ← CRÉER
src/components/admin/workflow-v2/ModuleFilesList.jsx  ← CRÉER
```

### Tests
- [ ] Données du module affichées
- [ ] Aucun bouton d'action (edit/delete/send)
- [ ] Aucune mutation possible
- [ ] `npm run build` passe

---

## 🎫 TICKET 6 — Boutons PROCEED / NEED_DATA

### Objectif
Ajouter les 2 boutons d'intention utilisateur (mock en phase 1).

### Définition du Done
- [ ] Composant `ActionButtons.jsx` créé
- [ ] Bouton PROCEED → `console.log('PROCEED', moduleId)` + toast
- [ ] Bouton NEED_DATA → `console.log('NEED_DATA', moduleId)` + toast
- [ ] Aucune action réelle
- [ ] Texte des boutons configurable (props)
- [ ] Disabled si `readOnlyMode: false` pas encore activé

### Fichiers concernés
```
src/components/admin/workflow-v2/ActionButtons.jsx  ← CRÉER
```

### Code attendu
```javascript
const ActionButtons = ({ 
  moduleId, 
  proceedLabel = "Valider et continuer",
  needDataLabel = "J'ai besoin d'infos"
}) => {
  const handleProceed = () => {
    console.log('🚀 PROCEED (mock)', { moduleId });
    toast({ title: "PROCEED", description: "Action simulée (mode lecture)" });
  };
  
  const handleNeedData = () => {
    console.log('❓ NEED_DATA (mock)', { moduleId });
    toast({ title: "NEED_DATA", description: "Action simulée (mode lecture)" });
  };
  
  return (
    <div className="flex gap-3">
      <Button onClick={handleProceed}>🚀 {proceedLabel}</Button>
      <Button variant="outline" onClick={handleNeedData}>❓ {needDataLabel}</Button>
    </div>
  );
};
```

### Tests
- [ ] Boutons visibles
- [ ] Click → console.log + toast
- [ ] Aucun appel API
- [ ] `npm run build` passe

---

## 🎫 TICKET 7 — Lien depuis Pipeline

### Objectif
Ajouter un bouton/lien pour accéder à V2 depuis la card prospect.

### Définition du Done
- [ ] Bouton "Workflow V2" sur `ProspectCard` (conditionnel feature flag)
- [ ] Lien vers `/admin/workflow-v2/:prospectId/:projectType`
- [ ] Visible uniquement si `WORKFLOW_V2_CONFIG.enabled`
- [ ] Style discret (icône ou lien secondaire)

### Fichiers concernés
```
src/components/admin/ProspectCard.jsx  ← MODIFIER (5-10 lignes)
```

### Tests
- [ ] Bouton visible si flag ON
- [ ] Bouton absent si flag OFF
- [ ] Navigation fonctionne
- [ ] V1 non impacté
- [ ] `npm run build` passe

---

## 📊 ORDRE D'EXÉCUTION RECOMMANDÉ

```
T1 (Feature Flag)
 │
 ├── T2 (Route + Page)
 │    │
 │    └── T7 (Lien Pipeline) ← peut être fait en parallèle
 │
 └── T3 (Hook READ_ONLY)
      │
      └── T4 (Navigation Modules)
           │
           └── T5 (Panel Module)
                │
                └── T6 (Boutons PROCEED/NEED_DATA)
```

### Ordre linéaire
1. **T1** — Feature Flag + Config
2. **T2** — Route + Page Skeleton
3. **T3** — Hook useWorkflowV2
4. **T4** — Navigation Modules
5. **T5** — Panel Module
6. **T6** — Boutons PROCEED/NEED_DATA
7. **T7** — Lien depuis Pipeline

---

## ⚠️ ANALYSE DES RISQUES

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| Import accidentel de V1 | 🟡 Moyen | 🔴 Critique | Liste d'imports interdits dans T1 + review |
| Double fetch | 🟢 Faible | 🟡 Moyen | T3 réutilise hooks existants |
| Cascade déclenchée | 🟢 Faible | 🔴 Critique | Aucun import de trigger hooks |
| Page blanche | 🟢 Faible | 🟡 Moyen | Skeleton + error boundary |
| Conflit avec V1 | 🟢 Faible | 🟡 Moyen | Route et dossier isolés |

### Risque principal
**Import accidentel** d'une fonction V1 (ex: `completeStepAndProceed`).

**Mitigation** :
- Commentaire explicite dans `workflowV2Config.js`
- Review à chaque PR
- Grep automatique avant merge : `grep -r "useWorkflowExecutor\|useWorkflowActionTrigger\|completeStepAndProceed" src/components/admin/workflow-v2/`

---

## ✅ DEFINITION OF DONE GLOBALE (V2 Phase 1)

- [ ] Page `/admin/workflow-v2/:prospectId/:projectType` accessible
- [ ] Affiche les modules (étapes) du projet
- [ ] Navigation entre modules sans effet DB
- [ ] Données affichées en lecture seule
- [ ] Boutons PROCEED/NEED_DATA = mock (console.log)
- [ ] Aucune cascade, aucun update de status
- [ ] Feature flag fonctionne (ON/OFF)
- [ ] `npm run build` passe
- [ ] Smoke tests V1 passent (aucune régression)
