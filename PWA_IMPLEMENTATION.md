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

## 🟠 PHASE 3 — Push Notifications

### 3.1 — VAPID Keys
- [ ] Générer une paire VAPID (public + private)
- [ ] Stocker `VITE_VAPID_PUBLIC_KEY` dans `.env`
- [ ] Stocker `VAPID_PRIVATE_KEY` dans Supabase secrets

### 3.2 — Table push_subscriptions
- [ ] Créer migration SQL :
  ```sql
  CREATE TABLE push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prospect_id UUID REFERENCES prospects(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    subscription JSONB NOT NULL,  -- { endpoint, keys: { p256dh, auth } }
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(prospect_id, subscription->>'endpoint')
  );
  ```
- [ ] RLS policies (client peut INSERT/DELETE ses propres subscriptions)

### 3.3 — Service Worker push handler
- [ ] Ajouter dans le custom SW :
  ```js
  self.addEventListener('push', (event) => { ... })
  self.addEventListener('notificationclick', (event) => { ... })
  ```
- [ ] Afficher notification native avec titre + body + icône org
- [ ] Clic sur notification → ouvre la PWA sur la bonne page

### 3.4 — Hook usePushNotifications
- [ ] Créer `src/hooks/usePushNotifications.js`
  - Demander permission `Notification.requestPermission()`
  - `registration.pushManager.subscribe()` avec VAPID public key
  - Sauvegarder subscription dans `push_subscriptions`
  - Gérer unsubscribe

### 3.5 — Composant NotificationPermission
- [ ] Créer `src/components/client/NotificationPermission.jsx`
  - Bannière : "Activer les notifications pour ne rien manquer"
  - Bouton "Activer" → demande permission → subscribe
  - Affiché après installation PWA (pas avant)
  - Dismiss persisté

### 3.6 — Edge Function send-push-notification
- [ ] Créer `supabase/functions/send-push-notification/index.ts`
  - Input : `{ prospect_id, title, body, url, organization_id }`
  - Lit subscription(s) depuis `push_subscriptions`
  - Envoie via Web Push protocol (avec VAPID private key)
  - Gère les subscriptions expirées (410 → delete)

### 3.7 — Trigger DB → Push
- [ ] Créer trigger sur `notifications` INSERT
  - Si le prospect a une push_subscription → appeler Edge Function
  - Respecter `client_notification_config` de l'org (types activés)

### ⏸️ PAUSE VÉRIF PHASE 3
- [ ] Permission demandée correctement
- [ ] Subscription sauvegardée en DB
- [ ] Admin envoie message → client reçoit push notification (app fermée)
- [ ] Clic sur notification → ouvre la PWA sur le bon chat
- [ ] Fonctionne sur Android Chrome
- [ ] Fonctionne sur iOS Safari (iOS 16.4+)
- [ ] Subscriptions expirées nettoyées automatiquement

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
