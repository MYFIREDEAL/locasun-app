# PR-1: Boot Anti-Race

> **Objectif** : Supprimer les écrans blancs / spinners infinis dus au gating incohérent (authLoading vs adminReady vs organizationId).

---

## 📦 Fichiers modifiés

| Fichier | Type | Description |
|---------|------|-------------|
| `src/App.jsx` | ✏️ Modifié | Ajout machine d'état `bootStatus`, écrans de chargement/erreur intelligents |
| `src/contexts/OrganizationContext.jsx` | ✏️ Modifié | Ajout timeout 10s sur `resolve_organization_from_host` |
| `src/layouts/AdminLayout.jsx` | ✏️ Modifié | Gating basé sur `organizationError`, écran erreur dédié |

---

## 🎯 Explication du `bootStatus`

### Avant (booléens dispersés)

```jsx
// Problème : 3 booléens non synchronisés
authLoading          // true pendant getSession/loadAuthUser
adminReady           // true quand activeAdminUser est défini
organizationLoading  // true pendant resolve_organization_from_host

// Race condition possible :
// - organizationLoading = false (résolu)
// - authLoading = false (terminé)
// - adminReady = false (user pas encore chargé)
// → AdminLayout affiche spinner, mais hooks Supabase démarrent déjà
```

### Après (machine d'état unifiée)

```jsx
const BOOT_STATUS = {
  INIT: 'init',              // App vient de monter
  RESOLVING_ORG: 'resolving_org',  // Résolution hostname → org_id
  AUTH: 'auth',              // Vérification session Supabase
  LOADING_USER: 'loading_user',    // Chargement profil admin/client
  READY: 'ready',            // ✅ Tout OK, app fonctionnelle
  ERROR: 'error'             // ❌ Échec (timeout, réseau)
};

// Transitions déterministes :
// INIT → RESOLVING_ORG (automatique au mount)
// RESOLVING_ORG → AUTH (quand organizationReady = true)
// RESOLVING_ORG → ERROR (timeout 10s)
// AUTH → LOADING_USER (session trouvée)
// AUTH → READY (pas de session = route publique)
// LOADING_USER → READY (profil chargé)
```

### Diagramme

```
┌─────────┐
│  INIT   │
└────┬────┘
     │ (automatique)
     ▼
┌──────────────┐
│ RESOLVING_ORG│ ──timeout 10s──▶ ┌───────┐
└──────┬───────┘                   │ ERROR │
       │ organizationReady         └───────┘
       ▼
┌─────────┐
│  AUTH   │
└────┬────┘
     │ session?
     ├──yes──▶ ┌──────────────┐
     │         │ LOADING_USER │
     │         └──────┬───────┘
     │                │ profile loaded
     ▼                ▼
┌─────────────────────┐
│        READY        │
└─────────────────────┘
```

---

## 🔄 Timeout Organization

**Fichier :** `src/contexts/OrganizationContext.jsx`

```jsx
const ORGANIZATION_TIMEOUT_MS = 10000; // 10 secondes

// Si resolve_organization_from_host ne répond pas en 10s :
// → organizationError = "Délai de connexion dépassé..."
// → organizationLoading = false
// → Écran d'erreur affiché avec bouton "Réessayer"
```

**Comportement :**
- ✅ Résolution normale < 10s : aucun changement visible
- ⚠️ Résolution lente (5-10s) : message "Cela peut prendre quelques secondes..."
- ❌ Timeout > 10s : écran d'erreur avec détails techniques + boutons

---

## 🖥️ Écrans ajoutés

### 1. Écran de chargement intelligent (App.jsx)

```
┌────────────────────────────────────┐
│                                    │
│         [Spinner animé]            │
│                                    │
│   "Connexion au serveur..."        │
│   "Cela peut prendre quelques      │
│    secondes..."                    │
│                                    │
└────────────────────────────────────┘
```

Messages dynamiques selon `bootStatus` :
- `RESOLVING_ORG` → "Connexion au serveur..."
- `AUTH` → "Vérification de la session..."
- `LOADING_USER` → "Chargement du profil..."

### 2. Écran d'erreur (App.jsx / AdminLayout.jsx)

```
┌────────────────────────────────────┐
│                                    │
│         ⚠️ [Icône warning]         │
│                                    │
│   "Connexion impossible"           │
│                                    │
│   "Le serveur ne répond pas..."    │
│                                    │
│   ┌──────────┐  ┌────────────────┐ │
│   │ Réessayer│  │ Retour accueil │ │
│   └──────────┘  └────────────────┘ │
│                                    │
│   Détails techniques :             │
│   Boot status: error               │
│   Organization: non résolue        │
│                                    │
└────────────────────────────────────┘
```

---

## 🧪 Smoke Test dédié : Login → /admin/pipeline

### Scénario normal (< 3s)

| Étape | Action | Résultat attendu |
|-------|--------|------------------|
| 1 | Aller sur `/login` | Formulaire de connexion |
| 2 | Saisir email/mot de passe admin | - |
| 3 | Cliquer "Se connecter" | Spinner "Vérification de la session..." |
| 4 | Attendre | Spinner "Chargement du profil..." |
| 5 | Attendre | Redirection vers `/admin/pipeline` |
| 6 | Vérifier | Pipeline affiché, pas de page blanche |

### Scénario timeout (simulable avec DevTools Network → Slow 3G)

| Étape | Action | Résultat attendu |
|-------|--------|------------------|
| 1 | Ouvrir DevTools → Network → Throttle "Slow 3G" | - |
| 2 | Rafraîchir la page | Spinner "Connexion au serveur..." |
| 3 | Attendre 10 secondes | Écran d'erreur "Connexion impossible" |
| 4 | Cliquer "Réessayer" | Page se recharge |
| 5 | Désactiver throttle | - |
| 6 | Cliquer "Réessayer" | App charge normalement |

### Checklist console

```
✅ Aucune erreur JavaScript rouge
✅ Aucun "Cannot read property of undefined"
✅ Logs [Boot] visibles dans l'ordre :
   - "[Boot] Organization resolved, moving to auth"
   - "[Boot] Session found, loading user profile"
   - "[Boot] User loaded, boot complete"
```

---

## ⚠️ Risques

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| Timeout trop court (10s) | Faible | Faux positifs erreur | Augmenter à 15s si nécessaire |
| Race condition bootStatus | Faible | État incohérent | Machine d'état linéaire stricte |
| Régression auth Magic Link | Faible | Login cassé | Smoke test dédié |
| Boucle useEffect | Faible | Render loop | Deps explicites listées |

---

## 🔙 Rollback Plan

Si cette PR cause des problèmes :

### Option 1 : Revert Git

```bash
# Identifier le commit avant PR-1
git log --oneline -5

# Revert
git revert HEAD~3..HEAD  # ou le range approprié

# Push
git push origin main
```

### Option 2 : Désactiver bootStatus (quick fix)

Dans `src/App.jsx`, remplacer :

```jsx
if (bootStatus !== BOOT_STATUS.READY) {
  // ... écran de chargement
}
```

Par :

```jsx
if (authLoading) {
  // ... ancien écran de chargement simple
}
```

### Option 3 : Augmenter le timeout

Dans `src/contexts/OrganizationContext.jsx` :

```jsx
const ORGANIZATION_TIMEOUT_MS = 30000; // 30s au lieu de 10s
```

---

## 📊 Métriques

| Métrique | Avant | Après | Delta |
|----------|-------|-------|-------|
| Booléens de gating | 3 dispersés | 1 machine d'état | -2 |
| Timeout organization | ∞ (spinner infini) | 10s | ✅ |
| Écrans d'erreur dédiés | 0 | 2 | +2 |
| Bundle size | 2508 kB | 2512 kB | +4 kB |

---

## 🔖 Git

```bash
git add src/App.jsx src/contexts/OrganizationContext.jsx src/layouts/AdminLayout.jsx
git commit -m "PR-1: Boot anti-race - machine d'état bootStatus + timeout 10s + écrans erreur"
```

---

## ➡️ Prochaines étapes

- **PR-02** : Extraction `useAuth` hook de App.jsx
- **PR-03** : Extraction `ProspectsContext` (centraliser les prospects)
- **PR-04** : Retry automatique sur erreurs Supabase

---

*PR-1 complété le 2026-01-24*
