# BOOT AUDIT — SOURCE DE VÉRITÉ

## Contexte

**Date de début :** 22 janvier 2026  
**Objectif :** Stabiliser le boot multi-tenant pour éviter les hooks Supabase exécutés avant que les dépendances (auth, organizationId) soient prêtes.

## Boot réel observé (FACTUEL)

### Ordre d'exécution constaté :

**main.jsx** (lignes 1-74)
- Rendu : `<Root />` dans `ReactDOM.createRoot`
- Branchement conditionnel :
  - Si route publique (`/` ou `/landing`) → `PublicOrganizationProvider` + `Landing` (lazy)
  - Sinon → Boot complet CRM

**Providers montés (boot complet, dans l'ordre) :**
1. `ErrorBoundary`
2. `BrowserRouter`
3. `OrganizationProvider`
4. `UsersProvider`
5. → `App`

**App.jsx** (1571 lignes)
- Récupère `useOrganization()` (ligne ~200) pour `organizationId`, `organizationReady`
- Récupère `useUsers()` pour `supabaseUsers`
- **Hooks Supabase appelés directement dans le corps du composant**

**Layout chargé :**
- `AdminLayout` ou `ClientLayout` selon route

**Router / Page initiale :**
- `Routes` avec multiples `Route` (admin, client, platform, public)

---

### ❌ Premier hook Supabase exécuté (potentiellement fautif) :

| Élément | Valeur |
|---------|--------|
| **hook** | `useSupabaseProspects` |
| **fichier** | `src/App.jsx` |
| **ligne approx** | ~240 |
| **dépendances requises** | `activeAdminUser` (auth), implicitement `organizationId` |
| **guard actuel** | `authLoading ? null : activeAdminUser` |

**Autres hooks appelés au même niveau (sans BootGate) :**
- `useSupabaseClientFormPanels` (~253)
- `useSupabaseCompanySettings` (~263)
- `useSupabaseGlobalPipeline` (~280)
- `useSupabaseAllProjectSteps` (~286)

⚠️ **Observation :** `organizationReady` est récupéré mais **pas utilisé comme guard** pour bloquer ces hooks.

---

⚠️ Aucune correction effectuée à ce stade.

## Flags globaux

| Flag | Fichier | État actuel |
|------|---------|-------------|
| authReady | `App.jsx` (authLoading inversé) | ⚠️ Existe (`authLoading`) mais inversé |
| organizationReady | `OrganizationContext` | ✅ Existe, exposé via `useOrganization()` |
| settingsReady | — | ❌ N'existe pas |
| appReady | — | ❌ N'existe pas (à créer) |

## Hooks à risque

| Hook | Fichier | Dépendances | Avant appReady ? | Action |
|------|---------|-------------|------------------|--------|
| useSupabaseProspects | App.jsx ~240 | activeAdminUser | OUI | guard enabled |
| useSupabaseClientFormPanels | App.jsx ~253 | prospectIdForForms | OUI | guard enabled |
| useSupabaseCompanySettings | App.jsx ~263 | organizationId | OUI | guard enabled |
| useSupabaseGlobalPipeline | App.jsx ~280 | organizationId | OUI | guard enabled |
| useSupabaseAllProjectSteps | App.jsx ~286 | (aucun) | OUI | guard enabled |

## Fix log

| Date | Hook/Fichier | Fix appliqué | Résultat |
|------|--------------|--------------|----------|
| 22/01/2026 | useSupabaseCompanySettings | Ajout `enabled` param + guard `organizationReady` | ✅ OK |
| 22/01/2026 | useSupabaseGlobalPipeline | Guard `organizationReady ? organizationId : null` | ✅ OK |
| 22/01/2026 | useSupabaseClientFormPanels | Guard `__DISABLED__` + `organizationReady` | ✅ OK |
| 22/01/2026 | **ProjectsManagementPage.jsx** | Guards `globalPipelineSteps` dans useEffect + useMemo | **✅ OK (COUPABLE FINAL)** |

---

## Test d'isolation — Hook fautif

**Hook testé :**
- `useSupabaseProspects`
- fichier : `App.jsx`
- ligne approx : ~251

**Action :**
- Paramètre forcé à `null` (exécution bloquée)
- Code : `useSupabaseProspects(null)`

**Résultat :**
- Page blanche :
  - ⬜ disparue
  - ✅ toujours présente

**Conclusion :**
- ⬜ hook confirmé comme cause
- ✅ hook innocent (chercher suivant)

⚠️ Aucun fix définitif appliqué à ce stade.

---

## Hooks à risque — scan suivant

**Scan complet App.jsx (ordre d'appel) :**

| # | Hook | Ligne | Dépend orgId | Guard orgReady |
|---|------|-------|--------------|----------------|
| 1 | useUsers() | ~248 | NON | — |
| 2 | useSupabaseProspects | ~252 | NON | ❌ (innocent) |
| 3 | useSupabaseClientFormPanels | ~284 | NON | ❌ |
| 4 | **useSupabaseCompanySettings** | ~289 | **OUI** | **❌** |
| 5 | useSupabaseGlobalPipeline | ~330 | OUI | ❌ |
| 6 | useSupabaseAllProjectSteps | ~341 | NON | ❌ |
| 7 | useSupabaseProjectTemplates | ~362 | OUI | ✅ |
| 8 | useSupabaseForms | ~372 | OUI | ❌ |
| 9 | useSupabasePrompts | ~386 | OUI | ✅ |

**Hook candidat :**
- nom : `useSupabaseCompanySettings`
- fichier : `App.jsx`
- ligne approx : ~289
- dépend de organizationId : OUI
- guard organizationReady : NON

**Action prévue :**
- test d'isolation

## État du chantier

- [x] BOOT_PLAN.md créé
- [x] BOOT_AUDIT.md créé
- [x] Cartographie boot réel
- [x] Flags globaux identifiés
- [x] BootGate conceptualisé
- [x] Inventaire hooks terminé
- [x] Fixes appliqués (4 hooks/composants)
- [x] Validation technique OK
- [ ] Boot gelé (prochaine étape : documentation finale)

---

## 🎯 RÉSUMÉ DU CHANTIER

**Problème initial** : Page blanche au clic sur "Configuration" (ProjectsManagementPage)

**Cause racine** : `globalPipelineSteps` accédé avant que `organizationReady` soit true

**Hooks fixés** :
1. ✅ `useSupabaseCompanySettings` → guard `enabled: organizationReady`
2. ✅ `useSupabaseGlobalPipeline` → guard `organizationReady ? organizationId : null`
3. ✅ `useSupabaseClientFormPanels` → guard `__DISABLED__` si `!organizationReady`

**Composant fixé** :
4. ✅ **`ProjectsManagementPage.jsx`** → 3 guards ajoutés (coupable final)

**Méthode utilisée** : Isolation chirurgicale hook par hook (pas de refactor)

**Résultat** : ✅ Boot stable, page blanche résolue
