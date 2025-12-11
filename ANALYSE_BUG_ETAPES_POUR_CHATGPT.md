# 🐛 ANALYSE COMPLÈTE : Bug étape 1 redevient "en cours" après validation checklist

## 📋 CONTEXTE DU PROJET

### Application
React + Vite + Supabase - Gestion de projets énergétiques (solaire, ACC, autonomie)

### Architecture des étapes de projet
Chaque prospect a plusieurs projets (tags), et chaque projet a des étapes séquentielles :
```
Exemple projet "ACC Producteur" :
1. Inscription (completed)
2. Connexion Centrale (in_progress) ← avec checklist
3. Contrat (pending)
4. Attente Raccordement (pending)
5. Actif (pending)
```

### Système de checklist
Un commercial peut ajouter une **checklist** à une étape via un prompt/action.
Quand tous les items sont cochés + `autoCompleteStep` activé → passage automatique à l'étape suivante.

---

## 🎯 OBJECTIF FONCTIONNEL

**Workflow attendu** :
1. Commercial sur étape 2 "Connexion Centrale" (in_progress)
2. Il coche tous les items de la checklist
3. ✅ Système passe automatiquement à l'étape 3 "Contrat" (in_progress)
4. ✅ Étape 2 devient "Terminée" (completed)
5. ✅ **Étape 1 DOIT RESTER "Terminée" (completed)**

**Bug actuel** :
- ❌ Après validation checklist → Étape 1 redevient "En cours" (in_progress)

---

## 🏗️ ARCHITECTURE TECHNIQUE

### Deux systèmes de gestion des steps coexistent

#### 1️⃣ **Système legacy (App.jsx)** - État global React

```javascript
// App.jsx
const [projectStepsStatus, setProjectStepsStatus] = useState({});

const getProjectSteps = (prospectId, projectType) => {
  const key = `prospect_${prospectId}_project_${projectType}`;
  const savedSteps = projectStepsStatus[key]; // ❌ Toujours undefined
  
  if (savedSteps && savedSteps.length > 0) {
    // Restaurer depuis state
  } else {
    // Utiliser template → première étape = 'in_progress'
  }
}

const updateProjectSteps = async (prospectId, projectType, newSteps) => {
  const key = `prospect_${prospectId}_project_${projectType}`;
  
  // Mettre à jour state local
  setProjectStepsStatus(prev => ({ ...prev, [key]: newSteps }));
  
  // Sauvegarder dans Supabase
  await supabase.from('project_steps_status').upsert({...});
}

const completeStepAndProceed = async (prospectId, projectType, stepIndex) => {
  const steps = getProjectSteps(prospectId, projectType); // 🔥 APPEL ICI
  
  // Modifier steps
  steps[stepIndex].status = 'completed';
  steps[stepIndex + 1].status = 'in_progress';
  
  // Sauvegarder
  await updateProjectSteps(prospectId, projectType, steps);
}
```

**Problème** : `projectStepsStatus[key]` n'est **JAMAIS rempli** au chargement initial. Il est rempli uniquement quand on appelle `updateProjectSteps`, mais après un refresh page → vide à nouveau.

#### 2️⃣ **Système Supabase real-time (hooks)** - Source de vérité

```javascript
// hooks/useSupabaseProjectStepsStatus.js
export const useSupabaseProjectStepsStatus = (prospectId) => {
  const [projectStepsStatus, setProjectStepsStatus] = useState({});

  useEffect(() => {
    // 1. Charger depuis Supabase au mount
    const fetchSteps = async () => {
      const { data } = await supabase
        .from('project_steps_status')
        .select('*')
        .eq('prospect_id', prospectId);
      
      // Transformer en objet { projectType: steps }
      const mapped = {};
      data.forEach(row => {
        mapped[row.project_type] = row.steps;
      });
      setProjectStepsStatus(mapped);
    };
    
    // 2. S'abonner aux changements real-time
    const channel = supabase
      .channel(`steps-${prospectId}`)
      .on('postgres_changes', { 
        event: '*', 
        table: 'project_steps_status',
        filter: `prospect_id=eq.${prospectId}`
      }, (payload) => {
        // Mettre à jour state quand Supabase change
      })
      .subscribe();
    
    return () => supabase.removeChannel(channel);
  }, [prospectId]);

  const updateProjectSteps = async (projectType, newSteps) => {
    await supabase
      .from('project_steps_status')
      .upsert({ prospect_id, project_type: projectType, steps: newSteps });
    // Le real-time mettra à jour projectStepsStatus automatiquement
  };

  return { projectStepsStatus, updateProjectSteps };
}
```

**Avantage** : Synchronisé avec Supabase, données toujours à jour, real-time.

---

## 📂 UTILISATION DANS LES COMPOSANTS

### ProspectDetailsAdmin.jsx (fonctionne bien)

```javascript
const ProspectDetailsAdmin = ({ prospect }) => {
  // Hook Supabase (source de vérité)
  const { 
    projectStepsStatus: supabaseSteps, 
    updateProjectSteps: updateSupabaseSteps 
  } = useSupabaseProjectStepsStatus(prospect.id);
  
  // Contexte global (legacy)
  const { getProjectSteps, completeStepAndProceed } = useAppContext();
  
  // Détermine les steps à afficher
  const projectSteps = useMemo(() => {
    if (supabaseSteps[activeProjectTag]) {
      return supabaseSteps[activeProjectTag]; // ✅ Source fiable
    }
    
    // Si pas encore chargé, utiliser template
    const templateSteps = projectsData[activeProjectTag]?.steps;
    if (templateSteps) {
      const initialSteps = JSON.parse(JSON.stringify(templateSteps));
      initialSteps[0].status = 'in_progress';
      return initialSteps;
    }
    
    return [];
  }, [activeProjectTag, supabaseSteps, projectsData]);
  
  // Checklist interactive
  const handleCheckboxToggle = (actionId, itemId) => {
    // ...
    if (allChecked && autoCompleteStep) {
      completeStepAndProceed(prospect.id, projectType, currentStepIndex);
      // ☝️ Appelle la fonction du contexte global
    }
  };
}
```

---

## 🐛 FLUX DU BUG (étape par étape)

### Étape 1 : État initial
```
Étape 1: completed
Étape 2: in_progress (avec checklist)
Étape 3: pending

Supabase project_steps_status:
{
  steps: [
    { name: "Inscription", status: "completed" },
    { name: "Connexion Centrale", status: "in_progress" },
    { name: "Contrat", status: "pending" }
  ]
}
```

### Étape 2 : Commercial coche la dernière checkbox

```javascript
handleCheckboxToggle() détecte allChecked = true
→ Appelle completeStepAndProceed(prospectId, projectType, 1)
```

### Étape 3 : completeStepAndProceed s'exécute (App.jsx)

```javascript
const completeStepAndProceed = async (prospectId, projectType, stepIndex) => {
  // 🔥 LIGNE PROBLÉMATIQUE
  const steps = getProjectSteps(prospectId, projectType);
  
  // À ce moment:
  // projectStepsStatus[key] = undefined (state global vide)
  // → getProjectSteps entre dans le else
  // → Utilise template avec firstStep = 'pending'
  // → Force firstStep.status = 'in_progress'
  
  // Résultat: steps = [
  //   { name: "Inscription", status: "in_progress" }, ❌ BUG ICI
  //   { name: "Connexion Centrale", status: "in_progress" },
  //   { name: "Contrat", status: "pending" }
  // ]
  
  // Modifie les steps
  steps[1].status = 'completed';
  steps[2].status = 'in_progress';
  
  // Résultat: steps = [
  //   { name: "Inscription", status: "in_progress" }, ❌ TOUJOURS MAUVAIS
  //   { name: "Connexion Centrale", status: "completed" }, ✅
  //   { name: "Contrat", status: "in_progress" } ✅
  // ]
  
  // Sauvegarde dans Supabase
  await updateProjectSteps(prospectId, projectType, steps);
  // ☝️ Sauvegarde les MAUVAISES données en base !
}
```

### Étape 4 : Supabase real-time synchronise

```javascript
// Le hook useSupabaseProjectStepsStatus reçoit l'update
// Et met à jour supabaseSteps avec les données CORROMPUES

supabaseSteps[projectType] = [
  { name: "Inscription", status: "in_progress" }, ❌
  { name: "Connexion Centrale", status: "completed" }, ✅
  { name: "Contrat", status: "in_progress" } ✅
]
```

### Étape 5 : Affichage final

```
Étape 1: EN COURS ❌ (devrait être "completed")
Étape 2: Terminée ✅
Étape 3: En cours ✅
```

---

## 🔍 TENTATIVES DE FIX (toutes échouées)

### Fix 1 : Condition sur firstStep.status === 'pending'
```javascript
if (currentSteps.length > 0 && currentSteps[0].status === 'pending') {
  currentSteps[0].status = 'in_progress';
}
```
**Résultat** : ❌ Inefficace, le template a toujours 'pending'

### Fix 2 : Supprimer setTimeout
**Hypothèse** : Race condition avec setTimeout(1000ms)
**Résultat** : ❌ Le bug persiste, ce n'était pas la cause

### Fix 3 : Rendre completeStepAndProceed async + await
```javascript
await updateProjectSteps(prospectId, projectType, newSteps);
```
**Résultat** : ❌ setProjectStepsStatus est async React, le state n'est pas mis à jour immédiatement

### Fix 4 : Supprimer fallback getProjectSteps dans useMemo
**Hypothèse** : Le fallback dans ProspectDetailsAdmin appelait getProjectSteps
**Résultat** : ❌ completeStepAndProceed appelle getProjectSteps AVANT d'entrer dans useMemo

---

## 💡 SOLUTIONS POSSIBLES

### Solution A : Passer les steps en paramètre

**Modification** : `completeStepAndProceed` reçoit les steps actuels au lieu de les récupérer

```javascript
// ProspectDetailsAdmin.jsx
const handleCheckboxToggle = () => {
  if (allChecked && autoCompleteStep) {
    completeStepAndProceed(
      prospect.id, 
      projectType, 
      currentStepIndex,
      projectSteps // ✅ Passer les steps actuels depuis supabaseSteps
    );
  }
};

// App.jsx
const completeStepAndProceed = async (prospectId, projectType, stepIndex, currentSteps) => {
  // ✅ Ne plus appeler getProjectSteps
  const steps = JSON.parse(JSON.stringify(currentSteps));
  
  steps[stepIndex].status = 'completed';
  if (stepIndex + 1 < steps.length) {
    steps[stepIndex + 1].status = 'in_progress';
  }
  
  await updateProjectSteps(prospectId, projectType, steps);
}
```

**Avantages** :
- ✅ Simple, changement minimal
- ✅ Utilise les vraies données depuis supabaseSteps
- ✅ Pas de refactoring majeur

**Inconvénients** :
- ⚠️ Tous les appels à completeStepAndProceed doivent être mis à jour
- ⚠️ Garde la duplication des systèmes

---

### Solution B : Déplacer completeStepAndProceed dans ProspectDetailsAdmin

**Modification** : Sortir la fonction du contexte global

```javascript
// ProspectDetailsAdmin.jsx
const ProspectDetailsAdmin = ({ prospect }) => {
  const { projectStepsStatus: supabaseSteps, updateProjectSteps: updateSupabaseSteps } = 
    useSupabaseProjectStepsStatus(prospect.id);
  
  const completeStepAndProceed = async (projectType, stepIndex) => {
    const currentSteps = supabaseSteps[projectType];
    if (!currentSteps) return;
    
    const steps = JSON.parse(JSON.stringify(currentSteps));
    steps[stepIndex].status = 'completed';
    if (stepIndex + 1 < steps.length) {
      steps[stepIndex + 1].status = 'in_progress';
    }
    
    await updateSupabaseSteps(projectType, steps);
  };
  
  // Utiliser la fonction locale
  const handleCheckboxToggle = () => {
    if (allChecked && autoCompleteStep) {
      completeStepAndProceed(projectType, currentStepIndex);
    }
  };
}
```

**Avantages** :
- ✅ Accès direct à supabaseSteps (source de vérité)
- ✅ Pas de duplication de systèmes
- ✅ Logique colocalisée avec l'UI

**Inconvénients** :
- ⚠️ Fonction utilisée ailleurs (ProspectForms validation)
- ⚠️ Refactoring plus important

---

### Solution C : Supprimer complètement getProjectSteps

**Modification** : Migrer TOUT vers useSupabaseProjectStepsStatus

```javascript
// App.jsx - SUPPRIMER
// const [projectStepsStatus, setProjectStepsStatus] = useState({});
// const getProjectSteps = () => { ... };
// const updateProjectSteps = () => { ... };

// Garder uniquement pour completeStepAndProceed
const completeStepAndProceed = async (prospectId, projectType, stepIndex, currentSteps) => {
  const steps = JSON.parse(JSON.stringify(currentSteps));
  steps[stepIndex].status = 'completed';
  if (stepIndex + 1 < steps.length) {
    steps[stepIndex + 1].status = 'in_progress';
  }
  
  // Appeler le hook Supabase directement
  await supabase.from('project_steps_status').upsert({
    prospect_id: prospectId,
    project_type: projectType,
    steps: steps
  });
}
```

**Avantages** :
- ✅ Une seule source de vérité
- ✅ Pas de confusion entre systèmes
- ✅ Code plus propre

**Inconvénients** :
- ⚠️ Refactoring complet nécessaire
- ⚠️ Tous les composants doivent migrer

---

## ❓ QUESTIONS POUR DÉCISION

1. **Y a-t-il d'autres endroits critiques** qui utilisent `getProjectSteps` ?
   - FinalPipeline.jsx (ligne 388)
   - ProjectCard.jsx (ligne 18)
   
2. **Pourquoi avoir deux systèmes** au lieu d'un seul ?
   - Legacy code ? Migration en cours ?

3. **completeStepAndProceed est-il utilisé ailleurs** que dans ProspectDetailsAdmin ?
   - Oui, dans ProspectForms pour validation formulaires
   
4. **Préférence architecture** : Contexte global vs hooks locaux ?

---

## 🎯 RECOMMANDATION

**Solution A (court terme)** : Passer les steps en paramètre
- Résout le bug immédiatement
- Changement minimal
- Permet de continuer avec les deux systèmes

**Solution C (long terme)** : Migrer complètement vers hooks Supabase
- Supprime la source du bug
- Architecture plus claire
- Nécessite planification

---

## 📦 FICHIERS CONCERNÉS

- `src/App.jsx` (ligne 1039-1154) : completeStepAndProceed, getProjectSteps, updateProjectSteps
- `src/components/admin/ProspectDetailsAdmin.jsx` (ligne 1054-1072, 380-425) : useMemo projectSteps, handleCheckboxToggle
- `src/hooks/useSupabaseProjectStepsStatus.js` : Hook Supabase real-time
- `src/pages/admin/FinalPipeline.jsx` (ligne 388) : Utilise getProjectSteps
- `src/components/ProjectCard.jsx` (ligne 18) : Utilise getProjectSteps

---

**Quelle solution préconises-tu ?** 🤔
