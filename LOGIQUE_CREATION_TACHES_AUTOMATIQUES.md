# ⏰ Logique de Création Automatique des Tâches

## 📋 Vue d'ensemble

Quand un prompt est configuré en mode **"Géré par commercial"** avec l'option **"Créer automatiquement une tâche"**, une tâche doit être créée pour le commercial responsable du prospect dès que l'étape concernée devient active.

## 🎯 Règles de planification horaire

Pour éviter que les commerciaux reçoivent des tâches en dehors des heures de bureau, la création de tâches suit ces règles :

### ⏰ Horaires de création

| Heure de déclenchement | Heure de création de la tâche | Logique |
|------------------------|-------------------------------|---------|
| **00h00 - 08h59** | **09h00 le jour même** | Attendre l'ouverture des bureaux |
| **09h00 - 18h59** | **Immédiatement** | Pendant les heures de travail |
| **19h00 - 23h59** | **09h00 le lendemain** | Reporter au lendemain matin |

### 📝 Exemples concrets

```javascript
// Exemple 1 : Déclenchement à 3h00
const triggerTime = new Date('2025-12-09T03:00:00');
const taskTime = new Date('2025-12-09T09:00:00'); // ✅ Reporté à 9h

// Exemple 2 : Déclenchement à 14h00
const triggerTime = new Date('2025-12-09T14:00:00');
const taskTime = new Date('2025-12-09T14:00:00'); // ✅ Créé immédiatement

// Exemple 3 : Déclenchement à 21h00
const triggerTime = new Date('2025-12-09T21:00:00');
const taskTime = new Date('2025-12-10T09:00:00'); // ✅ Reporté au lendemain à 9h
```

## 🔧 Implémentation technique

### Fonction de calcul de l'heure de création

```javascript
/**
 * Calcule l'heure de création d'une tâche selon les règles métier
 * @param {Date} triggerDate - Date/heure de déclenchement
 * @returns {Date} - Date/heure effective de création de la tâche
 */
function calculateTaskCreationTime(triggerDate = new Date()) {
  const hour = triggerDate.getHours();
  
  // Cas 1 : Nuit (00h-08h) → Attendre 9h le matin même
  if (hour < 9) {
    const taskDate = new Date(triggerDate);
    taskDate.setHours(9, 0, 0, 0);
    return taskDate;
  }
  
  // Cas 2 : Heures de bureau (09h-18h) → Immédiatement
  if (hour >= 9 && hour < 19) {
    return triggerDate;
  }
  
  // Cas 3 : Soirée (19h-23h) → Lendemain à 9h
  if (hour >= 19) {
    const taskDate = new Date(triggerDate);
    taskDate.setDate(taskDate.getDate() + 1); // Jour suivant
    taskDate.setHours(9, 0, 0, 0);
    return taskDate;
  }
  
  return triggerDate;
}
```

### Structure de données de la tâche

Quand une tâche est créée automatiquement, elle doit avoir la structure suivante :

```javascript
const taskData = {
  // Type et identification
  type: 'task',
  title: action.taskTitle || 'Action requise pour ce client', // Titre du prompt
  
  // Assignation
  assigned_user_id: prospect.owner_id, // UUID du commercial responsable
  contact_id: prospect.id,             // UUID du prospect
  
  // Projet et étape
  project_id: projectType,             // Ex: 'ACC', 'Centrale', etc.
  step: currentStepName,               // Nom de l'étape qui a déclenché la tâche
  
  // Planification
  start_time: calculateTaskCreationTime(new Date()), // Heure calculée selon règles
  end_time: null,                      // Pas de deadline fixe pour les tâches
  
  // Statut
  status: 'pending',                   // Statut initial
  done: false,                         // Non complétée
  
  // Métadonnées
  notes: `Tâche créée automatiquement par le prompt "${promptName}"`,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};
```

## 🔄 Workflow complet

### 1. Configuration du prompt (Interface Admin)

```javascript
// Dans ProfilePage.jsx - ActionEditor
const action = {
  id: 'action-123',
  message: 'Merci de compléter le formulaire RIB',
  type: 'show_form',
  formId: 'form-rib-acc',
  managementMode: 'manual',        // ← Géré par commercial
  createTask: true,                // ← Créer une tâche automatiquement
  taskTitle: 'Envoyer formulaire RIB au client' // ← Titre personnalisé
};
```

### 2. Déclenchement (Changement d'étape)

Quand un prospect passe à l'étape configurée :

```javascript
// Backend / Edge Function
async function onStepChange(prospectId, projectType, newStepIndex) {
  // 1. Récupérer le prompt pour ce projet
  const { data: prompt } = await supabase
    .from('prompts')
    .select('*')
    .eq('project_id', projectType)
    .single();
  
  // 2. Récupérer la configuration de cette étape
  const stepConfig = prompt.steps_config[newStepIndex];
  
  // 3. Parcourir les actions
  for (const action of stepConfig.actions) {
    // Si mode manuel + création de tâche activée
    if (action.managementMode === 'manual' && action.createTask !== false) {
      // 4. Récupérer le prospect pour avoir owner_id
      const { data: prospect } = await supabase
        .from('prospects')
        .select('owner_id')
        .eq('id', prospectId)
        .single();
      
      // 5. Calculer l'heure de création
      const taskTime = calculateTaskCreationTime(new Date());
      
      // 6. Créer la tâche
      await supabase
        .from('appointments')
        .insert({
          type: 'task',
          title: action.taskTitle || 'Action requise pour ce client',
          assigned_user_id: prospect.owner_id,
          contact_id: prospectId,
          project_id: projectType,
          step: stepConfig.stepName,
          start_time: taskTime.toISOString(),
          status: 'pending',
          notes: `Tâche créée automatiquement par le prompt "${prompt.name}"`
        });
      
      console.log(`✅ Tâche créée pour ${taskTime.toISOString()}`);
    }
    
    // Si mode automatique, envoyer directement via Charly AI
    if (action.managementMode === 'automatic') {
      await sendAutomaticMessage(prospectId, action);
    }
  }
}
```

## 🧪 Tests à effectuer

### Test 1 : Création tôt le matin
```javascript
// Simuler déclenchement à 5h00
const mockDate = new Date('2025-12-09T05:00:00');
const result = calculateTaskCreationTime(mockDate);
// Résultat attendu : 2025-12-09T09:00:00
assert(result.getHours() === 9);
assert(result.getDate() === 9);
```

### Test 2 : Création pendant les heures de bureau
```javascript
// Simuler déclenchement à 14h30
const mockDate = new Date('2025-12-09T14:30:00');
const result = calculateTaskCreationTime(mockDate);
// Résultat attendu : 2025-12-09T14:30:00 (immédiat)
assert(result.getTime() === mockDate.getTime());
```

### Test 3 : Création tard le soir
```javascript
// Simuler déclenchement à 22h00
const mockDate = new Date('2025-12-09T22:00:00');
const result = calculateTaskCreationTime(mockDate);
// Résultat attendu : 2025-12-10T09:00:00 (lendemain)
assert(result.getHours() === 9);
assert(result.getDate() === 10);
```

## 📊 Base de données

### Table `appointments` (tasks)

```sql
-- Exemple de tâche créée automatiquement
INSERT INTO appointments (
  id,
  type,
  title,
  assigned_user_id,
  contact_id,
  project_id,
  step,
  start_time,
  status,
  notes
) VALUES (
  uuid_generate_v4(),
  'task',
  'Envoyer formulaire RIB au client',
  '82be903d-9600-4c53-9cd4-113bfaaac12e', -- owner_id du prospect
  'cd73c227-1234-5678-9abc-def012345678', -- prospect_id
  'ACC',
  'Documents',
  '2025-12-09 09:00:00+00', -- Heure calculée selon règles
  'pending',
  'Tâche créée automatiquement par le prompt "Workflow ACC - Documents"'
);
```

## 🎯 Cas d'usage réels

### Scénario 1 : Workflow ACC - Documents
1. Client passe de "Inscription" → "Documents"
2. Déclenchement à **03h00** (traitement nocturne)
3. Tâche créée pour **09h00** le matin même
4. Commercial voit la tâche à son arrivée

### Scénario 2 : Workflow Centrale - Financement
1. Client complète formulaire technique à **14h30**
2. Étape auto-complétée → passage à "Financement"
3. Tâche créée **immédiatement à 14h30**
4. Commercial reçoit notification en temps réel

### Scénario 3 : Workflow Autonomie - Signature
1. Client termine questionnaire à **21h00**
2. Passage à étape "Signature contractuelle"
3. Tâche créée pour **09h00 le lendemain**
4. Commercial la voit le matin suivant

## 🚀 Prochaines étapes d'implémentation

### Phase 1 : Backend (Edge Function ou Trigger)
- [ ] Créer fonction `calculateTaskCreationTime()`
- [ ] Créer fonction `createAutomaticTask()`
- [ ] Ajouter trigger sur changement d'étape projet
- [ ] Tester avec différents horaires

### Phase 2 : Notifications
- [ ] Notifier le commercial quand tâche créée
- [ ] Afficher badge dans sidebar agenda
- [ ] Permettre de marquer la tâche comme complétée

### Phase 3 : Historique
- [ ] Logger la création automatique dans `project_history`
- [ ] Tracer qui a complété la tâche et quand
- [ ] Statistiques sur les délais de traitement

## 📝 Notes importantes

- **Fuseau horaire** : Toutes les heures sont en UTC. Adapter selon le fuseau du commercial si nécessaire.
- **Week-end** : Pour l'instant, pas de gestion spéciale. Une tâche déclenchée samedi à 3h sera créée samedi à 9h.
- **Jours fériés** : Pas de gestion pour le moment. À implémenter si besoin.
- **Suppression de tâches** : Si l'étape est annulée/modifiée, penser à supprimer la tâche associée.

---

**Date de création** : 9 décembre 2025  
**Status** : ✅ Interface prête | ⏳ Backend à implémenter  
**Fichiers concernés** :
- `src/pages/admin/ProfilePage.jsx` (interface de configuration)
- `src/hooks/useSupabaseAgenda.js` (CRUD tâches)
- À créer : Edge Function ou Trigger pour création auto
