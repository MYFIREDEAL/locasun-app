# Base d'Info par Module - Workflow V2

## Vue d'ensemble

La base d'info est un mapping local (JSON) qui contient les informations de référence pour chaque module du workflow. L'IA stub utilise cette base pour répondre aux questions NEED_DATA.

## Fichiers

| Fichier | Rôle |
|---------|------|
| `src/lib/moduleInfoBase.js` | Mapping JSON des infos par moduleId |
| `src/lib/aiStubModule.js` | IA stub qui utilise la base pour répondre |

## Structure des données

Chaque module est identifié par un `moduleId` et contient :

```javascript
{
  title: string,              // Nom affiché du module
  description: string,        // Description courte
  checklist: string[],        // Étapes à suivre
  faq: [                      // Questions fréquentes
    { question: string, answer: string }
  ],
  requiredDocuments: string[], // Documents nécessaires
  tips: string[],             // Conseils pratiques
  contacts: [                 // Contacts utiles
    { role: string, info: string }
  ]
}
```

## Modules documentés

| moduleId | Titre | Checklist | FAQ | Documents | Tips |
|----------|-------|-----------|-----|-----------|------|
| `appel-offre` | Appel d'offre | ✅ 5 items | ✅ 3 Q/R | ✅ 5 docs | ✅ 3 tips |
| `pdb` | PDB - Promesse de Bail | ✅ 6 items | ✅ 4 Q/R | ✅ 4 docs | ✅ 3 tips |
| `etude-technique` | Étude technique | ✅ 5 items | ✅ 2 Q/R | ✅ 3 docs | ✅ 2 tips |
| `raccordement` | Raccordement Enedis | ✅ 5 items | ✅ 2 Q/R | ✅ 3 docs | ✅ 2 tips |
| `mise-en-service` | Mise en service | ✅ 5 items | ✅ 1 Q/R | ✅ 3 docs | ✅ 1 tip |

---

## Exemple : Appel d'offre

```javascript
'appel-offre': {
  title: "Appel d'offre",
  description: "Étape de soumission à un appel d'offre pour un projet photovoltaïque...",
  
  checklist: [
    "Vérifier l'éligibilité du site (surface, orientation, ombrage)",
    "Préparer le dossier technique (plans, études)",
    "Calculer le tarif de vente proposé",
    "Soumettre avant la date limite",
    "Attendre la notification de résultat (2-3 mois)",
  ],
  
  faq: [
    {
      question: "Quel est le délai moyen de réponse ?",
      answer: "Les résultats sont généralement publiés 2 à 3 mois après la clôture..."
    },
    // ...
  ],
  
  requiredDocuments: [
    "Plan de masse du site",
    "Étude de faisabilité technique",
    // ...
  ],
  
  tips: [
    "💡 Soumettez au moins 48h avant la deadline...",
    // ...
  ],
  
  contacts: [
    { role: "Responsable appels d'offre", info: "ao@locasun.fr" },
  ],
}
```

---

## Exemple : PDB - Promesse de Bail

```javascript
'pdb': {
  title: "PDB - Promesse de Bail",
  description: "Signature de la promesse de bail avec le propriétaire...",
  
  checklist: [
    "Vérifier les informations du propriétaire",
    "Valider la durée du bail (généralement 20-30 ans)",
    "Confirmer le montant du loyer annuel",
    "Faire relire par le service juridique",
    "Envoyer pour signature électronique",
    "Archiver le document signé",
  ],
  
  faq: [
    {
      question: "Quelle est la durée standard d'un bail photovoltaïque ?",
      answer: "La durée standard est de 20 à 30 ans..."
    },
    {
      question: "Le propriétaire peut-il résilier le bail ?",
      answer: "Non, sauf en cas de manquement grave..."
    },
    // ...
  ],
  
  requiredDocuments: [
    "Pièce d'identité du propriétaire",
    "Titre de propriété ou attestation notariale",
    "RIB du propriétaire (pour les loyers)",
    "Plan cadastral de la parcelle",
  ],
  
  tips: [
    "💡 Vérifiez que le signataire est bien le propriétaire légal",
    "💡 En cas d'indivision, tous les propriétaires doivent signer",
    // ...
  ],
}
```

---

## Comportement de l'IA Stub

### Flux de réponse

```
┌─────────────────────────────────────────────────────────────┐
│                    Question utilisateur                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              1. Récupérer moduleInfo                         │
│              getModuleInfo(moduleId)                         │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
     ┌────────────────┐              ┌────────────────┐
     │   Info trouvée │              │  Pas d'info    │
     └────────────────┘              └────────────────┘
              │                               │
              ▼                               ▼
┌─────────────────────────┐       ┌─────────────────────────┐
│ 2. Détecter intention   │       │ Réponse: NO_INFO        │
│ detectIntent(query)     │       │ "Je n'ai pas d'infos..."│
└─────────────────────────┘       └─────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Répondre par intention                                    │
│                                                              │
│   checklist → Afficher checklist                            │
│   documents → Afficher requiredDocuments                    │
│   contact   → Afficher contacts                             │
│   tips      → Afficher tips                                 │
│   delay     → Chercher dans FAQ                             │
│   general   → Chercher dans FAQ                             │
└─────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Recherche FAQ                                             │
│ searchModuleFAQ(moduleId, query)                            │
└─────────────────────────────────────────────────────────────┘
              │
              ├─── Trouvé ──► Réponse: ANSWER
              │
              └─── Non trouvé ──► Réponse: CLARIFICATION
                                  "Pourriez-vous préciser...?"
```

### Types de réponses

| Type | Description | Données |
|------|-------------|---------|
| `ANSWER` | Réponse trouvée dans la FAQ | `message`, `source` |
| `CLARIFICATION` | Question de clarification | `message`, `availableTopics` |
| `CHECKLIST` | Affichage de la checklist | `data: string[]` |
| `DOCUMENTS` | Liste des documents | `data: string[]` |
| `TIPS` | Conseils pratiques | `data: string[]` |
| `CONTACT` | Infos de contact | `data: {role, info}[]` |
| `NO_INFO` | Module sans infos | `message` |

---

## Utilisation dans useWorkflowV2

```javascript
import { askAI, getWelcomeMessage } from '@/lib/aiStubModule';

// Message de bienvenue au chargement du module
const welcome = getWelcomeMessage(activeStep?.id, activeStep?.name);

// Répondre à une question NEED_DATA
const handleAskAI = (query) => {
  const response = askAI({
    moduleId: activeStep?.id,
    moduleName: activeStep?.name,
    query,
    context: { prospect, projectType }
  });
  
  // response.type = 'answer' | 'clarification' | 'checklist' | ...
  // response.message = texte à afficher
  // response.suggestions = boutons de suggestion
};
```

---

## Ajouter un nouveau module

1. Ouvrir `src/lib/moduleInfoBase.js`
2. Ajouter une entrée dans `MODULE_INFO_BASE` :

```javascript
'nouveau-module': {
  title: "Nom du module",
  description: "Description courte",
  checklist: [...],
  faq: [...],
  requiredDocuments: [...],
  tips: [...],
  contacts: [...],
}
```

3. Le stub IA utilisera automatiquement ces infos

---

## Phase 2+ (futur)

- [ ] Charger la base depuis Supabase (`module_info_base` table)
- [ ] Intégration GPT/Claude avec RAG
- [ ] Enrichissement automatique par apprentissage
- [ ] Analytics sur les questions sans réponse
