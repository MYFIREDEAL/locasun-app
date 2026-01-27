# Pattern Module Live

> Documentation du composant `ModuleLiveCard` — Workflow V2

## Concept

Le **Module Live** est un pattern de carte interactive qui combine :
- 🤖 **Message IA dynamique** (non figé, contextuel)
- 💬 **Chat UI minimal** (questions/réponses)
- 🎯 **2 boutons max** : PROCEED et NEED_DATA

### Principes clés

1. **L'IA guide** — Le message initial oriente l'utilisateur
2. **Interaction libre** — L'utilisateur peut poser des questions
3. **Pas de blocage** — NEED_DATA n'est jamais bloquant
4. **Action unique** — PROCEED déclenche une seule action

---

## Exemple canonique : "Appel d'offre investisseurs"

### Contexte

L'admin prépare un appel d'offre pour trouver des investisseurs sur un projet de centrale solaire.

### Message IA initial

```
Bonjour ! 👋

Je vais vous aider à préparer l'appel d'offre investisseurs pour le projet "Centrale Photovoltaïque - Marseille".

📊 **Éléments disponibles :**
- Surface : 2 500 m²
- Puissance estimée : 450 kWc
- Rentabilité prévisionnelle : 8,2%

📋 **Actions possibles :**
- Cliquez sur "Besoin d'infos" si vous avez des questions
- Cliquez sur "Lancer l'appel" quand vous êtes prêt

Que souhaitez-vous savoir avant de lancer ?
```

### Boutons

| Bouton | Label | Action |
|--------|-------|--------|
| NEED_DATA | "Besoin d'infos" | Ouvre la discussion, l'IA répond |
| PROCEED | "Lancer l'appel" | Déclenche `onProceed()` |

### Implémentation

```jsx
import ModuleLiveCard from '@/components/admin/workflow-v2/ModuleLiveCard';

<ModuleLiveCard
  moduleId="appel-offre-investisseurs"
  moduleName="Appel d'offre investisseurs"
  moduleIcon="📈"
  initialMessage={`Bonjour ! 👋

Je vais vous aider à préparer l'appel d'offre investisseurs pour le projet "${prospect.name}".

📊 **Éléments disponibles :**
- Surface : ${project.surface} m²
- Puissance estimée : ${project.power} kWc
- Rentabilité prévisionnelle : ${project.roi}%

📋 **Actions possibles :**
- Cliquez sur "Besoin d'infos" si vous avez des questions
- Cliquez sur "Lancer l'appel" quand vous êtes prêt

Que souhaitez-vous savoir avant de lancer ?`}
  
  proceedLabel="Lancer l'appel"
  needDataLabel="Besoin d'infos"
  
  onProceed={async () => {
    console.log('[V2] Appel d'offre lancé (mock)');
    // Phase 2 : Ici on déclenchera la vraie action
  }}
  
  onAskAI={async (question) => {
    // Phase 1 : Réponse stub
    // Phase 2 : Appel à Charly AI
    return `Je comprends votre question sur "${question}". 
    En mode simulation, je ne peux pas accéder aux données réelles.
    En production, je vous donnerais une réponse contextuelle.`;
  }}
/>
```

---

## Props

| Prop | Type | Requis | Description |
|------|------|--------|-------------|
| `moduleId` | `string` | ✅ | ID unique du module |
| `moduleName` | `string` | ✅ | Nom affiché |
| `moduleIcon` | `string` | ❌ | Emoji (défaut: 📋) |
| `initialMessage` | `string` | ✅ | Message IA initial (dynamique) |
| `onProceed` | `() => void` | ✅ | Callback PROCEED |
| `onAskAI` | `(q: string) => Promise<string>` | ❌ | Callback custom réponse IA |
| `proceedLabel` | `string` | ❌ | Label PROCEED (défaut: "Continuer") |
| `needDataLabel` | `string` | ❌ | Label NEED_DATA (défaut: "Besoin d'infos") |
| `disabled` | `boolean` | ❌ | Désactive les interactions |

---

## Comportements

### NEED_DATA

1. L'utilisateur clique
2. Un message système s'affiche : "Posez votre question..."
3. L'utilisateur tape une question
4. L'IA répond (stub ou `onAskAI`)
5. **Aucun état projet n'est modifié**

### PROCEED

1. L'utilisateur clique
2. Loading state (spinner)
3. `onProceed()` est appelé
4. Message de confirmation affiché
5. **En Phase 1 : stub uniquement**
6. **En Phase 2 : action réelle déclenchée**

---

## États visuels

| État | Indicateur |
|------|------------|
| Typing IA | 3 points animés |
| Loading PROCEED | Spinner sur bouton |
| Message user | Bulle bleue à droite |
| Message IA | Bulle grise à gauche + avatar bot |

---

## Intégration dans Workflow V2

```jsx
// Dans WorkflowV2Page.jsx ou ModulePanel.jsx

import ModuleLiveCard from '@/components/admin/workflow-v2/ModuleLiveCard';

// Pour remplacer une section statique par une carte interactive
{activeStep?.type === 'live' && (
  <ModuleLiveCard
    moduleId={activeStep.id}
    moduleName={activeStep.name}
    moduleIcon={activeStep.icon}
    initialMessage={activeStep.aiPrompt}
    onProceed={handleProceed}
    proceedLabel={activeStep.proceedLabel || 'Continuer'}
    needDataLabel={activeStep.needDataLabel || 'Besoin d\'infos'}
  />
)}
```

---

## Phase 2 (futur)

- [ ] Connecter `onAskAI` à Charly AI
- [ ] Connecter `onProceed` aux vraies actions workflow
- [ ] Historique chat persisté en DB
- [ ] Contexte projet injecté dans les réponses IA
