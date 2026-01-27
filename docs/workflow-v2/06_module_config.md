# Configuration IA par Module - Workflow V2

## Vue d'ensemble

Permet de définir le comportement de l'IA pour chaque module du workflow, sans base de données. Les configurations sont stockées en mémoire (session uniquement).

## Fichiers

| Fichier | Rôle |
|---------|------|
| `src/lib/moduleAIConfig.js` | Modèle de config + configs par défaut |
| `src/components/admin/workflow-v2/ModuleConfigPanel.jsx` | UI d'édition |

---

## Structure de la config

```typescript
interface ModuleAIConfig {
  // Objectif principal du module
  objective: string;
  
  // Instructions détaillées pour l'IA
  instructions: string;
  
  // Labels personnalisés des boutons
  buttonLabels: {
    proceedLabel: string;    // Ex: "Soumettre le dossier"
    needDataLabel: string;   // Ex: "Question sur l'AO"
  };
  
  // Actions que l'IA peut effectuer
  allowedActions: string[];  // Ex: ['answer_question', 'show_checklist']
  
  // Clé vers la base d'info (moduleInfoBase.js)
  knowledgeKey: string;      // Ex: 'appel-offre'
  
  // Ton de l'IA
  tone: 'professional' | 'friendly' | 'technical' | 'reassuring' | 'enthusiastic';
  
  // Longueur max des réponses (caractères)
  maxResponseLength: number; // Ex: 500
}
```

---

## Exemple : Appel d'offre investisseurs

```javascript
'appel-offre-investisseurs': {
  objective: "Guider l'investisseur dans la soumission de son dossier d'appel d'offre photovoltaïque",
  
  instructions: `Tu es un expert en appels d'offre CRE (Commission de Régulation de l'Énergie).
  
Ton rôle:
- Expliquer le processus de soumission
- Vérifier que le dossier est complet
- Répondre aux questions sur les critères d'éligibilité
- Aider à calculer le tarif de vente optimal

Règles:
- Ne jamais inventer de chiffres ou de dates
- Toujours vérifier les informations avant de répondre
- Si incertain, demander confirmation à l'équipe technique`,
  
  buttonLabels: {
    proceedLabel: "Soumettre le dossier",
    needDataLabel: "Question sur l'AO",
  },
  
  allowedActions: [
    'answer_question',
    'show_checklist',
    'show_documents',
    'calculate_tariff',
    'check_eligibility',
  ],
  
  knowledgeKey: 'appel-offre',
  tone: 'professional',
  maxResponseLength: 600,
}
```

---

## Modules préconfigurés

| moduleId | Objectif | Ton |
|----------|----------|-----|
| `appel-offre-investisseurs` | Soumission AO investisseur | Professional |
| `appel-offre` | Soumission AO générique | Professional |
| `pdb` | Signature promesse de bail | Reassuring |
| `etude-technique` | Faisabilité technique | Technical |
| `raccordement` | Demande Enedis | Professional |
| `mise-en-service` | Activation installation | Enthusiastic |

---

## Utilisation

### Récupérer la config d'un module

```javascript
import { getModuleAIConfig } from '@/lib/moduleAIConfig';

const config = getModuleAIConfig('appel-offre');
// Retourne la config fusionnée avec les valeurs par défaut

console.log(config.buttonLabels.proceedLabel);
// → "Valider la soumission"
```

### Mettre à jour une config (in-memory)

```javascript
import { updateModuleAIConfig } from '@/lib/moduleAIConfig';

updateModuleAIConfig('appel-offre', {
  objective: "Nouvel objectif",
  buttonLabels: {
    proceedLabel: "Nouveau label",
  },
});
// ⚠️ Temporaire (session uniquement)
```

### Afficher le panel d'édition

```jsx
import { ModuleConfigPanel, ModuleConfigButton } from '@/components/admin/workflow-v2';

function MyComponent() {
  const [configOpen, setConfigOpen] = useState(false);
  
  return (
    <>
      <ModuleConfigButton onClick={() => setConfigOpen(true)} />
      
      <ModuleConfigPanel
        moduleId="appel-offre"
        moduleName="Appel d'offre"
        isOpen={configOpen}
        onClose={() => setConfigOpen(false)}
        onSave={(config) => console.log('Saved:', config)}
      />
    </>
  );
}
```

---

## UI du Panel

Le panel d'édition propose 5 sections collapsibles :

1. **Objectif** — Texte libre pour l'objectif du module
2. **Instructions IA** — Instructions détaillées + sélection du ton
3. **Labels des boutons** — PROCEED et NEED_DATA
4. **Actions autorisées** — Tags éditables
5. **Paramètres avancés** — Longueur max, etc.

### Capture d'écran (structure)

```
┌─────────────────────────────────────────┐
│ ⚙️ Config IA Module                    ✕│
│    Appel d'offre                        │
├─────────────────────────────────────────┤
│ ⚠️ Mode READ_ONLY : modifications temp. │
├─────────────────────────────────────────┤
│ ✨ Objectif                           ▼ │
│   ┌─────────────────────────────────┐   │
│   │ Guider l'investisseur dans...   │   │
│   └─────────────────────────────────┘   │
│                                         │
│ 💬 Instructions IA                    ▼ │
│   ┌─────────────────────────────────┐   │
│   │ Tu es un expert en appels...    │   │
│   └─────────────────────────────────┘   │
│   Ton: [💼 Professionnel        ▼]      │
│                                         │
│ ⚡ Labels des boutons                 ▶ │
│ 📖 Actions autorisées                 ▶ │
│ ⚙️ Paramètres avancés                 ▶ │
├─────────────────────────────────────────┤
│ [↺ Annuler]              [💾 Sauvegarder]│
└─────────────────────────────────────────┘
```

---

## Wiring : ModuleLiveCard ↔ Config IA

La configuration est automatiquement connectée à `ModuleLiveCard`. Le composant :

1. **Charge la config** au montage via `getModuleAIConfig(moduleId)`
2. **Résout les labels** : `props > config > DEFAULT_BUTTON_LABELS`
3. **Affiche les instructions** comme message IA initial
4. **Utilise knowledgeKey** pour contextualiser le bouton NEED_DATA

### Flux de résolution

```
┌─────────────────────────────────────────────────────────────────┐
│                      ModuleLiveCard                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   moduleId ─────► getModuleAIConfig(moduleId)                   │
│                           │                                     │
│                           ▼                                     │
│              ┌────────────────────────┐                         │
│              │   moduleConfig =       │                         │
│              │   { instructions,      │                         │
│              │     buttonLabels,      │                         │
│              │     knowledgeKey,      │                         │
│              │     ... }              │                         │
│              └───────────┬────────────┘                         │
│                          │                                      │
│   ┌──────────────────────┼──────────────────────┐               │
│   │                      │                      │               │
│   ▼                      ▼                      ▼               │
│ proceedLabel        needDataLabel        effectiveInitialMsg    │
│ = props ||          = props ||           = props.initialMessage │
│   config ||           config ||            || config.instructions│
│   DEFAULT             DEFAULT              || fallback           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Code simplifié

```jsx
// ModuleLiveCard.jsx
const moduleConfig = getModuleAIConfig(moduleId);

const proceedLabel = propProceedLabel 
  || moduleConfig.buttonLabels?.proceedLabel 
  || DEFAULT_BUTTON_LABELS.proceed;

const needDataLabel = propNeedDataLabel 
  || moduleConfig.buttonLabels?.needDataLabel 
  || DEFAULT_BUTTON_LABELS.needData;

const effectiveInitialMessage = initialMessage 
  || moduleConfig.instructions 
  || "Bonjour ! Je suis là pour vous accompagner...";
```

### Bouton NEED_DATA + knowledgeKey

Quand `knowledgeKey` est défini, le message système est enrichi :

```jsx
// handleNeedData()
if (moduleConfig.knowledgeKey) {
  messageContent = `📚 **Base de connaissance : ${moduleConfig.knowledgeKey}**\n\n` +
    `Je vais consulter les informations disponibles...`;
}
```

---

## Contraintes respectées

| Contrainte | Status |
|------------|--------|
| Aucun import V1 | ✅ |
| Aucun write DB | ✅ (in-memory uniquement) |
| Pas de routing | ✅ |
| READ_ONLY | ✅ (avertissement affiché) |

---

## Actions autorisées (référence)

| Action | Description |
|--------|-------------|
| `answer_question` | Répondre aux questions |
| `show_checklist` | Afficher la checklist |
| `show_documents` | Lister les documents requis |
| `explain_clause` | Expliquer une clause (juridique) |
| `verify_owner` | Vérifier propriétaire (PDB) |
| `calculate_tariff` | Calculer tarif (AO) |
| `check_eligibility` | Vérifier éligibilité |
| `explain_technical` | Expliquer aspect technique |
| `final_check` | Vérification finale |

---

## Phase 2+ (avec DB)

Pour persister les configs :

1. Créer table `module_ai_config` (voir `05_supabase_migrations.md`)
2. Modifier `getModuleAIConfig()` pour charger depuis Supabase
3. Modifier `updateModuleAIConfig()` pour sauvegarder en DB
4. Garder le JSON comme fallback
