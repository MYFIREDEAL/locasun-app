# TODO - Système de Prompts & Workflow

## ✅ Terminé (9 décembre 2025)

### Interface ProfilePage
- [x] Checkbox "Action associée au client" pour chaque action
- [x] Si OUI : Message, Type, Mode de gestion (IA/Commercial), Mode de vérification (Aucune/IA/Humain)
- [x] Si NON : Checklist de tâches pour le commercial
- [x] Type "Demander un document" avec champ documentType
- [x] Mode de vérification universel pour TOUS les types d'actions

### Backend useAutoCreateTasks
- [x] Détection actions sans client (hasClientAction=false) → Crée tâche avec checklist
- [x] Actions avec client + Mode Commercial → Crée tâche pour le commercial
- [x] Règles horaires 9h-19h appliquées
- [x] Fonction helper createTask() pour éviter duplication

### Commits
- `867ad4c` - Système de workflow complet pour les prompts
- `30cb525` - Mode de vérification universel pour toutes les actions
- `351e6c6` - Backend: Gestion des actions sans client (checklist)

---

## 🔴 À FAIRE - Prochaine session

### 1. Hook pour Mode de Vérification "Humain"

**Créer nouveau hook : `useAutoVerificationTasks.js`**

**Fonctionnalité :**
- Écouter les soumissions de formulaires (table `client_form_panels` → status='pending_approval')
- Écouter les uploads de documents (table `files` ou système d'upload client)
- Quand client soumet ET `verificationMode='human'` :
  - Créer tâche immédiatement : "Vérifier [formulaire/document] de {prospect}"
  - Pas de règles 9h-19h (peut arriver à tout moment)
  - Tâche assignée au commercial (owner_id du prospect)

**Tables Supabase à surveiller :**
```sql
-- Pour formulaires
SELECT * FROM client_form_panels 
WHERE status = 'pending_approval'

-- Pour documents (à vérifier la table exacte)
SELECT * FROM files 
WHERE uploaded_by = 'client' AND verified = false
```

**Structure tâche :**
```javascript
{
  type: 'task',
  title: 'Vérifier le formulaire de {prospect}',
  assigned_user_id: prospect.owner_id,
  contact_id: prospect_id,
  project_id: project_type,
  step: stepName,
  start_time: new Date().toISOString(), // Immédiat
  end_time: ..., // +30 min
  status: 'pending',
  notes: 'Mode de vérification: Humain\nType: [Formulaire/Document]\nNom: [...]'
}
```

**Intégration :**
- Ajouter `useAutoVerificationTasks(prompts)` dans `App.jsx`
- Le hook doit récupérer le prompt pour savoir si `verificationMode='human'`

---

### 2. Affichage Checklist dans Fiche Prospect

**Fichier :** `src/pages/admin/FinalPipeline.jsx` (ou composant de détail prospect)

**Fonctionnalité :**
- Sous l'étape "En cours", afficher la checklist si l'action a `hasClientAction=false`
- Format :
```
🔎 Etude (En cours)
  ☐ Analyser la facture EDF
  ☐ Calculer la puissance nécessaire
  ☐ Préparer le devis personnalisé
```

**Interactions :**
- Commercial peut cocher les items directement
- Quand tous cochés → Bouton "✅ Valider l'étape" apparaît
- Synchroniser avec la tâche dans l'agenda (cocher item = progress dans la tâche)

---

### 3. Mode IA Automatique (Phase 2)

**Quand l'IA sera prête :**

**Mode de gestion : "IA automatique"**
- Déclencher envoi automatique du message/formulaire/document au client
- Pas d'attente, pas de tâche pour le commercial
- Fonctionne H24 (pas de règles 9h-19h)

**Mode de vérification : "IA automatique"**
- L'IA analyse les réponses du formulaire
- L'IA vérifie le document uploadé
- Validation/Refus automatique avec message au client
- Pas de tâche créée pour le commercial

**Nécessite :**
- API d'analyse IA (ChatGPT, Claude, etc.)
- Système de prompts pour validation
- Extraction de données des documents (OCR, etc.)

---

## 📋 Structure Données Actuelles

### Table `prompts`
```javascript
{
  id: "...",
  name: "Test enedis",
  project_id: "autonome",
  steps_config: {
    "0": {
      actions: [
        {
          id: "action-...",
          hasClientAction: true/false,
          
          // Si hasClientAction = true
          message: "Texte du message",
          type: "show_form|request_document|start_signature|open_payment",
          formId: "form-...", // Si type='show_form'
          documentType: "Facture EDF", // Si type='request_document'
          managementMode: "automatic|manual",
          verificationMode: "none|ai|human",
          createTask: true/false, // Si managementMode='manual'
          taskTitle: "Action requise pour ce client",
          
          // Si hasClientAction = false
          checklist: [
            { id: "task-...", text: "Analyser la facture" },
            { id: "task-...", text: "Calculer la puissance" }
          ]
        }
      ],
      autoCompleteStep: true/false // Pour formulaires uniquement
    }
  }
}
```

### Table `appointments` (tâches)
```javascript
{
  type: 'task',
  title: 'Tâche pour testsupabase',
  assigned_user_id: '...', // UUID du commercial
  contact_id: '...', // UUID du prospect
  project_id: 'autonome',
  step: 'Etude',
  start_time: '2025-12-09T15:30:00Z',
  end_time: '2025-12-09T16:00:00Z',
  status: 'pending',
  notes: '☐ Tâche 1\n☐ Tâche 2' // Checklist ou titre personnalisé
}
```

---

## 🎯 Commandes pour Continuer

**Pour reprendre le travail :**
```
Continue le job sur les prompts : implémente le hook useAutoVerificationTasks 
pour créer des tâches quand le client soumet un formulaire/document avec 
verificationMode='human'
```

**Ou :**
```
Continue le job sur les prompts : ajoute l'affichage de la checklist dans 
la fiche détail prospect sous l'étape en cours
```

---

## 📝 Notes Techniques

- Timezone : Utilise actuellement `new Date()` (local), à améliorer plus tard avec timezone du commercial
- Règles horaires : 9h-19h appliquées seulement pour tâches de démarrage d'étape, pas pour vérifications
- Checklist format : `☐ Texte` dans le champ `notes` de la tâche
- Real-time : Tous les hooks utilisent Supabase real-time channels
- RLS : Vérifier que les policies permettent l'insertion de tâches depuis le frontend

---

**Dernière mise à jour :** 9 décembre 2025
**Commits principaux :** 867ad4c, 30cb525, 351e6c6
