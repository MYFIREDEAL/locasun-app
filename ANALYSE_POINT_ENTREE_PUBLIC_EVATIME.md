# 📊 RAPPORT D'ANALYSE — Point d'entrée public EVATIME

**Date d'analyse** : 22 janvier 2026  
**Équipe** : EVATIME (ChatGPT = architecte, Jack = PO, VS Code = dev exécutant)  
**Périmètre** : Accès à `https://isabelle.evatime.fr` ou toute URL tenant de type `https://{org}.evatime.fr`

---

## 1️⃣ Point d'entrée réel

### Fichiers impliqués (dans l'ordre d'exécution)

| Ordre | Fichier | Rôle |
|-------|---------|------|
| 1 | `index.html` | Point d'entrée HTML, charge `/src/main.jsx` |
| 2 | `src/main.jsx` | Bootstrap React, monte les providers |
| 3 | `src/contexts/OrganizationContext.jsx` | **Provider critique** — résolution du tenant |
| 4 | `src/contexts/UsersContext.jsx` | Provider cache utilisateurs |
| 5 | `src/App.jsx` | Composant principal, routing et logique auth |

### Premier composant React rendu

```jsx
// main.jsx
<React.StrictMode>
  <ErrorBoundary>
    <BrowserRouter>
      <OrganizationProvider>      ← 🔥 PREMIER PROVIDER (tenant)
        <UsersProvider>           ← 🔥 SECOND PROVIDER (users cache)
          <App />                 ← 🔥 COMPOSANT PRINCIPAL
        </UsersProvider>
      </OrganizationProvider>
    </BrowserRouter>
  </ErrorBoundary>
</React.StrictMode>
```

---

## 2️⃣ Routing effectif

### Router utilisé

**`react-router-dom` v6** avec `<BrowserRouter>`.

### Résolution de la route `/`

Quand l'utilisateur accède à `https://isabelle.evatime.fr/` :

1. La route `/` est matchée
2. Le composant `<Landing />` est rendu

```jsx
// App.jsx lignes 1485-1486
<Route path="/" element={<Landing />} />
<Route path="/landing" element={<Landing />} />
```

### ⚠️ Isolation Landing — PROBLÈME IDENTIFIÉ

**Observation factuelle** : Dans `App.jsx` lignes 193-196, il y a une isolation **AVANT** tout hook :

```jsx
function App() {
  const location = useLocation();
  
  // 🔥 ISOLATION: Landing page ne doit jamais exécuter la logique app
  if (location.pathname === '/landing') {
    return <Landing />;
  }
  // ... suite de la logique (exécutée quand même pour `/`)
```

**Problème identifié** : Cette isolation ne s'applique **que pour `/landing`**, pas pour `/`. Donc toute la logique `App.jsx` est exécutée pour la route `/`.

---

## 3️⃣ Logique globale déclenchée au chargement initial

### OrganizationProvider (BLOQUANT)

**Fichier** : `src/contexts/OrganizationContext.jsx`

Au mount, le provider exécute :

| Étape | Action | Requête Supabase |
|-------|--------|------------------|
| 1 | `supabase.auth.getSession()` | ✅ API call auth |
| 2 | `supabase.auth.onAuthStateChange()` | ✅ Subscription auth |
| 3 | `supabase.rpc('resolve_organization_from_host', { host: hostname })` | ✅ **RPC call** (tenant) |
| 4 | Si user connecté : query `users` table | ✅ Select |
| 5 | Si user connecté : query `prospects` table | ✅ Select |
| 6 | Fallback : query `organizations` table | ✅ Select |
| 7 | `useBranding(organizationId)` → query `organization_settings` | ✅ Select |

**Total minimum pour OrganizationContext** : **3-7 requêtes Supabase** selon le scénario

### UsersProvider (EXÉCUTÉ AUTOMATIQUEMENT)

**Fichier** : `src/contexts/UsersContext.jsx`

```jsx
useEffect(() => {
  fetchUsers();  // ← Appel IMMÉDIAT au mount
}, [fetchUsers]);
```

**Requête exécutée** :
```javascript
const { data, error } = await supabase.rpc('get_accessible_users');
```

**Observation** : Ce fetch est exécuté **même pour les visiteurs anonymes** sur la page publique. Le code vérifie ensuite `if (!session)` mais l'appel `supabase.auth.getSession()` est quand même fait.

---

## 4️⃣ Résolution du tenant / organisation

### Mécanisme factuel (OrganizationContext.jsx lignes 66-278)

```javascript
// 1. Récupérer le hostname
const hostname = window.location.hostname;
// Ex: "isabelle.evatime.fr"

// 2. Appeler la RPC
const { data: rpcData, error: rpcError } = await supabase.rpc(
  'resolve_organization_from_host',
  { host: hostname }
);
```

### Tables/Sources interrogées (séquence complète)

| Ordre | Table | Condition | But |
|-------|-------|-----------|-----|
| 1 | RPC `resolve_organization_from_host` | hostname | Résoudre l'org depuis le sous-domaine |
| 2 | `users` | `user_id = authUserId` | Vérifier si admin |
| 3 | `prospects` (×2-3 fois possibles) | `user_id`, `organization_id`, `email` | Vérifier si client |
| 4 | `organizations` | `is_platform = true` | Fallback plateforme |
| 5 | `organization_settings` | `organization_id` | Charger le branding |

### Nombre de requêtes pour résoudre le tenant

**Cas visiteur anonyme** : **3-4 requêtes minimum**
- `getSession()` (1)
- RPC `resolve_organization_from_host` (1)
- `organization_settings` (1 via useBranding)

**Cas utilisateur connecté** : **5-7 requêtes**
- Tout ce qui précède + queries sur `users`/`prospects`

---

## 5️⃣ Hooks & effets exécutés au mount initial

### Dans OrganizationContext.jsx

| Hook/Effect | Déclencheur | Action |
|-------------|-------------|--------|
| `useEffect` ligne 37 | Mount | `getSession()` + subscription auth |
| `useEffect` ligne 64 | `authUserId` change | **RPC resolve_organization_from_host + queries conditionnelles** |
| `useBranding()` ligne 294 | `organizationId` | Query `organization_settings` |
| `useEffect` ligne 303 | `brandName` | Set document.title |
| `useEffect` ligne 308 | `primaryColor/secondaryColor` | Set CSS vars |

### Dans UsersContext.jsx

| Hook/Effect | Déclencheur | Action |
|-------------|-------------|--------|
| `useEffect` ligne 56 | Mount | `fetchUsers()` → RPC `get_accessible_users` |
| `useEffect` ligne 60 | Auth change | Re-fetch users |

### Dans App.jsx (EXÉCUTÉ MÊME POUR `/`)

**⚠️ Point critique** : Tous ces hooks sont exécutés car la route `/` n'est pas isolée comme `/landing`.

| Hook | Ligne | Action | Requête Supabase |
|------|-------|--------|------------------|
| `useOrganization()` | 202 | Consomme le contexte | Non |
| `useUsers()` | 248 | Consomme le cache | Non (cache UsersContext) |
| `useSupabaseProspects()` | 252 | Charge les prospects | ✅ **RPC get_prospects_safe** |
| `useSupabaseClientFormPanels()` | 266 | Panneaux formulaires | ✅ Select conditionnel |
| `useSupabaseCompanySettings()` | 273 | Settings entreprise | ✅ Select `company_settings` |
| `useSupabaseGlobalPipeline()` | 296 | Colonnes pipeline | ✅ Select conditionnel |
| `useSupabaseAllProjectSteps()` | 303 | Steps projets | ✅ Select |
| `useSupabaseProjectTemplates()` | 313 | Templates projets | ✅ Select conditionnel |
| `useSupabaseForms()` | 322 | Formulaires | ✅ Select conditionnel |
| `useSupabasePrompts()` | 331 | Prompts IA | ✅ Select conditionnel |
| `useAutoCreateTasks()` | 345 | Automation | Non (écoute seulement) |
| `useAutoVerificationTasks()` | 348 | Automation | Non (écoute seulement) |
| `useSupabaseNotifications()` | 352 | Notifications admin | ✅ Select conditionnel |
| `useSupabaseClientNotifications()` | 360 | Notifications client | ✅ Select conditionnel |
| `useSupabaseProjectInfos()` | 365 | Infos projets | ✅ Select |
| `useEffect` ligne 405 | Mount | Auth setup + Magic Link exchange | ✅ API calls auth |

### Subscriptions real-time ouvertes automatiquement

| Channel | Table | Condition |
|---------|-------|-----------|
| `auth.onAuthStateChange` | auth.users | Toujours |
| `prospects-changes-*` | prospects | Si activeAdminUser |
| `company-settings-changes` | company_settings | Toujours |
| `org-settings-landing-*` | organization_settings | Si organizationId |
| + multiples autres channels conditionnels | | |

---

## 📊 SYNTHÈSE : Ordre d'exécution au chargement de `https://isabelle.evatime.fr/`

```
T+0ms     index.html charge main.jsx
T+10ms    React mount <OrganizationProvider>
T+15ms    ├── useEffect: supabase.auth.getSession() ⏳
T+20ms    └── useEffect: supabase.auth.onAuthStateChange()
T+25ms    React mount <UsersProvider>
T+30ms    └── useEffect: fetchUsers() → supabase.rpc('get_accessible_users') ⏳
T+50ms    React mount <App>
T+55ms    ├── useOrganization() consomme le contexte
T+60ms    ├── Session résolue, trigger useEffect OrganizationContext
T+65ms    │   └── supabase.rpc('resolve_organization_from_host') ⏳
T+100ms   ├── organizationId disponible, cascade de hooks :
T+105ms   │   ├── useBranding() → supabase.select('organization_settings') ⏳
T+110ms   │   ├── useSupabaseCompanySettings() → supabase.select('company_settings') ⏳
T+115ms   │   ├── useSupabaseGlobalPipeline() → (conditionnel) ⏳
T+120ms   │   ├── useSupabaseProjectTemplates() → (conditionnel) ⏳
T+125ms   │   └── etc...
T+200ms   ├── authLoading = false
T+205ms   └── Rendu final <Landing /> OU spinner
```

---

## 🔴 CAUSES PRINCIPALES DE LA LENTEUR (Factuel)

### Cause #1 : Cascade séquentielle de requêtes

L'architecture force une séquence **bloquante** :
1. `getSession()` → attend résultat
2. `resolve_organization_from_host()` → attend résultat
3. Seulement ensuite : chargement du branding
4. Seulement ensuite : `organizationReady = true` → déclenche les autres hooks

**Estimation** : 4-7 requêtes séquentielles avant le premier rendu utile.

### Cause #2 : Hooks App.jsx exécutés pour `/`

La route `/` n'est **pas isolée** comme `/landing`. Tous les hooks de `App.jsx` sont montés et exécutent leurs requêtes, même si la page affichée est une simple landing page publique.

### Cause #3 : Pas de parallélisation des requêtes

Les requêtes sont déclenchées **séquentiellement par dépendance** :
- `organizationId` dépend de `authUserId`
- `useBranding()` dépend de `organizationId`
- `useSupabaseProjectTemplates()` dépend de `organizationReady`

### Cause #4 : UsersContext fetch immédiat

Le `UsersProvider` appelle `get_accessible_users()` **immédiatement au mount**, même pour des visiteurs anonymes sur une page publique.

---

## 📁 Liste exacte des fichiers impliqués

```
src/main.jsx
src/App.jsx
src/contexts/OrganizationContext.jsx
src/contexts/UsersContext.jsx
src/hooks/useBranding.js
src/hooks/useLandingPageConfig.js
src/hooks/useSupabaseProspects.js
src/hooks/useSupabaseCompanySettings.js
src/hooks/useSupabaseGlobalPipeline.js
src/hooks/useSupabaseProjectTemplates.js
src/hooks/useSupabaseForms.js
src/hooks/useSupabasePrompts.js
src/hooks/useSupabaseNotifications.js
src/hooks/useSupabaseClientNotifications.js
src/hooks/useSupabaseClientFormPanels.js
src/hooks/useSupabaseAllProjectSteps.js
src/hooks/useSupabaseProjectInfos.js
src/hooks/useAutoCreateTasks.js
src/hooks/useAutoVerificationTasks.js
src/pages/landing.jsx
src/lib/supabase.js
```

---

## ✅ Conclusion factuelle

Le chargement lent de `https://isabelle.evatime.fr/` est causé par :

1. **~15 hooks Supabase** montés dans `App.jsx` même pour la page publique `/`
2. **Résolution séquentielle** du tenant (3-4 requêtes avant de savoir quelle org afficher)
3. **Pas d'isolation** de la route `/` (contrairement à `/landing`)
4. **Cascade de dépendances** entre `organizationId`, `organizationReady`, et les hooks data
5. **Fetch utilisateurs** exécuté même pour visiteurs anonymes

---

## 📋 Récapitulatif des requêtes Supabase au chargement

| # | Requête | Source | Bloquant |
|---|---------|--------|----------|
| 1 | `supabase.auth.getSession()` | OrganizationContext | ✅ Oui |
| 2 | `supabase.auth.getSession()` | UsersContext | ✅ Oui |
| 3 | `supabase.rpc('resolve_organization_from_host')` | OrganizationContext | ✅ Oui |
| 4 | `supabase.rpc('get_accessible_users')` | UsersContext | ⚠️ Inutile pour anonyme |
| 5 | `supabase.select('organization_settings')` | useBranding | ✅ Oui |
| 6 | `supabase.select('company_settings')` | useSupabaseCompanySettings | ⚠️ Inutile pour landing |
| 7 | `supabase.rpc('get_prospects_safe')` | useSupabaseProspects | ⚠️ Conditionnel |
| 8+ | Multiples selects conditionnels | Divers hooks | ⚠️ Variables |

**Total estimé** : **5-12 requêtes** selon le contexte (anonyme vs connecté).

---

*Fin du rapport d'analyse — Aucune modification de code effectuée.*
