# PR-3: Stop Duplication Hooks - Source Unique de Vérité

## 🎯 Objectif
Éliminer les doubles fetch et doubles subscriptions real-time en centralisant les hooks `useSupabaseProspects` et `useSupabaseAgenda` dans `App.jsx`.

## 🔧 Problème Résolu

### Avant PR-3
```
App.jsx
  └── useSupabaseProspects() ← 1ère subscription
  └── useSupabaseAgenda() ❌ absent
  
FinalPipeline.jsx
  └── useSupabaseProspects() ← 2ème subscription (DUPLIQUÉ)
  
Agenda.jsx
  └── useSupabaseAgenda() ← 1ère subscription
  └── useSupabaseProspects() ← 3ème subscription (DUPLIQUÉ)
  
ProspectDetailsAdmin.jsx
  └── useSupabaseAgenda() ← 2ème subscription (DUPLIQUÉ)
  └── useSupabaseAgenda() ← 3ème subscription (DUPLIQUÉ)
  └── useSupabaseAgenda() ← 4ème subscription (DUPLIQUÉ)
  
ActivityTab.jsx
  └── useSupabaseAgenda() ← 5ème subscription (DUPLIQUÉ)
  └── useSupabaseProspects() ← 4ème subscription (DUPLIQUÉ)
  
CompleteOriginalContacts.jsx
  └── useSupabaseProspects() ← 5ème subscription (DUPLIQUÉ)
  
OffersPage.jsx / SettingsPage.jsx (client)
  └── useSupabaseProspects() ← 6-7ème subscriptions (DUPLIQUÉES)
```

### Après PR-3
```
App.jsx
  └── useSupabaseProspects() ← SOURCE UNIQUE
  └── useSupabaseAgenda() ← SOURCE UNIQUE
      ↓ (via AppContext)
  ├── FinalPipeline.jsx → useAppContext()
  ├── Agenda.jsx → useAppContext()
  ├── ProspectDetailsAdmin.jsx → useAppContext()
  ├── ActivityTab.jsx → useAppContext()
  ├── CompleteOriginalContacts.jsx → useAppContext()
  ├── OffersPage.jsx → useAppContext()
  └── SettingsPage.jsx → useAppContext()
```

## 📁 Fichiers Modifiés

### 1. `src/App.jsx`
- ✅ Import `useSupabaseAgenda` ajouté
- ✅ Hook `useSupabaseAgenda` appelé une seule fois après `useSupabaseProspects`
- ✅ `appState` mis à jour pour exposer :
  - `appointments`, `calls`, `tasks` (données)
  - `addAppointment`, `updateAppointment`, `deleteAppointment`
  - `addCall`, `updateCall`, `deleteCall`
  - `addTask`, `updateTask`, `deleteTask`
  - `agendaLoading`, `refreshAgenda`

### 2. `src/pages/admin/Agenda.jsx`
- ❌ Import `useSupabaseAgenda` supprimé
- ❌ Import `useSupabaseProspects` supprimé
- ✅ Récupération via `useAppContext()` uniquement

### 3. `src/components/admin/ProspectDetailsAdmin.jsx`
- ❌ Import `useSupabaseAgenda` supprimé (3 appels éliminés)
- ✅ 3 composants internes (`ProjectTimeline`, `ProspectForms`, `ProspectActivities`) utilisent `useAppContext()`

### 4. `src/components/admin/project-tabs/ActivityTab.jsx`
- ❌ Imports `useSupabaseAgenda` et `useSupabaseProspects` supprimés
- ✅ Récupération via `useAppContext()`

### 5. `src/pages/admin/FinalPipeline.jsx`
- ❌ Import `useSupabaseProspects` supprimé
- ✅ `addProspect` récupéré via `contextData?.addProspect`

### 6. `src/pages/admin/CompleteOriginalContacts.jsx`
- ❌ Import `useSupabaseProspects` supprimé
- ✅ Toutes les fonctions récupérées via `useAppContext()`

### 7. `src/pages/client/OffersPage.jsx`
- ❌ Import `useSupabaseProspects` supprimé
- ✅ `updateProspect` récupéré via `useAppContext()`

### 8. `src/pages/client/SettingsPage.jsx`
- ❌ Import `useSupabaseProspects` supprimé
- ✅ `updateProspect` récupéré via `useAppContext()`

## 🛡️ Guard Pattern

Le hook est conditionné par l'état d'authentification :

```javascript
// Dans App.jsx
const { ... } = useSupabaseAgenda(authLoading ? null : activeAdminUser);
```

- Si `authLoading === true` → Hook ne fetch pas
- Si `activeAdminUser === null` → Hook ne fetch pas
- Sinon → Fetch + subscription real-time

## 📊 Impact

| Métrique | Avant | Après |
|----------|-------|-------|
| Subscriptions Prospects | 7 | 1 |
| Subscriptions Agenda | 5 | 1 |
| Fetch initial Prospects | 7× | 1× |
| Fetch initial Agenda | 5× | 1× |
| Taille bundle | ~2516 kB | ~2516 kB |

## ⚠️ Points d'Attention

1. **Les composants internes** dans `ProspectDetailsAdmin.jsx` (`ProjectTimeline`, `ProspectForms`, `ProspectActivities`) doivent impérativement utiliser `useAppContext()` car ils sont rendus conditionnellement.

2. **Les anciennes fonctions deprecated** (`addAppointment`, etc.) dans `App.jsx` sont maintenant remplacées par les vraies fonctions du hook.

3. **Pages client** (`OffersPage`, `SettingsPage`) : Elles n'ont pas besoin de `activeAdminUser` mais utilisent quand même `useAppContext()` pour la cohérence.

## ✅ Vérification

```bash
# Build réussi
npm run build
# ✓ built in ~10s
```

## 🔗 Références

- PR-0: Baseline & Guardrails
- PR-1: Boot Anti-Race  
- PR-2: ModuleBoundary (ErrorBoundary)
- **PR-3: Stop Duplication Hooks** ← Vous êtes ici

---
*Date: 24 janvier 2026*
*Build: ~2516 kB gzip: ~712 kB*
