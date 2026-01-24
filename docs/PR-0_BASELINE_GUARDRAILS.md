# PR-0: Baseline & Guardrails

> **Objectif** : Poser les fondations pour les refactorings futurs sans modifier le comportement existant.

---

## 📦 Fichiers créés/modifiés

| Fichier | Action | Description |
|---------|--------|-------------|
| `docs/SMOKE_TESTS.md` | ➕ Créé | Checklist manuelle de tests post-PR |
| `src/lib/invariant.js` | ➕ Créé | Assertions dev (invariant, softInvariant, assertType, assertUUID) |
| `src/lib/safeAsync.js` | ➕ Créé | Wrappers async (safeAsync, safeSupabaseQuery, withRetry, createAbortableAsync) |

---

## 🔍 État des lieux documenté

### Scripts disponibles (`package.json`)

| Script | Commande | Usage |
|--------|----------|-------|
| `dev` | `vite` | Développement local |
| `build` | `vite build` | Build production ✅ |
| `preview` | `vite preview` | Preview build local |
| `deploy` | `gh-pages -d dist` | Déploiement GitHub Pages |
| `prepare` | `husky` | Git hooks setup |
| `evatime:check` | Custom | Vérification spécifique |

**❌ Scripts manquants :**
- Pas de `lint` (ESLint installé mais non configuré en script)
- Pas de `test` (aucun framework de test installé)

### ErrorBoundary

✅ **Existe** : `src/components/ErrorBoundary.jsx` (113 lignes)

Fonctionnalités :
- Capture les erreurs React avec `getDerivedStateFromError`
- Affiche un fallback UI propre ("Oups ! Une erreur est survenue")
- Affiche le stack trace en mode développement
- Boutons "Rafraîchir" et "Retour à l'accueil"

**Utilisation actuelle :** Wraps `<App />` dans `main.jsx`

### Sentry

❌ **Non installé** - Erreurs en production non trackées

➡️ Prévu pour PR-05

---

## ✅ Vérifications effectuées

```bash
# Build production
$ npm run build
✓ 3470 modules transformed
✓ built in 9.89s

# Output
dist/index-d80bdb61.js  2,508.52 kB (minified)
```

**Warning connu :** Chunk principal > 500kB (code-splitting à améliorer - prévu dans les PRs futurs)

---

## 📋 Checklist de vérification PR

À exécuter après chaque PR :

```bash
# 1. Build (OBLIGATOIRE)
npm run build

# 2. Preview locale
npm run preview
# → Vérifier http://localhost:4173

# 3. Smoke tests manuels
# → Voir docs/SMOKE_TESTS.md
```

---

## 🧰 Utilitaires ajoutés

### `src/lib/invariant.js`

```javascript
import { invariant, softInvariant, assertUUID } from '@/lib/invariant'

// Hard assertion - crash en dev, log en prod
invariant(organizationId, 'organizationId is required')

// Soft assertion - log warning, retourne false
if (!softInvariant(data.length > 0, 'Empty data')) {
  return []
}

// UUID validation
assertUUID(prospectId, 'prospectId')
```

### `src/lib/safeAsync.js`

```javascript
import { safeAsync, safeSupabaseQuery, withRetry } from '@/lib/safeAsync'

// Wrap any promise - never throws
const [data, error] = await safeAsync(fetchData())

// Specific for Supabase queries
const [prospects, error] = await safeSupabaseQuery(
  supabase.from('prospects').select('*')
)

// With retry logic
const [result, error] = await withRetry(
  () => unreliableAPI(),
  { maxAttempts: 3, baseDelay: 1000 }
)
```

---

## ⚠️ Risques

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| Nouveaux fichiers non utilisés | 0% | Aucun | Fichiers n'ont pas d'effets de bord |
| Conflit d'import `@/lib/...` | Faible | Build fail | Vite alias déjà configuré pour `@/` |
| Régression comportement | 0% | Aucun | Aucun code existant modifié |

---

## 📊 Métriques

| Métrique | Avant | Après | Delta |
|----------|-------|-------|-------|
| Fichiers `.js` dans `src/lib/` | 2 | 4 | +2 |
| Build time | ~10s | ~10s | 0 |
| Bundle size | 2.5MB | 2.5MB | 0 |
| Tests automatisés | 0 | 0 | 0 |

---

## ➡️ Prochaines étapes

1. **PR-01** : Logger centralisé (`src/lib/logger.js`)
2. **PR-02** : Extraction `useAuth` de App.jsx
3. **PR-03** : Extraction `ProspectsContext`

---

## 🔖 Git

```bash
git add docs/SMOKE_TESTS.md src/lib/invariant.js src/lib/safeAsync.js
git commit -m "PR-0: Baseline & Guardrails - smoke tests + invariant + safeAsync"
```

---

*PR-0 complété le $(date +%Y-%m-%d)*
