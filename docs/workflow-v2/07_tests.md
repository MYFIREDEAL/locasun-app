# Tests Workflow V2 - Checklist Phase 1

## Vue d'ensemble

Ce document liste tous les tests manuels à effectuer pour valider que le Workflow V2 respecte les contraintes Phase 1 (READ_ONLY).

---

## 🔒 Prérequis

Avant de tester, vérifier dans la console :
```
[V2 SECURITY] 🔐 Vérifications de sécurité:
{
  readOnlyMode: true,
  mockProceed: true,
  routingDisabled: true,
  status: '✅ Toutes les protections actives'
}
```

---

## ✅ Checklist des tests

### 1. IMPORTS INTERDITS

| Test | Commande | Résultat attendu |
|------|----------|------------------|
| Vérifier aucun import V1 | `grep -rE "useWorkflowExecutor\|useWorkflowActionTrigger\|completeStepAndProceed\|executeContractSignatureAction" src/components/admin/workflow-v2/` | Aucune correspondance |
| Vérifier WorkflowV2Page | `grep -rE "useWorkflowExecutor\|useWorkflowActionTrigger" src/pages/admin/WorkflowV2Page.jsx` | Aucune correspondance |

### 2. PROCEED N'ÉCRIT RIEN

| Test | Action | Résultat attendu |
|------|--------|------------------|
| Clic sur PROCEED | Cliquer sur "Valider et continuer" | Toast "PROCEED (simulation)" affiché |
| Console PROCEED | Vérifier console | `[V2 PROCEED] 🔒 Mode READ_ONLY - Action simulée` |
| Base de données | Vérifier Supabase | Aucune modification dans `project_steps_status` |
| Étape suivante | Observer la navigation | Reste sur la même étape (pas de routing) |

### 3. NEED_DATA N'ÉCRIT RIEN

| Test | Action | Résultat attendu |
|------|--------|------------------|
| Clic sur NEED_DATA | Cliquer sur "J'ai besoin d'infos" | Message système dans le chat |
| Console NEED_DATA | Vérifier console | `[V2 NEED_DATA] 🔒 Mode READ_ONLY - Action simulée` |
| Chat Supabase | Vérifier `chat_messages` | Aucun nouveau message en DB |

### 4. NAVIGATION

| Test | Action | Résultat attendu |
|------|--------|------------------|
| Retour pipeline | Cliquer "Retour au pipeline" | Navigation vers `/admin/pipeline` ✅ |
| Clic module terminé | Cliquer sur un module vert | Navigation locale (état) sans routing |
| Clic module à venir | Cliquer sur module grisé | Aucune action |

### 5. LOGS CONSOLE

| Test | Résultat attendu |
|------|------------------|
| Mount page | `[V2 SECURITY] 🔐 Vérifications de sécurité: {...}` |
| Clic PROCEED | `[V2 PROCEED] ✅ Vérification: Aucune écriture` |
| Clic module | `[V2] navigateToStep: {...}` |
| Message chat | `[V2] ModuleLiveCard: Message envoyé {...}` |

### 6. UI READ_ONLY

| Test | Vérification |
|------|--------------|
| Badge READ_ONLY | Affiché dans le header |
| Actions possibles | Section collapsible avec mention "Ce que l'IA pourra faire plus tard" |
| Mode simulation | Texte "💡 Mode simulation" visible |

---

## 🧪 Scénarios de test

### Scénario A : Parcours complet READ_ONLY

1. Accéder à `/admin/workflow-v2/{prospectId}/centrale`
2. Vérifier que la page charge sans erreur
3. Vérifier le badge READ_ONLY
4. Cliquer sur PROCEED → toast simulation
5. Vérifier que l'étape n'a pas changé
6. Cliquer sur NEED_DATA → message système
7. Poser une question dans le chat → réponse IA stub
8. Cliquer sur "Actions IA possibles" → liste s'affiche
9. Retour pipeline → navigation OK

### Scénario B : Vérification DB

1. Ouvrir Supabase Dashboard
2. Aller dans `project_steps_status`
3. Noter le timestamp de la dernière modification
4. Effectuer plusieurs clics PROCEED sur la page V2
5. Vérifier que le timestamp n'a pas changé

### Scénario C : Vérification imports

```bash
# Exécuter depuis la racine du projet
grep -rE "useWorkflowExecutor|useWorkflowActionTrigger|completeStepAndProceed|executeContractSignatureAction|handleSelectPrompt" \
  src/components/admin/workflow-v2/ \
  src/pages/admin/WorkflowV2Page.jsx \
  src/hooks/useWorkflowV2.js \
  2>/dev/null || echo "✅ Aucun import V1 détecté"
```

---

## 🔴 Tests de régression (à NE PAS casser)

| Fonctionnalité V1 | Vérification |
|-------------------|--------------|
| Pipeline classique | `/admin/pipeline` fonctionne normalement |
| ProspectDetailsAdmin | Workflow V1 inchangé |
| Contrats | Génération contrats V1 inchangée |
| Chat existant | Messages V1 non impactés |

---

## 📊 Rapport de sécurité

Exécuter dans la console browser :

```javascript
// Import dynamique pour test
import('/src/lib/workflowV2Config.js').then(m => m.generateSecurityReport())
```

Résultat attendu :
```javascript
{
  timestamp: "2026-01-27T...",
  phase: "Phase 1 - READ_ONLY",
  config: {
    enabled: true,
    readOnlyMode: true,
    mockProceed: true,
    disableRouting: true
  },
  guards: {
    writeBlocked: true,
    proceedMocked: true,
    routingBlocked: true
  },
  status: "OK"
}
```

---

## ✅ Validation finale

Avant de passer en Phase 2, tous ces critères doivent être verts :

- [ ] Aucun import V1 dans les fichiers V2
- [ ] PROCEED ne modifie pas la DB
- [ ] NEED_DATA ne modifie pas la DB
- [ ] Pas de routing automatique
- [ ] Logs clairs dans la console
- [ ] UI affiche clairement le mode READ_ONLY
- [ ] V1 non impacté (tests de régression OK)

---

## 📝 Notes

- **Auteur** : Copilot
- **Date** : 27 janvier 2026
- **Version** : Phase 1 (READ_ONLY)
- **Prochaine étape** : Activer les actions réelles (Phase 2)
