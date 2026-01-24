# PR-2: ModuleBoundary Standard

## Objectif
Isoler les crashes par zone pour éviter que toute l'app plante + logs exploitables.

## Composant créé

### `src/components/ModuleBoundary.jsx`

ErrorBoundary React avec :
- **Fallback minimal** : icône erreur + message + boutons
- **ErrorId unique** : `ERR-{timestamp}-{random}` pour traçabilité
- **Bouton Retry** : reset l'état d'erreur pour retenter le rendu
- **Bouton Accueil** : retour au pipeline
- **Logs structurés** : via `logger.error()` avec stack trace
- **Sentry ready** : intégration si `window.Sentry` disponible
- **Dev mode** : affiche le message d'erreur en mode développement

## Zones wrappées

| Zone | Fichier | Boundary Name | Pourquoi |
|------|---------|---------------|----------|
| **Admin Pages** | `AdminLayout.jsx` | `"Admin Page"` | Couvre toutes les pages admin (Pipeline, Agenda, Config, etc.) via l'Outlet |
| **Fiche Prospect** | `FinalPipeline.jsx` | `"Fiche Prospect"` | Isole le drawer/modal prospect - zone complexe avec chat, formulaires, contrats |
| **Espace Client** | `ClientLayout.jsx` | `"Espace Client"` | Couvre le dashboard client et ses sous-pages |

## Diagramme

```
┌─────────────────────────────────────────────────────────┐
│ App.jsx (global error handling)                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ AdminLayout                                         │ │
│ │ ┌───────────────────────────────────────────────┐   │ │
│ │ │ ModuleBoundary name="Admin Page"              │   │ │
│ │ │ ┌───────────────────────────────────────────┐ │   │ │
│ │ │ │ FinalPipeline                             │ │   │ │
│ │ │ │ ┌───────────────────────────────────────┐ │ │   │ │
│ │ │ │ │ ModuleBoundary name="Fiche Prospect"  │ │ │   │ │
│ │ │ │ │ └─ ProspectDetailsAdmin               │ │ │   │ │
│ │ │ │ └───────────────────────────────────────┘ │ │   │ │
│ │ │ └───────────────────────────────────────────┘ │   │ │
│ │ └───────────────────────────────────────────────┘   │ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ClientLayout                                        │ │
│ │ ┌───────────────────────────────────────────────┐   │ │
│ │ │ ModuleBoundary name="Espace Client"           │   │ │
│ │ │ └─ ClientDashboardPage / OffersPage / etc     │   │ │
│ │ └───────────────────────────────────────────────┘   │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Smoke Test

### Forcer une erreur contrôlée (dev only)

1. Dans `src/components/admin/ProspectDetailsAdmin.jsx`, ajouter temporairement en haut du composant :
```jsx
// 🧪 TEST: Décommenter pour tester ModuleBoundary
// throw new Error('Test ModuleBoundary - Fiche Prospect crash');
```

2. Ouvrir une fiche prospect dans le pipeline
3. **Attendu** : 
   - Écran "Module Fiche Prospect a rencontré une erreur"
   - ErrorId affiché (ex: `ERR-1706134567890-A3F2`)
   - Boutons "Accueil" et "Réessayer" fonctionnels
   - Console : log structuré avec stack trace

4. **Retirer le throw après test**

### Vérifier l'isolation

1. Provoquer une erreur dans la fiche prospect
2. **Attendu** : 
   - La fiche crash mais le header et la navigation restent fonctionnels
   - Clic "Accueil" ramène au pipeline
   - Clic "Réessayer" retente le rendu (si l'erreur est corrigée, ça marche)

## Fichiers modifiés

```
src/components/ModuleBoundary.jsx     (NEW)  - ErrorBoundary réutilisable
src/layouts/AdminLayout.jsx           (+2)   - Import + wrap Outlet
src/layouts/ClientLayout.jsx          (+4)   - Import + wrap Outlet
src/pages/admin/FinalPipeline.jsx     (+4)   - Import + wrap ProspectDetailsAdmin
```

## Rollback

Si problème, retirer les `<ModuleBoundary>` wrappers et les imports. Le composant `ModuleBoundary.jsx` peut rester sans effet s'il n'est pas utilisé.

## Prochaines améliorations (optionnel)

- [ ] Ajouter Sentry DSN en production
- [ ] Bouton "Signaler" pour envoyer un rapport d'erreur
- [ ] Retry avec exponential backoff
- [ ] Tracker les errorIds les plus fréquents
