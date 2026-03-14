# 📱 PWA Multi-Tenant — Plan d'implémentation EVATIME

> **Objectif** : Permettre à chaque client de chaque org d'installer l'app sur son téléphone (comme une app native) avec le branding de son organisation, et de recevoir des notifications push.
>
> **Date de début** : 13 mars 2026
> **Statut** : 🟡 En cours

---

## 📊 État actuel (avant travaux)

- ✅ Interface client responsive (mobile + desktop) — terminée session 12-13 mars
- ✅ Bottom nav mobile 3 onglets (Home / Chat / Menu)
- ✅ Chat WhatsApp-style + formulaires plein écran
- ✅ Multi-tenant fonctionnel (hostname → org_id → branding)
- ✅ `organization_settings` = source de vérité (display_name, logo_url, primary_color, secondary_color)
- ✅ Chrome propose déjà "Installer l'app" sur bureau (manifest minimal auto-généré)
- ❌ Pas de manifest.json propre
- ❌ Pas de Service Worker
- ❌ Pas d'icônes PWA (192x192, 512x512)
- ❌ Pas de meta tags PWA (apple-mobile-web-app-capable, theme-color)
- ❌ Magic link ouvre le browser au lieu de la PWA installée
- ❌ Pas de notifications push
- ❌ Pas de bannière d'installation custom

---

## 🔵 PHASE 1 — Fondations PWA (installable)

### 1.1 — vite-plugin-pwa + Service Worker
- [x] Installer `vite-plugin-pwa` et `workbox-window`
- [x] Configurer `VitePWA()` dans `vite.config.js`
  - `registerType: 'autoUpdate'`
  - `strategies: 'injectManifest'` (custom SW dans `src/sw.js`)
  - Manifest par défaut EVATIME (fallback si org pas encore chargée)
  - Workbox runtime caching (API Supabase, images)
- [x] Vérifier que le SW se génère au build
- [x] Créer `src/lib/registerSW.js` — enregistrement SW au boot dans `main.jsx`

### 1.2 — Icônes PWA par défaut
- [x] Créer `public/pwa-192x192.png` (icône EVATIME générique — "E" bleu)
- [x] Créer `public/pwa-512x512.png` (icône EVATIME générique — "E" bleu)
- [x] Créer `public/apple-touch-icon.png` (180x180)

### 1.3 — Meta tags PWA dans index.html
- [x] `<meta name="theme-color" content="#3b82f6">`
- [x] `<meta name="apple-mobile-web-app-capable" content="yes">`
- [x] `<meta name="apple-mobile-web-app-status-bar-style" content="default">`
- [x] `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`
- [x] `<meta name="mobile-web-app-capable" content="yes">`
- [x] Mettre à jour le `<title>` → "EVATIME" (sera écrasé dynamiquement par org)

### 1.4 — Manifest dynamique par org (multi-tenant)
- [x] Créer `src/hooks/usePWAManifest.js`
  - Lit `brandName`, `logoUrl`, `primaryColor` depuis AppContext (OrganizationContext)
  - Génère un manifest JSON dynamique en blob URL
  - Injecte/remplace `<link rel="manifest">` dans le `<head>`
  - Met à jour `<meta name="theme-color">` avec `primaryColor`
  - Met à jour `<link rel="apple-touch-icon">` avec `logoUrl`
  - Exporte `isPWAInstalled()`, `isIOS()`, `isAndroid()` utilitaires
- [x] Appeler `usePWAManifest()` dans `ClientLayout.jsx`
- [ ] Appeler `usePWAManifest()` dans `PublicOrganizationContext` (landing page) — optionnel

### 1.5 — Fix magic link → PWA
- [x] Créer `src/pages/OpenInAppPage.jsx` — page interstitielle
  - Si déjà en mode standalone → redirect direct vers /dashboard
  - Si en browser → "Connexion réussie ✅" + bouton "Ouvrir l'application" + fallback "Continuer dans le navigateur"
  - Instructions iOS incluses
- [x] Ajouter route `/open-app` dans App.jsx
- [ ] Tester le flow : magic link email → clic → page interstitielle → ouvre la PWA
- [ ] ⚠️ Le `emailRedirectTo` n'est PAS encore modifié (on teste d'abord le flow actuel avec la PWA installée)

### ⏸️ PAUSE VÉRIF PHASE 1
- [ ] `npm run build` sans erreur
- [ ] Lighthouse PWA score ≥ 80
- [ ] Manifest visible dans DevTools > Application > Manifest
- [ ] SW enregistré dans DevTools > Application > Service Workers
- [ ] "Ajouter à l'écran d'accueil" fonctionne sur Android Chrome
- [ ] "Ajouter à l'écran d'accueil" fonctionne sur iOS Safari
- [ ] L'app installée affiche le nom + icône de l'org
- [ ] Magic link rouvre la PWA installée

---

## 🟢 PHASE 2 — Bannière d'installation

### 2.1 — Composant InstallPWAPrompt
- [x] Créer `src/components/client/InstallPWAPrompt.jsx`
  - Bannière bottom sheet : "Installer {brandName} sur votre téléphone"
  - Bouton "Installer" + bouton "Plus tard"
  - Style cohérent avec le design mobile existant

### 2.2 — Logique Android (Chrome)
- [x] Intercepter `beforeinstallprompt` event
- [x] Stocker l'event, afficher la bannière custom
- [x] Bouton "Installer" → `deferredPrompt.prompt()`
- [x] Tracker `userChoice` (accepted/dismissed)

### 2.3 — Logique iOS (Safari)
- [x] Détecter iOS + Safari (pas en standalone)
- [x] Afficher message guide (3 étapes) après 3 secondes
- [x] Modal bottom sheet : Partager → Sur l'écran d'accueil → Ajouter
- [x] Preview de l'icône avec nom org

### 2.4 — Intégration ClientLayout
- [x] Afficher au-dessus du bottom nav mobile
- [x] Ne pas afficher si déjà installé (`isPWAInstalled()`)
- [x] Dismiss persisté en localStorage (avec expiration 7 jours)
- [x] Ne pas afficher sur desktop
- [x] Ne pas afficher dans le chat projet ni page offre détail

### ⏸️ PAUSE VÉRIF PHASE 2
- [ ] Bannière s'affiche sur Android Chrome (pas installé)
- [ ] Bannière s'affiche sur iOS Safari (pas installé)
- [ ] Clic "Installer" → installe sur Android
- [ ] Clic "Plus tard" → disparaît 7 jours
- [ ] Pas de bannière si déjà installé
- [ ] Pas de bannière sur desktop

---

## ✅ PHASE 3 — Push Notifications (implémenté 13 mars 2026)

### 3.1 — VAPID Keys
- [x] Généré paire VAPID via `web-push generate-vapid-keys`
- [x] `VITE_VAPID_PUBLIC_KEY` dans `.env` (frontend)
- [x] `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` dans Supabase secrets (Edge Function)

> ⚠️ **PIÈGE VAPID** : `web-push npm` génère les clés en **base64url raw** (65 bytes public, 32 bytes private).
> Mais `@negrel/webpush` (Deno) attend du **JWK**. Il faut convertir manuellement :
> - Public 65 bytes → `0x04 + x[32] + y[32]` → extraire x et y en base64url
> - Private 32 bytes → c'est le scalaire `d`
> - Voir `rawVapidToJwk()` dans `send-push-notification/index.ts`

### 3.2 — Table push_subscriptions
- [x] Créé `create_push_subscriptions_table.sql`
- [x] RLS : client peut INSERT/DELETE ses propres subscriptions
- [x] Colonnes : `prospect_id`, `organization_id`, `subscription` (JSONB), `user_agent`
- [x] RPC `delete_push_subscription` pour désabonnement (SECURITY DEFINER)

### 3.3 — Service Worker push handler (`src/sw.js`)
- [x] `self.addEventListener('push', ...)` — affiche notification native
- [x] `self.addEventListener('notificationclick', ...)` — ouvre la PWA sur `/dashboard`
- [x] Payload JSON : `{ title, body, url, tag, icon }`

> ⚠️ **PIÈGE iOS** : Sur iOS, les push ne fonctionnent **QUE si la PWA est installée sur l'écran d'accueil**.
> Dans Safari classique, `PushManager` existe mais `subscribe()` échoue silencieusement.
> Il faut vérifier `isPWAInstalled()` (standalone mode) avant de proposer les notifications.

> ⚠️ **PIÈGE Service Worker** : Le `push` event DOIT appeler `self.registration.showNotification()` dans un `event.waitUntil()`.
> Sinon iOS/Chrome tuent le SW avant l'affichage de la notification.

### 3.4 — Hook usePushNotifications (`src/hooks/usePushNotifications.js`)
- [x] Vérifie support (`serviceWorker` + `PushManager` + `Notification` + VAPID key)
- [x] `subscribe()` : `Notification.requestPermission()` → `pushManager.subscribe()` → sauvegarde en DB
- [x] `unsubscribe()` : supprime subscription navigateur + DB via RPC
- [x] État : `isSupported`, `permission`, `isSubscribed`, `loading`

> ⚠️ **PIÈGE permission** : `Notification.requestPermission()` ne peut être appelé que suite à un **user gesture** (click/tap).
> Si appelé au chargement de page → Chrome/Safari le bloque silencieusement.
> C'est pour ça qu'on a le soft prompt (NotificationOptIn) qui attend le clic de l'utilisateur.

> ⚠️ **PIÈGE unsubscribe** : Quand on `unsubscribe()` côté navigateur, la `subscription` object change.
> Il faut aussi supprimer l'ancienne subscription en DB (via endpoint), sinon le trigger DB essaie d'envoyer
> à un endpoint mort → 410 Gone.

### 3.5 — Composant NotificationOptIn (`src/components/client/NotificationOptIn.jsx`)
- [x] Soft prompt AVANT la popup native Apple/Chrome
- [x] Escalade progressive si "Plus tard" : 3j → 7j → 30j → stop
- [x] Affiché dès la 1ère visite (avec 5s de délai)
- [x] Pas affiché si : déjà abonné, permission denied, pas mobile, pas supporté
- [x] Toggle ON/OFF dans le Menu client (`MenuPage.jsx`)

> ⚠️ **PIÈGE UX CRITIQUE** : Si le client clique "Activer" et que la popup native Apple apparaît,
> et qu'il clique **"Refuser"** → `permission = 'denied'` → **on ne peut PLUS jamais re-déclencher la popup depuis le code**.
> Le client doit aller dans Réglages iPhone → Notifications pour réautoriser.
> → C'est pour ça que le soft prompt est essentiel : il prépare le client à cliquer "Autoriser".

### 3.6 — Edge Function send-push-notification
- [x] `supabase/functions/send-push-notification/index.ts`
- [x] Compatible Deno Edge Runtime (pas de dépendance Node.js)
- [x] Librairie : `@negrel/webpush` (Web APIs pures, compatible Deno)
- [x] Gère les subscriptions expirées (410/404 → delete en DB)
- [x] Supporte `prospect_id` (client) et `user_id` (admin futur)
- [x] Cache du serveur VAPID entre les requêtes (perf)

> ⚠️ **PIÈGE Deno** : La librairie `web-push` npm **ne fonctionne PAS** dans Supabase Edge Functions (elle utilise des APIs Node.js).
> Il faut utiliser `@negrel/webpush` (JSR) qui utilise uniquement les Web Crypto APIs.
> Mais cette librairie attend du JWK, pas du base64url raw → conversion manuelle obligatoire (voir 3.1).

> ⚠️ **PIÈGE pg_net** : Le trigger DB appelle l'Edge Function via `net.http_post()` (extension pg_net).
> Si pg_net n'est pas activé → le trigger s'exécute sans erreur mais la push n'est jamais envoyée.
> Vérifier : `SELECT * FROM pg_extension WHERE extname = 'pg_net';`

### 3.7 — Trigger DB → Push (Smart Push avec Présence)
- [x] Table `user_presence` : heartbeat 25s côté client (`ClientLayout.jsx`)
- [x] Trigger `fn_send_push_on_client_notification` sur table `client_notifications`
- [x] **Smart push** : vérifie si le client est ACTIF (is_active + last_seen < 45s) → skip push si oui
- [x] Vérifie qu'il existe au moins 1 subscription push avant d'appeler l'Edge Function
- [x] Appelle via `net.http_post()` avec anon key

> ⚠️ **PIÈGE Présence** : Le heartbeat client doit être **plus fréquent** que le seuil côté trigger.
> Heartbeat = 25s, seuil trigger = 45s → marge de 20s.
> Si heartbeat trop lent (ex: 60s) et seuil 45s → le client reçoit des push alors qu'il est sur l'app.

> ⚠️ **PIÈGE iOS background** : Quand la PWA iOS est en background, le heartbeat s'arrête.
> C'est le comportement voulu : client plus actif → push envoyé → notification native.

### ✅ État final Phase 3
- [x] Permission demandée via soft prompt + popup native
- [x] Subscription sauvegardée en DB (`push_subscriptions`)
- [x] Admin envoie message → trigger → Edge Function → push notification
- [x] Clic notification → ouvre la PWA sur `/dashboard`
- [x] Présence client → skip push si app active
- [x] Subscriptions expirées nettoyées (410 Gone)
- [x] Fonctionne sur iOS Safari PWA installée ✅
- [x] Fonctionne sur Android Chrome ✅
- [x] Toggle ON/OFF dans Menu client ✅

### 🚨 Résumé des pièges Push Notifications (pour la prochaine app)

| # | Piège | Impact | Solution |
|---|---|---|---|
| 1 | **VAPID format** : web-push npm = base64url raw, Deno webpush = JWK | Edge Function crash | Conversion manuelle `rawVapidToJwk()` |
| 2 | **web-push npm incompatible Deno** | Edge Function ne compile pas | Utiliser `@negrel/webpush` (JSR) |
| 3 | **Permission refusée = définitif** | Plus jamais de popup | Soft prompt AVANT popup native |
| 4 | **iOS : push uniquement en PWA installée** | Push ignorés dans Safari | Vérifier `isPWAInstalled()` |
| 5 | **`event.waitUntil()` obligatoire** dans push handler | Notification pas affichée | Wrapper `showNotification` dans `waitUntil` |
| 6 | **`requestPermission()` sans user gesture** | Bloqué silencieusement | Toujours suite à un click |
| 7 | **pg_net pas activé** | Trigger silencieux, pas de push | Vérifier extension pg_net |
| 8 | **Heartbeat vs seuil présence** | Push envoyé alors que client actif | Heartbeat < seuil (25s < 45s) |
| 9 | **Subscription morte en DB** | 410 Gone à chaque envoi | Cleanup auto dans Edge Function |
| 10 | **unsubscribe() change l'objet subscription** | Ancienne sub reste en DB | Supprimer par endpoint |

### 🔥 Chronologie des galères Push (pour ne pas refaire les mêmes erreurs)

#### Galère 1 — Edge Function : web-push npm ne marche pas dans Deno
- **Tentative 1** : `import webpush from 'web-push'` via esm.sh → crash (utilise `crypto` Node.js)
- **Tentative 2** : `web-push` via esm.sh avec polyfills → crash différent (buffer Node.js)
- **Solution finale** : `@negrel/webpush` (librairie JSR pure Web APIs) + conversion manuelle VAPID raw→JWK
- **Fichier** : `supabase/functions/send-push-notification/index.ts` — la fonction `rawVapidToJwk()`

#### Galère 2 — Push affichée même quand l'app est ouverte
Le client est SUR l'app, il voit les messages en temps réel, mais il reçoit quand même une notification push.
- **Tentative 1** (`38b0caf9`) : Vérifier `visibilityState` dans le Service Worker → `clients.matchAll({ type: 'window', includeUncontrolled: true })` → si une fenêtre est `visible` → skip. **Problème** : sur iOS PWA, `visibilityState` n'est pas toujours fiable.
- **Tentative 2** (`a04ff667`) : Heartbeat SW — le frontend envoie `postMessage('APP_ACTIVE')` au SW toutes les 3 secondes. Le SW garde un timestamp, et si < 5s → skip la push. **Problème** : sur iOS, quand le client change d'app, le dernier heartbeat peut être récent (< 5s) → push skippée alors que le client n'est plus sur l'app.
- **Tentative 3** (`4037ba5b`) : **Présence côté serveur** (solution finale). Le frontend upsert `user_presence` toutes les 25s + sur `visibilitychange`. Le TRIGGER DB vérifie `is_active=true AND last_seen < 45s` AVANT d'appeler l'Edge Function. Si client actif → pas d'appel → pas de push. **Fonctionne** car la décision est côté serveur (trigger DB SECURITY DEFINER), pas côté SW.
- **Ajustement** (`29fce52a`, `05d0eb46`) : Heartbeat ajusté de 3s → 7s → 20s → **25s** final. Seuil trigger ajusté de 30s → **45s**.

#### Galère 3 — Magic link ouvre Safari au lieu de la PWA installée
Sur iOS, un magic link envoyé par email s'ouvre TOUJOURS dans Safari, même si la PWA est installée.
- **Tentative 1** : Espérer que iOS redirige vers la PWA si le `scope` match → **non**, iOS n'a pas de deep linking pour les PWA.
- **Tentative 2** (`16511648`) : Page interstitielle `/open-app` qui dit "Retournez sur votre écran d'accueil et ouvrez l'app". **Problème** : UX horrible, le client ne comprend pas.
- **Solution finale** (`ac539e7d`) : **OTP code 6 chiffres** au lieu du magic link. L'admin envoie un code, le client le tape dans la PWA. Pas de lien, pas de Safari, tout reste dans la PWA.
- **Fichiers** : `src/pages/client/ClientAccessPage.jsx`, Edge Function Supabase Auth OTP

#### Galère 4 — Pastille "Action requise" ne disparaît jamais
Après avoir soumis un formulaire, la pastille rouge restait.
- **Cause** : `addChatMessage()` pouvait throw (doublon réseau) AVANT que `updateClientFormPanel()` ne soit appelé → le panel restait `pending` → pastille éternelle.
- **Fix** (`b32c0040`) : Inverser l'ordre → `updateFormPanel` AVANT `addChatMessage` + `addChatMessage` dans un try/catch séparé (non bloquant).
- **Leçon** : ⚠️ Toujours mettre l'opération critique (update status) AVANT l'opération secondaire (message chat). Si le chat plante, le status est quand même mis à jour.

#### Galère 5 — Notifications doublons client
Le client recevait 2 notifications pour chaque message admin.
- **Cause** : Le frontend (`addChatMessage` dans App.jsx) créait une notification ET le trigger DB `on_admin_message_notify_client` en créait une aussi.
- **Fix** (`0cba3f66`) : Supprimer TOUTE création de notifications côté frontend. Les triggers DB sont la seule source de vérité.
- **Leçon** : ⚠️ **Règle absolue** : Les notifications sont UNIQUEMENT créées par les triggers DB (SECURITY DEFINER). Jamais côté frontend.

---

## 📂 Fichiers à créer/modifier

| Fichier | Action | Phase |
|---------|--------|-------|
| `vite.config.js` | Modifier — ajouter VitePWA plugin | 1 |
| `index.html` | Modifier — meta tags PWA | 1 |
| `public/pwa-192x192.png` | Créer — icône par défaut | 1 |
| `public/pwa-512x512.png` | Créer — icône par défaut | 1 |
| `public/apple-touch-icon.png` | Créer — icône Apple | 1 |
| `src/hooks/usePWAManifest.js` | Créer — manifest dynamique multi-tenant | 1 |
| `src/layouts/ClientLayout.jsx` | Modifier — appeler usePWAManifest + InstallPrompt | 1+2 |
| `src/components/client/InstallPWAPrompt.jsx` | Créer — bannière installation | 2 |
| `src/hooks/usePushNotifications.js` | Créer — gestion push subscription | 3 |
| `src/components/client/NotificationPermission.jsx` | Créer — UI demande permission | 3 |
| `supabase/functions/send-push-notification/index.ts` | Créer — Edge Function envoi push | 3 |
| `create_push_subscriptions_table.sql` | Créer — migration SQL | 3 |
| `add_trigger_push_on_notification.sql` | Créer — trigger DB | 3 |

---

## ⚠️ Contraintes multi-tenant

- Le manifest est **dynamique** : nom, icône et couleur viennent de `organization_settings`
- Les push subscriptions sont liées à `organization_id` + `prospect_id`
- La bannière d'installation affiche le nom de l'org (pas "EVATIME")
- Les icônes par défaut (EVATIME) servent de fallback uniquement
- Le trigger push respecte `client_notification_config` de l'org

---

## 📝 Notes techniques

- **Magic link → PWA** : Sur Android, si la PWA est installée et que le `scope` match, Chrome redirige automatiquement. Sur iOS, c'est plus limité — le lien ouvre toujours Safari. Solution possible : page interstitielle "Ouvrir dans l'app".
- **iOS Push** : Supporté depuis iOS 16.4 (mars 2023) mais uniquement pour les PWA installées sur l'écran d'accueil.
- **vite-plugin-pwa** déjà installé (`npm install` fait dans cette session).

---

## 🚨 ATTENTION — Notifications Push (Phase 3)

> **Les notifications push sont un sujet SENSIBLE. À traiter avec précaution.**

### Pourquoi c'est sensible :
1. **Permission unique** — Si le client refuse la permission, c'est quasi définitif (le browser bloque la demande). On a **UNE SEULE CHANCE** de bien poser la question.
2. **Spam = désinstallation** — Trop de notifs → le client désinstalle l'app ou désactive les notifs. Pire que de ne pas en avoir.
3. **Timing** — Ne JAMAIS demander la permission au premier lancement. Le client ne sait même pas ce qu'il va recevoir.
4. **RGPD** — Les push subscriptions sont des données personnelles. Consentement explicite obligatoire.
5. **iOS est spécial** — Push fonctionne UNIQUEMENT si la PWA est installée sur l'écran d'accueil (pas dans Safari). Il faut guider le client.
6. **Multi-tenant** — Chaque org doit pouvoir configurer quels types de notifs sont envoyés (`client_notification_config`). Un admin ne doit pas pouvoir spammer les clients d'une autre org.

### Règles absolues Phase 3 :
- ❌ JAMAIS de `Notification.requestPermission()` au chargement de page
- ❌ JAMAIS de notif push sans que le client ait EXPLICITEMENT accepté
- ❌ JAMAIS de notif push pour des trucs non pertinents (marketing, promo)
- ✅ Demander la permission APRÈS une action (ex: première visite du chat, après avoir rempli un formulaire)
- ✅ Expliquer AVANT de demander : "Recevez une alerte quand votre conseiller vous envoie un message"
- ✅ Permettre de se désabonner facilement (dans Menu > Paramètres)
- ✅ Respecter `client_notification_config` de l'org (types activés/désactivés)
- ✅ Rate limiting : max X notifs par jour par client
- ✅ Regrouper les notifs si plusieurs arrivent d'un coup (pas 5 notifs en 10 secondes)

### Flow recommandé :
```
1. Client installe la PWA → PAS de demande de permission
2. Client utilise l'app quelques jours → PAS de demande
3. Client ouvre le chat pour la 2e ou 3e fois → Bannière soft :
   "Voulez-vous être notifié quand {brandName} vous répond ?"
   [Activer] [Plus tard]
4. Clic "Activer" → ALORS seulement Notification.requestPermission()
5. Si accepté → subscribe + sauvegarder en DB
6. Si refusé → ne JAMAIS redemander (stocker le refus)
```

### Données à ne JAMAIS mettre dans une notif push :
- Montants financiers
- Données personnelles (adresse, téléphone)
- Contenu de formulaires
- ✅ OK : "Nouveau message de votre conseiller", "Un document est disponible", "Formulaire à compléter"

---

## 🚨 Bugs iOS Mobile Résolus (14 mars 2026)

> **Référence pour les futures apps mobiles PWA.** Ces bugs sont spécifiques à iOS Safari / PWA standalone.

### Bug 1 — Chat : messages ne chargent pas (cold start)
- **Symptôme** : Spinner infini, aucun message affiché à l'ouverture
- **Cause** : `setLoading(false)` dans le guard `if (!prospectId) return` du hook `useSupabaseChatMessages.js` — se déclenche AVANT que l'auth async fournisse le `prospectId`
- **Fix** : Retirer `setLoading(false)` du guard
- **Fichier** : `src/hooks/useSupabaseChatMessages.js`

### Bug 2 — Chat : scroll freeze après formulaire
- **Symptôme** : Le chat se fige après ouverture/fermeture d'un panel formulaire
- **3 causes** :
  1. `isNearBottom` recalculé à chaque render → boucle infinie de `scrollToBottom` → **Fix** : `useRef` au lieu de `useState`
  2. `panelIds` (array) recalculé à chaque render → re-render infini → **Fix** : `useRef` + comparaison JSON avant setState
  3. CSS `transition-[bottom]` sur le container → gèle le scroll tactile iOS → **Fix** : supprimé
- **Fichier** : `src/pages/client/MobileChatProjectPage.jsx`

### Bug 3 — Chat : clavier reste ouvert après envoi
- **Symptôme** : Le client envoie un message → clavier ne se ferme pas, dernier message caché
- **Fix** : `inputRef.current?.blur()` après `addChatMessage()` + `handleInputBlur` avec scroll-to-bottom après 300ms
- **Fichier** : `src/pages/client/MobileChatProjectPage.jsx`

### Bug 4 — PWA : nom "Espace Client" au lieu du nom de l'org
- **Cause** : Manifest statique dans `vite.config.js` avait `name: "Espace Client"` en fallback → gagnait sur le manifest dynamique
- **Fix** : Vider les champs `name`, `short_name`, `description` dans le manifest statique
- **Fichier** : `vite.config.js`

### Bug 5 — Logo org ne s'affichait pas (nouvelles orgs)
- **Cause** : `updateLogo()` utilisait `.update()` → fail silently si aucune row dans `organization_settings`
- **Fix** : `.upsert({ ...data }, { onConflict: 'organization_id' })`
- **Fichier** : `src/hooks/useSupabaseCompanySettings.js`

---

## 📐 Règles d'or iOS Mobile / PWA

> **À respecter pour TOUTE future app mobile PWA sur iOS.**

| # | Règle | Pourquoi |
|---|---|---|
| 1 | **Pas de `transition` CSS sur `bottom`/`height`** | Gèle le scroll tactile sur iOS Safari |
| 2 | **`WebkitOverflowScrolling: 'touch'`** sur tout container scrollable | Scroll fluide obligatoire sur iOS |
| 3 | **`behavior: 'auto'`** pour `scrollIntoView` (pas `'smooth'`) | `smooth` bloque le touch scroll sur iOS |
| 4 | **`inputRef.blur()`** après envoi dans un chat | iOS ne ferme pas le clavier automatiquement |
| 5 | **`useRef`** pour valeurs qui changent souvent (isNearBottom, panelIds) | Évite les re-renders infinis |
| 6 | **`.upsert()` jamais `.update()`** pour tables de config | `.update()` fail silently si 0 rows |
| 7 | **Manifest statique vide** si manifest dynamique | Le statique gagne sinon |
| 8 | **Pas de `setLoading(false)` dans les guards** de hooks async | Le parent croit que c'est fini alors que rien n'a chargé |
| 9 | **`replace: true`** quand on skip une page intermédiaire | Évite le flash + historique propre |
| 10 | **Soft prompt AVANT popup native Apple** pour les notifs | Si refus Apple → bloqué définitivement côté code |
