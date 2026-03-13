# 📊 PROGRESS_LOG — EVATIME

> **Journal de progression du projet. À lire par toute nouvelle session IA.**
> Mis à jour après chaque session de travail.

---

## 📅 13 mars 2026 — Session 4 (journée)

### 🎯 Résumé : App client mobile → UX finale (nav bar, chat, clavier iOS)

### 🐛 Problèmes rencontrés et résolutions

#### 1. Nav bar trop petite sur mobile
- **Problème** : La bottom nav `h-16` était minuscule, icônes et textes trop petits
- **Solution** : Agrandie progressivement → `h-[88px]`, icônes `h-[26px]`, texte `text-[13px]`, `gap-1.5`
- **Impact** : Mis à jour TOUS les fichiers dépendants (`bottom-[88px]`, `pb-28`, `bottom-[92px]`)

#### 2. Input chat mangé par la nav bar
- **Problème** : L'input de chat était caché sous la nav bar (ancien `bottom-16` pas aligné avec `h-[88px]`)
- **Solution** : Container chat `bottom-[88px]`, input agrandi `h-12 text-base`, boutons `h-11 w-11`

#### 3. framer-motion cassait le positionnement fixe
- **Problème** : Les `motion.div` avec `x/y` transforms dans Dashboard et ProjectDetails créaient un nouveau contexte de positionnement → les éléments `fixed` à l'intérieur ne fonctionnaient plus correctement
- **Solution** : Gardé uniquement `opacity` dans les animations, supprimé `x` et `y`

#### 4. PWA ne se mettait pas à jour sur iPhone
- **Problème** : `registerSW.js` avait `// Pas de reload automatique` → le nouveau Service Worker s'installait mais ne prenait jamais le contrôle
- **Solution** : Ajouté `window.location.reload()` à l'activation du SW + `registration.update()` toutes les 2 minutes

#### 5. `visualViewport` ne fonctionne PAS en PWA iOS standalone
- **Problème** : On a tenté de détecter l'ouverture du clavier via `window.visualViewport.resize` pour cacher la nav bar. **Cette API ne fire PAS dans les PWA standalone sur iOS.**
- **Tentative échouée** : Vérifiée dans le code, aucun event ne se déclenche
- **Solution** : Remplacé par `onFocus/onBlur` sur l'input (voir point 6)

#### 6. Nav bar restait visible quand le clavier s'ouvrait
- **Problème** : Sur iOS, quand le clavier s'ouvre, la nav bar restait en bas → écrasait l'espace disponible pour le chat
- **Première tentative** : `onFocus/onBlur` avec `bottom-0` → l'input DISPARAISSAIT car le chat (z-40) passait sous la nav bar (z-50)
- **Deuxième tentative** : Cacher la nav bar via `!isChatProjectPage` dans ClientLayout → l'utilisateur ne voulait PAS ça (nav bar visible quand clavier fermé)
- **Solution finale** : Custom event `keyboard-toggle` :
  - `MobileChatProjectPage` : `onFocus` → dispatch `{ open: true }`, `onBlur` → dispatch `{ open: false }`
  - `MobileBottomNav` : écoute l'event → `return null` quand `open=true`
  - Container chat : `bottom-0 z-[60]` quand clavier ouvert, `bottom-[88px] z-40` sinon
  - Cleanup `useEffect` au unmount de la page chat → nav bar revient toujours

#### 7. Bouton Envoyer fermait le clavier sans envoyer
- **Problème** : Appuyer sur le bouton Envoyer déclenchait le `onBlur` de l'input AVANT le `onClick` du bouton → le clavier se fermait, le layout changeait, le click était perdu
- **Solution** : `onMouseDown={(e) => e.preventDefault()}` sur les boutons Envoyer et Pièce jointe → empêche le blur → clavier reste ouvert → message envoyé en 1 tap
- **⚠️ Piège iOS** : `onTouchStart preventDefault()` bloque le `click` (flow `touchstart → touchend → click`). Utiliser `onMouseDown` uniquement.

### ✅ État final — App client mobile

| Composant | État | Détail |
|-----------|------|--------|
| **Bottom nav** | ✅ 88px | Home/Chat/Menu, icônes 26px, texte 13px, `env(safe-area-inset-bottom)` |
| **Chat input** | ✅ | h-12 text-base, `enterKeyHint="send"`, anti-autocorrect |
| **Clavier iOS** | ✅ | Nav bar disparaît au focus, revient au blur, boutons gardent le clavier ouvert |
| **PWA update** | ✅ | Auto-reload sur activation SW + check toutes les 2 min |
| **Présence** | ✅ | Heartbeat 25s + trigger DB 45s → supprime push si app active |
| **MESSAGE buttons** | ✅ | Valider approuve TOUS les panels MESSAGE pending du projet |

### 📝 Fichiers modifiés cette session
| Fichier | Modification |
|---------|-------------|
| `src/components/client/MobileBottomNav.jsx` | h-[88px], icônes 26px, texte 13px, **écoute event keyboard-toggle → se cache** |
| `src/pages/client/MobileChatProjectPage.jsx` | bottom-[88px], input h-12, **focus/blur + custom event + onMouseDown preventDefault** |
| `src/layouts/ClientLayout.jsx` | pb-28, nav bar toujours affichée (sauf quand keyboard event la cache) |
| `src/components/Dashboard.jsx` | pb-28, animation opacity-only |
| `src/components/ProjectDetails.jsx` | pb-28, animation opacity-only |
| `src/components/client/MobileFormModal.jsx` | bottom-[88px] |
| `src/components/client/InstallPWAPrompt.jsx` | bottom-[92px] |
| `src/components/client/NotificationOptIn.jsx` | bottom-[92px] |
| `src/lib/registerSW.js` | Auto-reload on SW activation + check every 2 min |

### 💡 Leçons iOS PWA apprises
1. **`window.visualViewport`** : NE FONCTIONNE PAS en PWA standalone sur iOS
2. **`onTouchStart preventDefault()`** : BLOQUE le `click` qui suit sur iOS (utiliser `onMouseDown` à la place)
3. **framer-motion `x/y` transforms** : créent un nouveau stacking context → cassent les `position: fixed` enfants
4. **Service Worker PWA** : il faut forcer le reload à l'activation, sinon l'utilisateur reste sur l'ancien cache indéfiniment
5. **Focus/blur pour détecter le clavier** : seule méthode fiable en PWA iOS standalone

### 🔜 Prochain gros chantier : APP MOBILE ADMIN

L'app client mobile est **terminée**. Le prochain sujet est de créer l'**app mobile admin** (commerciaux sur le terrain).

**Ce qui existe déjà côté admin (desktop only)** :
- Pipeline prospects (`FinalPipeline.jsx`) — drag & drop colonnes
- Agenda (`Agenda.jsx`) — calendrier rdv/appels/tâches
- Contacts/Prospects (`ContactsPage.jsx`) — liste + détails
- Chat interne/partenaire (`ProspectDetailsAdmin.jsx`)
- Workflow V2 (`WorkflowV2ConfigPage.jsx`)
- Charly AI (`CharlyPage.jsx`)
- Profil/Config (`ProfilePage.jsx`)

**À faire pour mobile admin** :
1. **`AdminLayout` mobile** : détection mobile, bottom nav admin (Pipeline / Agenda / Plus)
2. **Pipeline mobile** : liste cards (pas de drag & drop) ou kanban simplifié swipeable
3. **Prospect detail mobile** : version compacte de `ProspectDetailsAdmin` (chat + timeline + actions robot)
4. **Agenda mobile** : vue jour/semaine compacte, ajouter rdv en 2 taps
5. **Notifications push admin** : réutiliser le système presence + push déjà en place côté client
6. **PWA admin** : même manifest dynamique, même auto-update SW

**Patterns à réutiliser** (prouvés cette session) :
- Bottom nav fixe 88px + `env(safe-area-inset-bottom)`
- Custom event `keyboard-toggle` pour cacher la nav au clavier
- `onMouseDown preventDefault` sur les boutons d'action
- Animation opacity-only (pas de `x/y` transforms)
- PWA auto-reload via `registerSW.js`

---

## 📅 12-13 mars 2026 — Session 3 (nuit)

### ✅ Features — Mobile Redesign Complet
- **📱 Redesign Mobile Étape 1→4** : Toutes les phases du `MOBILE_REDESIGN_PLAN.md` terminées et déployées
  - **Bottom nav 3 onglets** : Home / Chat / Menu (anciennement Profil)
  - **Chat conversations** : `ChatConversationsList.jsx` style WhatsApp avec badges non lus
  - **Chat projet** : `MobileChatProjectPage.jsx` — messages + boutons action + upload fichiers
  - **Formulaire plein écran** : `MobileFormModal.jsx` — wraps `ClientFormPanel` dans overlay fullscreen
  - **Carte projet cliquable** : mobile ET desktop — clic n'importe où sur la carte ouvre le projet
  - **Pastille "Action requise"** : visible mobile + desktop, rouge vif avec glow pulse (pas de disparition)

### ✅ Features — UX Brief v2 (4 points)
- **Action requise → ouvre le chat** : clic carte avec action requise → `/dashboard/chat/:projectType` (pas la timeline)
- **Bottom nav toujours visible** : visible sur chat, formulaires, partout — `MobileChatProjectPage` et `MobileFormModal` utilisent `bottom-16`
- **Onglet Menu** : remplace Profil — nouvelle page `MenuPage.jsx` avec liens Profil, Parrainage, Offres, Déconnexion
- **Home simplifiée** : bandeaux Offres/Parrainage retirés (accessibles via Menu)

### ✅ Features — Ajustements UX
- **"Mes projets"** remplace "Vue d'ensemble" (mobile + desktop)
- **Compteurs dynamiques** : "N terminé / N en cours" calculés depuis `projectStepsStatus` (Supabase)
- **Home reset** : clic Home bottom nav → retour vue projets (reset `selectedProject` via `location.state.resetProject`)
- **Fond blanc chat** : `ClientLayout` met `bg-white` quand on est sur page chat (élimine flash gris entre routes)
- **Offres page** : responsive mobile (images h-32, compact text), titre "Nos offres exclusives ⚡"
- **Parrainage page** : responsive mobile (compact stats grid-cols-3, cards au lieu de table)

### 🐛 Bugs fixés (session précédente — rappel)
- **Notifications doublons client** : supprimé création frontend dans `addChatMessage` → triggers DB only
- **Notifications admin manquantes** : créé triggers `on_client_message_notify_admin` + `trigger_notify_admin_on_client_form_submit`
- **Trigger client ignorait sender='pro'** : fix `sender NOT IN ('admin', 'pro')`

### 📝 Fichiers créés cette session
| Fichier | Rôle |
|---------|------|
| `src/components/client/MobileBottomNav.jsx` | Bottom nav 3 onglets (Home/Chat/Menu) + badges |
| `src/components/client/ChatConversationsList.jsx` | Liste conversations WhatsApp-style |
| `src/components/client/MobileFormModal.jsx` | Overlay fullscreen formulaire |
| `src/pages/client/MobileChatProjectPage.jsx` | Chat mobile par projet |
| `src/pages/client/ChatPage.jsx` | Route `/dashboard/chat` (rend ChatConversationsList) |
| `src/pages/client/MenuPage.jsx` | Page menu mobile (Profil, Parrainage, Offres, Déconnexion) |

### 📝 Fichiers modifiés cette session
| Fichier | Modification |
|---------|-------------|
| `src/App.jsx` | Routes `chat/:projectType`, `menu` ajoutées + import MenuPage |
| `src/layouts/ClientLayout.jsx` | Bottom nav toujours visible, fond blanc conditionnel chat |
| `src/components/Dashboard.jsx` | "Mes projets" + compteurs dynamiques, bandeaux retirés |
| `src/components/ProjectCard.jsx` | Carte cliquable partout, pastille glow, action requise → chat |
| `src/components/ProjectDetails.jsx` | `isMobile` masque chat section |
| `src/pages/client/ParrainagePage.jsx` | Responsive mobile |
| `src/pages/client/OffersPage.jsx` | Responsive mobile |
| `src/index.css` | Animation `@keyframes glow` pour pastille |

### 📝 Commits session
- `114651c5` feat: mobile redesign étape 1
- `49051b87` feat: mobile redesign étape 2
- `2fccf347` feat: mobile redesign étape 3
- `866bae62` fix: form cards dans le flux du chat
- `b47e73eb` fix: header+input chat fixe
- `7afa3c11` fix: masque header+bottomnav sur chat projet
- `6b7d896a` feat: mobile redesign étape 4
- `c21047d6` feat: bandeaux Offres + Parrainage Home mobile
- `5e24bc6f` fix: Parrainage UX responsive mobile
- `213fa4d3` fix: Offres UX responsive mobile
- `8a14d3b0` fix: titres Offres
- `bf67ff59` feat: UX mobile v2 — action requise→chat, bottom nav permanente, menu page, home simplifiée
- `08c6f61d` feat: mobile home — Mes projets N terminé / N en cours
- `27351270` fix: remet bloc blanc autour Mes projets
- `0f8a080e` fix: desktop Vue d'ensemble → Mes projets
- `21262391` feat: pastille Action requise desktop + carte cliquable partout
- `d02045b8` fix: pastille glow pulse (toujours visible)
- `b20d5edd` fix: Home bottom nav → retour vue projets
- `9ea198f3` fix: chat mobile — supprime animation flash
- `952c5bae` fix: fond blanc ClientLayout sur page chat

### 🚀 Déploiement
- **Vercel** : `git push origin main` déclenche le déploiement automatique
- ⚠️ **NE PAS** utiliser `npm run deploy` (push sur gh-pages → erreur Vercel)

### 🔜 Prochains sujets
- **Test complet mobile** : vérifier tous les flows (Home → projet → timeline, Chat → conversation → formulaire)
- **Test desktop** : vérifier que RIEN n'a changé
- **Signature mobile** : vérifier le flow signature dans le chat mobile
- **Notifications mobile** : pastille Chat reflète bien les notifs en temps réel

---

## 📅 12 mars 2026 — Session 2 (soir)

### ✅ Features
- **📱 Mobile Redesign Phase 1** : Bottom nav 3 onglets (Accueil / Chat / Profil) avec badge notification sur Chat
- **📱 Mobile Redesign Phase 7** : Nettoyage mobile — masqué cloche/profil/hamburger dans header, masqué ClientFormPanel mobile (formulaires via chat en Phase 5)
- **Page ChatPage placeholder** : `/dashboard/chat` créée pour Phase 3 (conversations WhatsApp-style)

### 🐛 Bugs fixés
- **Notifications doublons client** : supprimé la création frontend dans `addChatMessage` (App.jsx) — le trigger DB `on_admin_message_notify_client` suffit
- **Notifications admin manquantes (messages)** : créé trigger DB `on_client_message_notify_admin` (supprimé par `disable_notification_triggers.sql` et jamais recréé)
- **Notifications admin manquantes (formulaires)** : créé trigger DB `trigger_notify_admin_on_client_form_submit` sur `client_form_panels.status → 'submitted'`
- **Trigger client ignorait sender='pro'** : fix `notify_client_on_admin_message` — `sender NOT IN ('admin', 'pro')` au lieu de `sender != 'admin'`

### 🗄️ Migrations SQL exécutées
- `fix_admin_notification_trigger.sql` — trigger `on_client_message_notify_admin` (message client → notif admin)
- `fix_client_trigger_accept_pro_sender.sql` — trigger client accepte `sender='pro'`
- `fix_admin_notif_on_form_submit.sql` — trigger `trigger_notify_admin_on_client_form_submit` (formulaire soumis → notif admin)

### 📐 Architecture notifications (état final)
| Trigger DB | Table surveillée | Condition | Notifie |
|------------|-----------------|-----------|---------|
| `on_admin_message_notify_client` | `chat_messages` | sender IN ('admin','pro'), channel != internal/partner | Client |
| `on_client_message_notify_admin` | `chat_messages` | sender = 'client', channel != internal/partner | Admin |
| `trigger_notify_admin_on_client_form_submit` | `client_form_panels` | status → 'submitted', filled_by_role != 'partner' | Admin |
| `trigger_notify_admin_on_partner_form_submit` | `client_form_panels` | status → 'submitted', partenaire | Admin |
| `trigger_notify_admin_on_internal_message` | `chat_messages` | channel = 'internal' | Admin |
| `trigger_notify_admin_on_partner_message` | `chat_messages` | channel = 'partner' | Admin |

> **Principe** : ZÉRO notification créée côté frontend. Tout est géré par les triggers DB (SECURITY DEFINER).

### 📝 Commits session
- `114651c5` feat: mobile redesign étape 1
- `0cba3f66` fix: notifications — triggers DB only, no frontend duplicates
- `50d93a79` fix: notifications — all DB triggers

### 🔜 Prochains sujets
- **📱 Redesign Mobile Phase 2** — Carte projet cliquable → vue Timeline
- **📱 Redesign Mobile Phase 3** — Page Chat (liste conversations WhatsApp-style)
- **📱 Redesign Mobile Phase 5** — Bouton "Remplir le formulaire" dans le chat + modal plein écran
- **Bug formulaire invisible admin** : `forms[panel.formId]` undefined pour nouveaux formulaires → `return null` (fix : fallback display)

---

## 📅 12 mars 2026

### ✅ Features
- **Partenaire + MESSAGE** : nouveau flow où le partenaire reçoit mission sans formulaire (juste instructions + boutons Valider/Impossible)
- **Real-time missions partenaire** : postgres_changes listeners sur PartnerMissionsPage + PartnerMissionDetailPage
- **Chat pagination** : chargement 25 messages à la fois, infinite scroll vers le haut, bouton "Charger plus"
- **Tableau de bord nav reset** : clic sur "Tableau de bord" dans la navbar client ramène à la vue d'ensemble (reset projet sélectionné)
- **Formulaires toujours visibles** : panneau "Formulaires à compléter" affiché côté client même sans formulaire (état vide avec icône 📋)
- **ProjectCard étape correcte** : affiche `in_progress` au lieu de `pending` comme étape courante

### 🐛 Bugs fixés
- **Multi-missions même partenaire** : ajout colonne `action_id` sur missions + guard V2
- **Double-clic duplicates** : guard dedup sur panels MESSAGE
- **Reject MESSAGE mission** : action_id fallback dans handleReject + statut 'rejected' filtré côté partenaire
- **Client notification V2 MESSAGE** : `sender: 'pro'` → `sender: 'admin'` + trigger DB colonnes corrigées (`count`/`read`/`created_at`)
- **Crash messagesLoading** : `loading` → `messagesLoading` dans le JSX destructuré

### 🎨 UI/UX
- Réduit espacement header ↔ grid sur page prospect admin (`-mt-4` + `space-y-2`)
- Caché l'ID projet côté client (`Projet #UUID` supprimé)
- Élargi colonne gauche client à 340px (étapes sur une ligne)
- Colonne formulaires client à 335px
- Formulaire approuvé compact : supprimé le banner vert redondant, gardé badge + valeurs soumises

### 🗄️ Migrations SQL exécutées
- `add_action_id_to_missions.sql` — colonne action_id sur missions
- `fix_client_notification_trigger.sql` — trigger `notify_client_on_admin_message` avec colonnes correctes

### 🔜 Prochains sujets
- **📱 Redesign Mobile Client** — Plan complet dans `MOBILE_REDESIGN_PLAN.md`
  - Bottom nav 3 onglets (Home / Chat / Profil)
  - Liste conversations style WhatsApp
  - Bouton "Remplir le formulaire" dans le chat (mobile only)
  - Formulaire plein écran (modal)
  - Vue Timeline séparée (clic carte projet)
  - 4 étapes avec points d'arrêt test
- Mise à jour `PROGRESS_LOG.md` ✅

### 📝 Commits session
- `04ddb10d` → `b6661bf4` (12+ commits)

---

## 🏗️ Architecture Workflow V2 — ÉTAT ACTUEL (10 mars 2026)

> **Lis cette section EN PREMIER pour comprendre le système avant toute modification.**

### Principe fondamental
```
L'admin/IA clique le robot 🤖 pour CHAQUE action.
Le trigger DB ne lance JAMAIS d'action — il fait le "ménage" (subSteps + complétion).
```

### Flow complet (étape avec 2 actions)
```
Admin clique 🤖 → preview action-0 → "Exécuter"
  → executeActionOrderV2.js crée panel + message chat
  → Client interagit → panel.status = 'approved'
  → TRIGGER DB fn_v2_action_chaining :
     • Crée subSteps si absentes (depuis workflow_module_templates)
     • action-0 → completed, action-1 → in_progress
     • STOP (attend le robot)

Admin clique 🤖 → preview action-1 → "Exécuter"
  → Client interagit → panel.status = 'approved'
  → TRIGGER DB : dernière action !
     • Toutes subSteps → completed
     • Étape → completed, étape suivante → in_progress
```

### 3 guards frontend (V2 panels ignorés par le frontend)
| Guard | Fichier | Si `action_id.startsWith('v2-')` |
|-------|---------|----------------------------------|
| `useWorkflowActionTrigger` | `src/hooks/useWorkflowActionTrigger.js` | SKIP sendNextAction |
| `handleApprove` | `ProspectDetailsAdmin.jsx` | SKIP completeStepAndProceed |
| `sendNextAction` TENTATIVE 2 | `ProspectDetailsAdmin.jsx` | return immédiat |

### Types d'actions
| Type | Qui interagit | Comment ça se termine |
|------|---------------|----------------------|
| MESSAGE | Client clique Valider | panel → approved |
| FORM | Client remplit → Admin valide | panel → approved |
| SIGNATURE | Client signe (Yousign/etc) | signature → trigger → panel → approved |
| PARTENAIRE | Partenaire soumet → Admin valide | panel → approved |

### Flow SIGNATURE (2 triggers chaînés, 100% server-side)
```
1. executeActionOrderV2 crée panel + signature_procedure (panelDbId stocké dans metadata)
2. Client signe → signature_procedures.status = 'signed'/'completed'
3. TRIGGER 1: fn_signature_completed_to_panel_approved → panel.status = 'approved'
4. TRIGGER 2: fn_v2_action_chaining → subSteps MAJ + complétion étape
→ Fonctionne SANS admin connecté. Zéro intervention frontend.
```

### 🤖 Préparation IA (config prête, pas encore branchée)
L'IA n'est PAS encore connectée, mais toute la config est prête dans `workflow_module_templates.config_json` :
- **knowledgeKey** : 8 clés d'accès données (prospect_info, contract_history, forms_submitted, chat_history, documents, client_projects_history, commercial_activity, partner_activity). UI en lecture seule pour l'instant.
- **documents IA** : Upload de documents privés par action (context pour l'IA)
- **allowedActions** : Liste des actions autorisées (respond, checklist, list_docs). À étendre avec create_appointment, send_whatsapp, send_sms, send_email quand l'IA sera branchée.
- **instructions** : Prompt en langage naturel par module (objectif, comportement, ton)
- **Fichier clé** : `src/components/admin/workflow-v2/ModuleConfigTab.jsx` (KnowledgeKeySelect, documents IA, allowedActions)

### 📡 Vision canal de communication (à implémenter)
```
WhatsApp = canal principal de conversation (IA discute avec le client)
Espace client = canal d'action (formulaires, signature, documents via magic link)
chat_messages = source de vérité (tout est stocké ici, WhatsApp = transport)
```
- Magic link déjà codé côté admin (bouton dans ProspectDetailsAdmin), envoie par email → futur : envoyer par WhatsApp
- Client ne crée jamais de mot de passe, clique le lien, fait son action, ferme
- Briques à ajouter : Edge Function Twilio (WhatsApp + SMS), détection présence client

### Fichiers clés
| Fichier | Rôle |
|---------|------|
| `fix_trigger_v4_simple.sql` | Trigger DB actuel (subSteps + complétion) |
| `src/lib/executeActionOrderV2.js` | Moteur exécution (admin clique Exécuter) |
| `src/hooks/useWorkflowActionTrigger.js` | Real-time listener + guard V2 |
| `src/components/admin/ProspectDetailsAdmin.jsx` | Guards handleApprove + sendNextAction |

---

## 🔖 Convention

Chaque entrée contient :
- **Date** de la session
- **Features** ajoutées (✅)
- **Bugs fixés** (🐛)
- **Migrations SQL** exécutées (🗄️)
- **À faire** ensuite (🔜)

---

## 12 mars 2026 (session 7)

### ✅ Features
- **Partenaire + Message** : Nouveau type d'action — mission partenaire SANS formulaire. Le partenaire voit les instructions + boutons Valider/Impossible. L'admin voit le résultat avec commentaire dans la section Formulaires soumis.
  - `executeActionOrderV2.js` : Bloc PARTENAIRE+MESSAGE crée panel `action_type='message'`, `filled_by_role='partner'`
  - `PartnerMissionDetailPage.jsx` : Charge le panel MESSAGE pour missions sans `form_ids`, gère soumission/rejet
  - `ProspectDetailsAdmin.jsx` : Rendu spécifique "Mission partenaire" (pas de champs form, pas de Modifier, affiche commentaire)

- **Multi-missions même partenaire** : Un partenaire peut recevoir plusieurs missions pour le même prospect/project_type (actions V2 distinctes).
  - Migration SQL : `ALTER TABLE missions ADD COLUMN action_id TEXT` 
  - Guard anti-duplication V2 : utilise `action_id` pour distinguer les missions (V1 garde l'ancien comportement)

### 🐛 Bugs fixés
- **Mission pas créée (silencieux)** : `maybeSingle()` dans le guard anti-doublon renvoyait une erreur quand plusieurs missions legacy (action_id=null) matchaient → ajout handling erreur `maybeSingle()` + fallback V2
- **Double-clic robot → panels dupliqués** : Pas de guard dedup sur les panels MESSAGE partenaire → ajout check `action_id` existant avant INSERT
- **Panel MESSAGE non lié à la mission** : Le chargement dans `PartnerMissionDetailPage` ne filtrait pas par `action_id` → ajout filtre `mission.action_id` pour liaison précise

### 🗄️ Migrations SQL
- `add_action_id_to_missions.sql` — `ALTER TABLE missions ADD COLUMN action_id TEXT DEFAULT NULL` ✅

### 🔜 Prochains sujets
- Retirer les `console.log` verbose de `executePartnerTaskAction` (debugging terminé)
- Tester le flow complet Partenaire+Message de bout en bout (admin exécute → partenaire valide → admin approuve → trigger V4 complète subStep)
- Partenaire + Signature (pas encore implémenté)

---

## 10 mars 2026 (session 6 — nuit)

### ✅ Features
- **🎉 FLOW COMPLET V4 VALIDÉ** : MESSAGE → FORMULAIRE → PARTENAIRE fonctionne de bout en bout !
  - Admin clique robot pour CHAQUE action (plus de chaînage automatique)
  - Trigger V4 fait uniquement subSteps MAJ + complétion d'étape
  - Testé sur "Construction Tiers Invest" : Inscription (2 actions) ✅, Collecte de données (2 actions) ✅, Offre client (1 action) ✅, Appel d'Offre (1 action) ✅, Signature de la PDB → En cours ✅
- **Trigger V4 simplifié** : Trigger `fn_v2_action_chaining` ne lance JAMAIS d'action. Rôle : subSteps MAJ + complétion d'étape si dernière action. L'admin/IA clique toujours le robot.
- **3 guards frontend V2 finaux** :
  1. `sendNextAction` TENTATIVE 2 → return immédiat pour V2
  2. `handleApprove` → skip toute logique frontend pour V2
  3. `useWorkflowActionTrigger` → skip V2 panels

### 🐛 Bugs identifiés (1) → FIXÉ
- **Pas de notification quand partenaire soumet formulaire** : Fix : trigger `notify_admin_on_partner_form_submit` créé ET déployé (tgenabled=O) ✅

### 🗄️ Migrations SQL
- `fix_trigger_v4_simple.sql` — Trigger V4 déployé et actif ✅
- `add_trigger_notify_admin_on_partner_form_submit.sql` — Déployé et actif ✅

### ✅ Vérifications session 6 (suite)
- **SIGNATURE flow server-side confirmé** : `trigger_signature_completed_to_panel_approved` déployé (tgenabled=O). Chaîne : signature signed → panel approved → trigger V4 → subSteps + complétion. 100% server-side, fonctionne sans admin connecté.
- **knowledgeKey analysé** : Config UI prête (8 clés), sauvée en Supabase dans `workflow_module_templates.config_json`. MAIS aucun code ne consomme ces clés pour filtrer les données → placeholder pour l'IA.
- **allowedActions analysé** : Même chose, config stockée mais pas de consommateur. Sera activé quand l'IA sera branchée.
- **copilot-instructions.md mis à jour** : V4 flow, 3 guards, feature flags, persistence, action types, partner flow documentés
- **PROGRESS_LOG.md mis à jour** : Architecture section en haut + session 6

### 📁 Fichiers modifiés
| Fichier | Modification |
|---------|-------------|
| `src/components/admin/ProspectDetailsAdmin.jsx` | `sendNextAction` TENTATIVE 2 simplifié → return immédiat pour V2 (supprimé ~100 lignes dead code) |
| `fix_trigger_v4_simple.sql` | Trigger V4 complet (222 lignes) |
| `add_trigger_notify_admin_on_partner_form_submit.sql` | Nouveau trigger notification partenaire |

### 🧪 Tests validés
| Test | Résultat |
|------|----------|
| MESSAGE → admin Execute → client Valider → action suivante | ✅ |
| FORMULAIRE → client remplit → admin Valider → action suivante | ✅ |
| PARTENAIRE → partenaire soumet → admin Valider → action/étape suivante | ✅ |
| Multi-étapes complètes (Inscription → Collecte → Offre → Appel → Signature) | ✅ |
| Notification partenaire soumission | ❌ Manquante (trigger à déployer) |

### 🔜 Prochains sujets
- **Intégration IA** (priorité #1) : Brancher OpenAI API via Edge Function. La config est prête (knowledgeKey, documents, allowedActions, instructions dans les templates). L'IA lit la config et exécute.
- **WhatsApp comme canal principal** : Edge Function Twilio WhatsApp API. IA discute sur WhatsApp, envoie magic links pour les actions (formulaires, signature). `chat_messages` reste source de vérité.
- **allowedActions à étendre** : `create_appointment` (exposer addAppointment à l'IA), `send_whatsapp`, `send_sms`, `send_email`
- **knowledgeKey interactif** : Rendre les boutons toggle on/off (quand l'IA sera branchée)
- **Magic link via WhatsApp** : Même lien Supabase Auth OTP, transport WhatsApp au lieu d'email
- Tester SIGNATURE en multi-actions avec signing réel
- Tester un prospect complètement neuf de A à Z
- Nettoyer les fichiers SQL obsolètes (v1, v2, v3 du trigger)

---

## 9–10 mars 2026 (session 5 — nuit)

### ✅ Features
- **Multi-actions dans une même étape** : Le trigger DB `fn_v2_action_chaining` gère maintenant correctement 2+ actions dans une même étape (ex: FORM + MESSAGE dans "Inscription").
- **Création automatique des subSteps** : Le trigger crée les subSteps depuis le template V2 si elles n'existent pas en DB, puis les met à jour au fil du chaînage.
- **Test E2E propre réussi** : Piscine/decouverte avec 2 actions (FORM + MESSAGE) → les 2 terminées → passage automatique à "chiffrage". Aucune intervention SQL manuelle.

### 🐛 Bugs fixés (4 hotfixes)
- **`handleApprove` race condition** : Quand l'admin clique "Valider" un formulaire V2, le trigger DB modifie les steps AVANT que `handleApprove` ne les lise → le frontend faisait `completeStepAndProceed` sur la MAUVAISE étape. Fix : guard `isV2Panel` dans `handleApprove` → skip toute logique frontend pour V2.
- **`v_new_panel_id BIGINT`** : Le trigger DB crashait avec "invalid input syntax for type bigint" car `client_form_panels.id` est UUID, pas BIGINT. Fix : `v_new_panel_id UUID`.
- **Doublons `panel-msg-`** : `sendNextAction` TENTATIVE 2 créait un panel MESSAGE en doublon de celui créé par le trigger DB → le CAS 2 voyait des panels `pending` et ne complétait pas l'étape. Fix : guard `completedActionId?.startsWith('v2-')` → return immédiat avant TENTATIVE 2.
- **Build Vercel pas à jour** : Vercel servait un ancien JS → les guards frontend n'étaient pas actifs. Fix : empty commit pour forcer le rebuild.

### 🗄️ Migrations SQL exécutées
- `fix_trigger_create_substeps.sql` — Trigger `fn_v2_action_chaining` v3 : création subSteps depuis template + fix UUID type + chaînage complet + complétion d'étape

### 📁 Fichiers modifiés
| Fichier | Modification |
|---------|-------------|
| `src/components/admin/ProspectDetailsAdmin.jsx` | Guard `isV2Panel` dans `handleApprove` (skip subSteps/completeStepAndProceed). Guard `startsWith('v2-')` dans `sendNextAction` TENTATIVE 2 (skip chaînage frontend). |
| `src/hooks/useWorkflowActionTrigger.js` | Guard V2 déjà en place (session 4) |
| `fix_trigger_create_substeps.sql` | Trigger DB v3 avec création subSteps + fix UUID |

### 🧪 Tests validés
| Test | Résultat |
|------|----------|
| Multi-actions FORM+MESSAGE (Piscine/decouverte) | ✅ Les 2 actions terminées → passage auto à chiffrage |
| SubSteps créées automatiquement par trigger | ✅ "formulaire client" + "parler client" visibles |
| Pas de doublon panel-msg- | ✅ Guard sendNextAction TENTATIVE 2 actif |
| Passage d'étape automatique CAS 2 | ✅ decouverte→chiffrage propre |

### 🏗️ Architecture V2 — Flux complet (OBSOLÈTE après session 6)

> ⚠️ Cette architecture a été remplacée par le Trigger V4 en session 6.
> Voir session 6 pour le design final : admin clique robot pour CHAQUE action.

```
[OBSOLÈTE] Le trigger V3 créait les panels automatiquement.
[ACTUEL V4] Le trigger ne fait que subSteps MAJ + complétion d'étape.
```

### 🔜 Prochains sujets (résolu en session 6)
- ~~Question design : chaînage automatique vs. admin clique robot pour chaque action ?~~ → **Résolu : admin clique robot**

---

## 9 mars 2026 (session 4 — soirée)

### ✅ Features
- **Trigger DB 100% server-side** : Le trigger `fn_v2_action_chaining` gère TOUT le workflow V2 côté serveur : chaînage des actions, complétion d'étape, mise à jour des subSteps. Le frontend n'intervient plus du tout pour les panels V2.
- **Test end-to-end réussi** : FORM (decouverte) → approve → passage auto chiffrage → MESSAGE (chiffrage) → client Valider → passage auto connexion. Tout propre, pas de subSteps fantômes.

### 🐛 Bugs fixés (3 hotfixes)
- **Double complétion d'étape** : Le trigger DB ET le frontend `sendNextAction` faisaient la complétion d'étape → subSteps du module courant clonées sur l'étape suivante. Fix : supprimé la complétion d'étape frontend pour V2 (le trigger DB s'en charge).
- **subSteps marquées "Terminé" prématurément** : `useWorkflowActionTrigger` appelait encore `sendNextAction` pour les panels V2, qui exécutait l'action suivante ET marquait les subSteps completed avant que le client n'interagisse. Fix : ajout guard `action_id.startsWith('v2-')` → skip `sendNextAction`, le trigger DB gère tout.
- **Actions clonées sur étape non-configurée** : L'étape chiffrage recevait les subSteps de decouverte à cause du `sendNextAction` frontend qui créait les subSteps depuis `currentModuleConfig` (qui pointait sur le mauvais module après le switch d'étape par le trigger). Fix : même guard que ci-dessus.

### 📁 Fichiers modifiés
| Fichier | Modification |
|---------|-------------|
| `src/components/admin/ProspectDetailsAdmin.jsx` | Supprimé le bloc complétion d'étape frontend pour V2 (else dans sendNextAction). Remplacé par un simple return + log "complétion gérée par trigger DB". |
| `src/hooks/useWorkflowActionTrigger.js` | Ajout guard : si `action_id.startsWith('v2-')` → skip `sendNextAction`. Seuls les panels V1 déclenchent encore le chaînage frontend. |

### 🧪 Tests validés
| Test | Résultat |
|------|----------|
| FORM simple (1 action, decouverte) | ✅ Client remplit → admin approuve → étape Terminé |
| MESSAGE (1 action, chiffrage) | ✅ Admin lance robot → client Valider → étape Terminé |
| Passage d'étape auto (decouverte→chiffrage→connexion) | ✅ Trigger DB gère tout |
| Pas de subSteps fantômes sur étape suivante | ✅ connexion = "En cours" propre |
| Pas de double exécution frontend | ✅ Guard V2 dans useWorkflowActionTrigger |

### 🏗️ Architecture V2 — État actuel

```
Panel V2 approved
  ↓
Trigger DB fn_v2_action_chaining (SECURITY DEFINER)
  ├── CAS 1: Action suivante → crée panel + chat message + MAJ subSteps
  └── CAS 2: Dernière action → complète étape + active suivante

Frontend (useWorkflowActionTrigger)
  └── Panel V2 ? → SKIP (trigger DB gère)
  └── Panel V1 ? → sendNextAction (legacy)
```

### 🔜 Prochains sujets
- Tester multi-actions (FORM → MESSAGE dans la même étape) avec trigger DB
- Tester SIGNATURE en multi-actions
- Tester sans admin en ligne (l'IA envoie l'action puis "part")
- Nettoyer le code `sendNextAction` : le bloc de mise à jour subSteps (lignes 533-577) est maintenant dead code pour V2

---

## 9 mars 2026

### ✅ Features
- **Type d'action MESSAGE dans Workflow V2** : Nouveau type d'action permettant à l'admin/IA d'écrire dans le chat puis d'envoyer des boutons de validation au client. Le client clique "Valider" ou "Besoin d'infos" directement dans le chat. Validation → chaînage automatique vers l'action/étape suivante.

### 🐛 Bugs fixés (5 hotfixes en session)
- **`form_id NOT NULL`** : La colonne `form_id` de `client_form_panels` avait une contrainte NOT NULL → `ALTER COLUMN form_id DROP NOT NULL` pour accepter MESSAGE (pas de formulaire)
- **`organization_id` manquant** : Le panel MESSAGE était créé sans `organization_id` → RLS multi-tenant bloquait silencieusement l'UPDATE du client
- **Chaînage V2 inactif** : `useWorkflowActionTrigger` exigeait un prompt V1 → ajout `hasV2Actions` comme alternative + fallback V2 dans `sendNextAction`
- **Guard `> 1` au lieu de `>= 1`** : Avec 1 seule action dans l'étape, le bloc V2 n'était jamais atteint
- **`completeStepAndProceed` sans steps** : Le 4ème paramètre `currentSteps` est requis → fetch des steps depuis Supabase avant appel

### 🗄️ Migrations SQL exécutées
- `add_action_type_column_client_form_panels.sql` — `ALTER TABLE client_form_panels ADD COLUMN action_type TEXT DEFAULT 'form'`
- `make_form_id_nullable_client_form_panels.sql` — `ALTER COLUMN form_id DROP NOT NULL`

### 📁 Fichiers modifiés (10 fichiers)
| Fichier | Modification |
|---------|-------------|
| `src/lib/catalogueV2.js` | MESSAGE dans ACTION_TYPES |
| `src/lib/moduleAIConfig.js` | `button_click` trigger, exemptions MESSAGE |
| `src/components/admin/workflow-v2/ModuleConfigTab.jsx` | UI config MESSAGE, auto-force button_click |
| `src/lib/actionOrderV2.js` | `buttonLabels` dans build/validate/format |
| `src/lib/executeActionOrderV2.js` | `executeMessageAction()` + organization_id |
| `src/components/admin/workflow-v2/WorkflowV2RobotPanel.jsx` | Icône, labels, preview objectif/instructions/boutons |
| `src/components/admin/workflow-v2/ActionOrderSimulator.jsx` | Icône teal, preview boutons |
| `src/components/ProjectDetails.jsx` | Boutons Valider/Besoin d'infos côté client |
| `src/hooks/useWorkflowActionTrigger.js` | Support `hasV2Actions` sans prompt V1 |
| `src/components/admin/ProspectDetailsAdmin.jsx` | `sendNextAction` avec fallback V2 + complétion étape |

### 🔜 Prochains sujets
- Tester SIGNATURE en multi-actions (FORM + SIGNATURE dans une même étape) — nécessite création d'un panel pour SIGNATURE + mise à jour panel→approved quand signed

---

## 9 mars 2026 (session 2 — après-midi)

### ✅ Features
- **Multi-actions MESSAGE + FORM fonctionne de bout en bout** : Testé avec 3 actions (MESSAGE → FORM A → FORM B). Chaînage séquentiel, sous-étapes, et passage d'étape automatique.

### 🐛 Bugs fixés (4 hotfixes)
- **`shouldCompleteStep` bloqué par `button_click`** : En multi-actions, le `completionTrigger` module-level (`button_click` pour MESSAGE) empêchait le passage d'étape même quand toutes les actions étaient approved. Fix : en multi-actions, seul critère = `allActionsCompleted`.
- **SubSteps non mises à jour en temps réel** : `sendNextAction` ne mettait pas à jour les sous-étapes (elles n'existaient pas en Supabase, générées uniquement côté UI). Fix : `sendNextAction` crée les subSteps depuis le template V2 si absentes, puis met à jour les statuts (completed → in_progress).
- **`updateSupabaseSteps is not defined`** : Variable du composant parent utilisée dans `ProspectForms` (sous-composant). Fix : remplacé par appel Supabase direct.
- **Compteur "Formulaires soumis" comptait les MESSAGE** : Ajout de `actionType` dans la transformation du hook `useSupabaseClientFormPanels` + filtre `panel.actionType !== 'message'`.

### 📁 Fichiers modifiés
| Fichier | Modification |
|---------|-------------|
| `src/components/admin/ProspectDetailsAdmin.jsx` | `shouldCompleteStep` multi-actions, subSteps dans `sendNextAction` avec création si absentes, appel Supabase direct dans handleApprove |
| `src/hooks/useSupabaseClientFormPanels.js` | Ajout `actionType` et `actionId` dans `transformFromDB` |

### 🔜 Prochains sujets
- Tester SIGNATURE en multi-actions

---

## 9 mars 2026 (session 3 — fin d'après-midi)

### ✅ Features
- **SIGNATURE compatible multi-actions** : `executeSignatureAction` crée maintenant un `client_form_panels` avec `action_type: 'signature'` et `action_id`. Le listener `signature_procedures` met le panel à `approved` quand la signature est signée → le chaînage standard (`useWorkflowActionTrigger` → `sendNextAction`) prend le relais.
- **Listener signature V1/V2** : Si `signature_metadata.panelDbId` existe → met le panel à approved (V2 multi-actions). Sinon → fallback V1 (direct `completeStepAndProceed`).

### 📁 Fichiers modifiés
| Fichier | Modification |
|---------|-------------|
| `src/lib/executeActionOrderV2.js` | Panel `action_type: 'signature'` créé dans `executeSignatureAction` + `signature_metadata` mis à jour avec `actionId`/`panelDbId` |
| `src/components/admin/ProspectDetailsAdmin.jsx` | Listener signature : stratégie 1 (panel V2 → approved → chaînage) + stratégie 2 (fallback V1) |

### ✅ Vérification PARTENAIRE
- `action_id` déjà transmis dans les panels partenaire+FORM (ligne 277 de `executeActionOrderV2.js`)
- Cas edge : mission partenaire SANS formulaire → pas de panel → à traiter si besoin futur

### 📋 TODO FUTUR : Type PAIEMENT

> **Quand Stripe (ou autre) sera intégré, voici le plan d'implémentation :**

**Principe** : Même pattern universel que tous les autres types → `client_form_panels` + `action_id` + `approved` = chaînage.

**Fichiers à modifier :**
| Fichier | Quoi faire |
|---------|-----------|
| `src/lib/catalogueV2.js` | PAYMENT existe déjà (`isMock: true`). Retirer le flag `isMock` |
| `src/lib/moduleAIConfig.js` | Ajouter `completionTrigger: 'payment_confirmed'`, exemptions validation (pas de formIds/templateIds) |
| `src/components/admin/workflow-v2/ModuleConfigTab.jsx` | UI config PAIEMENT (montant, devise, description) + cacher modes inutiles |
| `src/lib/actionOrderV2.js` | Ajouter PAYMENT dans `validate` + `formatActionOrderForDisplay` |
| `src/lib/executeActionOrderV2.js` | `executePaymentAction()` : créer panel `action_type: 'payment'` + créer session Stripe/lien de paiement + envoyer lien dans le chat |
| `src/components/ProjectDetails.jsx` | Afficher bouton "Payer" côté client (si on veut) |
| Webhook Stripe (Edge Function) | Quand paiement confirmé → UPDATE panel `status: 'approved'` → chaînage standard |

**Flow complet :**
```
1. executePaymentAction → crée panel (action_type='payment', action_id, status='pending')
2. Crée session Stripe → envoie lien paiement dans le chat
3. Client paie → Stripe webhook → Edge Function
4. Edge Function → UPDATE client_form_panels SET status='approved' WHERE id=panelDbId
5. useWorkflowActionTrigger détecte → sendNextAction → action suivante ou passage étape
```

### 🔜 Prochains sujets
- Tester SIGNATURE en multi-actions (ex: MESSAGE → FORM → SIGNATURE)
- Implémenter PAIEMENT quand Stripe sera prêt (voir plan ci-dessus)
- Mission partenaire sans formulaire en multi-actions (edge case)

> **À lire avant de créer un nouveau type d'action ou de modifier le workflow.**

### Concepts clés

```
ÉTAPE (step)           = Phase du projet (Inscription, Collecte, Offre...)
  └── ACTION (action)  = Tâche dans l'étape (Formulaire, Signature, Message...)
       └── SOUS-ÉTAPE (subStep) = Visualisation admin de la progression d'une action
```

- Chaque étape peut avoir **1 ou N actions** configurées dans Workflow V2
- Les actions s'exécutent **séquentiellement** (une seule active à la fois)
- Le passage action → action suivante = **chaînage**
- Le passage étape → étape suivante = **complétion d'étape**

### Cycle de vie d'une action

```
1. Admin exécute l'action (via WorkflowV2RobotPanel)
   → executeActionOrderV2.js → crée un client_form_panel + chat_messages
   → panel.status = 'pending', panel.action_id = 'v2-{moduleId}-action-{index}'

2. Client interagit (remplit formulaire / clique Valider / signe)
   → panel.status = 'submitted' ou 'approved'

3. Si vérification humaine : Admin approuve
   → handleApprove dans ProspectDetailsAdmin → panel.status = 'approved'
   
4. Si clic bouton (MESSAGE) : Client approuve directement
   → handleActionValidate dans ProjectDetails.jsx → panel.status = 'approved'
```

### Mécanisme de chaînage (action → action suivante)

**Fichier clé : `useWorkflowActionTrigger.js`**

```
Real-time listener sur client_form_panels UPDATE
  ↓
Panel passe à 'approved' + a un action_id ?
  ↓ OUI
sendNextAction(completedActionId) dans ProspectDetailsAdmin.jsx
  ↓
Cherche l'action suivante :
  - D'abord dans prompt V1 (stepsConfig.actions) — legacy
  - Sinon dans template V2 (currentModuleConfig.actions) — actuel
  ↓
Si action suivante existe → buildActionOrder + executeActionOrder (chaînage)
Si c'est la dernière action → completeStepAndProceed (passage étape suivante)
```

### Mécanisme de complétion d'étape

**Fichier clé : `completeStepAndProceed` dans `App.jsx`**

```
Signature : completeStepAndProceed(prospectId, projectType, currentStepIndex, currentSteps)
                                                                              ↑ REQUIS !
  ↓
1. Si subSteps → marque la subStep active comme 'completed'
   - Si subStep suivante existe → l'active → NE passe PAS à l'étape suivante
   - Si toutes complétées → passe à l'étape suivante

2. Marque l'étape courante comme 'completed'
3. Active l'étape suivante ('in_progress')
4. Sauvegarde dans project_steps_status (Supabase)
```

### ⚠️ Points critiques pour un nouveau type d'action

| Élément | Obligatoire | Pourquoi |
|---------|-------------|----------|
| `organization_id` dans le panel | ✅ | RLS multi-tenant bloque le client sinon |
| `action_id` dans le panel | ✅ | Nécessaire pour le chaînage (`useWorkflowActionTrigger` vérifie `hasActionId`) |
| `action_type` dans le panel | ✅ | Distinguer form/signature/message |
| `form_id` dans le panel | ❌ nullable | MESSAGE n'a pas de formulaire |
| `completionTrigger` dans moduleAIConfig | ✅ | `form_approved`, `signature_completed`, `button_click` |
| Cas dans `executeActionOrderV2.js` switch | ✅ | Route vers la bonne fonction d'exécution |
| Whitelist dans `canExecuteActionOrder` | ✅ | Sinon l'exécution est bloquée |
| `sendNextAction` fallback V2 | ✅ | Chaînage fonctionne sans prompt V1 |
| `completeStepAndProceed` avec steps | ✅ | Fetch depuis `project_steps_status` avant appel |

### Fichiers impliqués dans le chaînage (ordre d'exécution)

```
1. executeActionOrderV2.js      → Crée le panel + chat (exécution initiale)
2. ProjectDetails.jsx           → Client interagit (boutons, formulaire)
   OU ProspectDetailsAdmin.jsx  → Admin approuve (handleApprove)
3. useWorkflowActionTrigger.js  → Real-time: détecte panel approved
4. ProspectDetailsAdmin.jsx     → sendNextAction() : chaîne ou complète
5. App.jsx                      → completeStepAndProceed() : passe à l'étape suivante
```

---

## 4 mars 2026 (session 2)

### ✅ Features
- **Webhook externe par organisation** : Après création d'un prospect via `webhook-v1`, si l'org a un `external_webhook_url` configuré dans `integration_keys`, un appel POST fire-and-forget est envoyé automatiquement avec les infos du prospect (`event: prospect.created`, `prospect_id`, `owner_id`, `nom`, `email`, `telephone`, `type_projet`, `tags`, `organization_id`, `magic_link_sent`, `created_at`). Ne bloque jamais la réponse 201.
- **Deploy Edge Function** : `webhook-v1` déployé en prod avec `--no-verify-jwt` (Bearer custom, pas JWT Supabase). Config `supabase/config.toml` ajouté.

### 🧪 Tests validés
| Test | Résultat |
|------|----------|
| Créer prospect via curl (Rosca Finance) | ✅ 201 — prospect créé |
| Webhook externe → webhook.site | ✅ POST reçu avec payload complet |
| **Flow complet EVATIME → Hangar 3D** | ✅ Prospect créé sur EVATIME → créé auto sur Hangar 3D → config bâtiment → URL envoyée au client dans le chat → client choisit offre → projet créé dans EVATIME |

### 🗄️ Migrations SQL exécutées
- `add_external_webhook_url_to_integration_keys.sql` — `ALTER TABLE integration_keys ADD COLUMN external_webhook_url TEXT DEFAULT NULL`

### 🔜 Prochains sujets
- Déployer webhook-v1 (`supabase functions deploy webhook-v1`)
- Tester avec webhook.site ou un endpoint réel
- Ajouter UI dans IntegrationsPage pour configurer l'URL webhook externe
- Reprendre config module Make (auth header issue)

---

## 4 mars 2026

### ✅ Features
- **validate_only mode** : `webhook-v1` supporte `{ "validate_only": true }` pour tester une connexion Make/Zapier sans créer de prospect. Retourne `200 { success: true, status: "valid" }` si la clé est bonne.
- **App EVATIME sur Make.com** : App custom configurée sur Make Developer Platform (v1.0.0, published). Module "Create Prospect" fonctionnel end-to-end. Connection Communication pointe sur `webhook-v1` avec `validate_only`.
- **Onglet Make 2 méthodes** : Refonte UX de l'onglet Make dans IntegrationsPage — sélecteur "App EVATIME" (recommandé, 3 étapes) + "Module HTTP" (avancé, 6 étapes). Boutons copie inversés (gros = clé brute pour app, petit = avec Bearer pour HTTP).
- **Action `add_project` dans webhook-v1** : Nouvelle action pour ajouter un projet à un prospect existant via webhook. Body : `{ "action": "add_project", "prospect_id": "UUID", "type_projet": "slug" }`. Ajoute le tag, initialise `project_steps_status` avec les étapes du template (1ère = `in_progress`, reste = `pending`).
- **RPC `add_project_to_prospect`** : Nouvelle fonction SQL SECURITY DEFINER. Vérifie prospect ∈ org, template existe, pas de doublon projet. Retourne `success + prospect_name + steps_count`.
- **Onglet Développeur — Section Add Project** : Documentation complète dans l'onglet Développeur d'IntegrationsPage : contrat JSON, réponse succès 201, exemples curl + fetch, table codes erreurs (MISSING_FIELDS, INVALID_PROSPECT, INVALID_PROJECT_TYPE, DUPLICATE_PROJECT).
- **Module Make "Add Project" (doc)** : Documentation `MAKE_ADD_PROJECT_MODULE.md` pour configurer le 2ème module sur Make Developer Platform (champs `prospect_id` + `type_projet`, Communication JSON, Output interface, tests).
- **Module Add Project dans onglet Make** : Section "Module 2 : Add Project" ajoutée dans la méthode App EVATIME de l'onglet Make, avec instructions et cas d'usage.
- **Diagnostic types Rosca Finance** : Les types `piscine-copie-*` n'existent plus — les 4 types actuels sont déjà propres : `baby`, `fenetre`, `piscine`, `solaire`. Aucun renommage nécessaire.

### 🐛 Bugs fixés
- **Fix `organization_id` manquant** : L'INSERT dans `project_steps_status` de la RPC `add_project_to_prospect` ne passait pas `organization_id` → violation NOT NULL. Corrigé.

### 🗄️ Migrations SQL exécutées
- `add_project_to_prospect.sql` — Nouvelle RPC (CREATE OR REPLACE + GRANT service_role)

### 📄 Fichiers créés
- `MAKE_ADD_PROJECT_MODULE.md` — Documentation 2ème module Make "Add Project"

### 🧪 Tests validés
| Test | Résultat |
|------|----------|
| `validate_only: true` | ✅ 200 — clé valide |
| Créer prospect via Make app EVATIME | ✅ 201 — prospect créé chez Rosca Finance |
| `add_project` fenetre → prospect josh | ✅ 201 — 8 steps initialisées |
| Mauvaise clé | ✅ 401 INVALID_KEY |
| Type projet inexistant | ✅ 400 INVALID_PROJECT_TYPE |
| Diagnostic types Rosca | ✅ 4 types propres (baby, fenetre, piscine, solaire) — aucun piscine-copie-* |

### 🔜 Prochains sujets
- **Configurer le module "Add Project"** sur Make Developer Platform (suivre `MAKE_ADD_PROJECT_MODULE.md`)
- **Action 9** : Tests E2E complets + documentation finale module Intégrations

---

## 2 mars 2026

### ✅ Features
- **Integrations module — Action 1** : Scaffold + docs + navigation + page placeholder `/admin/integrations`
- **Integrations module — Action 2** : Onglet "Sans code" fonctionnel — liens globaux + liens par projet avec `CopyButton` réutilisable
- **Correction Action 2** : Liens passés en org-level pur — suppression `affiliate_slug` / `useUsers` / `useAppContext`, liens basés sur `window.location.origin` uniquement
- **Integrations module — Action 3** : Pré-sélection projet sur `/inscription` via query param `?project={slug}` — validation org-scoped, param invalide ignoré
- **Correction liens** : Ajout liens landing page + partenaire, correction routes (client → `/client-access`, pro → `/login`) alignées sur `App.jsx`
- **Integrations module — Action 4** : Onglet "Make" finalisé — endpoint webhook, headers Bearer, contrat JSON officiel, règles d'attribution (owner_user_id → owner_email → fallback Global Admin), sécurité & mapping, CopyButton partout
- **Action 5.5 — Audit technique** : Analyse complète du flux webhook universel (multi-tenant, création contact/projet, attribution owner, magic link, project templates, risques). Fichier `AUDIT_WEBHOOK_UNIVERSEL.md`.
- **Action 6.1 — 🔒 Security fix** : Suppression UUID hardcodé Jack Luc dans `create_affiliated_prospect`. Fallback remplacé par lookup dynamique `Global Admin` par `organization_id` + exception si absent. Fonction 100% multi-tenant.
- **Action 6.2 — 🔒 Security fix** : `link_prospect_to_auth_user` corrigé multi-tenant. UPDATE limité au prospect le plus récent (`ORDER BY created_at DESC LIMIT 1`) au lieu de tous les prospects avec le même email. Fichier SQL dédié créé.
- **Action 6 — 🚀 Edge Function webhook-v1** : Table `integration_keys` (SHA-256, RLS, permissions), RPC `create_webhook_prospect` (SECURITY DEFINER, validation complète), Edge Function Deno (auth Bearer → org_id, contrat JSON, magic link optionnel, codes HTTP clairs).
- **Action 6 correctif — 🔒 Hardening prod** : `key_hash` UNIQUE, supprimé `updated_at`, pipeline step strict (erreur `NO_PIPELINE_STEP` au lieu de fallback fictif).
- **Correctif alignement webhook-v1** : Magic link revenu à `signInWithOtp` (aligné RegistrationPage.jsx), supprimé `auth.admin.generateLink`. Vérifié SELECT `integration_keys` = 6 colonnes alignées schéma réel.

### 📦 Module Integrations — Checklist Actions
- [x] **Action 1** — Scaffold + docs + navigation + page placeholder
- [x] **Action 2** — Onglet "Sans code" : liens publics, liens par projet, CopyButton
- [x] **Action 3** — Pré-sélection projet via query param `?project=` sur `/inscription`
- [x] **Action 4** — Onglet "Make" : contrat officiel webhook, règles d'attribution, sécurité & mapping
- [x] **Action 5** — Onglet "Développeur" : API keys, Edge Functions (webhook-v1, generate-integration-key)
- [x] **Action 6** — Persistance Supabase : table `integration_keys`, RPC `create_webhook_prospect`
- [x] **Action 7** — App EVATIME sur Make.com : module Create Prospect, validate_only, 2 méthodes UX
- [x] **Action 8** — Action `add_project` : RPC `add_project_to_prospect` + routage webhook-v1
- [ ] **Action 9** — Tests E2E complets + documentation finale

### 🔜 Prochains sujets
- Action 5 Integrations : onglet "Développeur"

---

## 22 février 2026

### ✅ Features
- **Auto-reload chunk obsolète** : `ModuleBoundary.jsx` + `ErrorBoundary.jsx` détectent les erreurs "dynamically imported module" / "Failed to fetch" / "Loading chunk" et rechargent automatiquement la page (sessionStorage anti-boucle 10s). Plus de crash screen après un deploy.

### 🐛 Bugs fixés
- **Crash Charly AI "Failed to fetch dynamically imported module"** : Après deploy, les anciens hashes de chunks n'existent plus → auto-reload transparent au lieu d'écran d'erreur

---

## 21 février 2026

### ✅ Features
- **Isolation chat multi-partenaire** : Colonne `partner_id` sur `chat_messages` + RLS + filtrage dans tous les hooks/pages
- **Dropdown partenaire admin** : Sélecteur orange dans `ProspectDetailsAdmin` fusionnant missions + templates V2
- **Chat partenaire après mission terminée** : Supprimé le filtre `.in('status', ['pending', 'in_progress'])` dans `PartnerCharlyPage` et `usePartnerUnreadCount`
- **Recherche + filtre récent Charly partenaire** : Barre de recherche, filtre "récent/tous", aperçu dernier message, timestamp relatif, highlight bleu unread
- **Tri chronologique Charly** : Sort pur par `lastMessageAt` (style WhatsApp), fix colonne `text` au lieu de `content`
- **Project type sur contacts partenaire** : Préfixe bleu `project_type` sur missions dans `PartnerContactsPage`
- **Commentaire partenaire sur formulaire** : Injection `__partner_comment__` dans `form_data`, affichage orange côté admin, persistence + prefill côté partenaire
- **Nettoyage fichier au remplacement (partenaire)** : Même pattern que client — fetch frais DB + suppression ancien fichier Storage + `project_files` avant upload nouveau

### 🐛 Bugs fixés
- **React Error #31** : Objets `File` rendus comme enfants React → safeguard `typeof value === 'object'` dans admin + partenaire
- **Sort cassé Charly** : Query utilisait `content` (inexistant) au lieu de `text` → `lastMsg` toujours null
- **Fichier orphelin après rejet** : Partenaire n'avait pas de policy RLS DELETE sur `project_files` + `storage.objects`

### 🗄️ Migrations SQL exécutées
- `add_partner_id_to_chat_messages.sql` — Colonne + RLS SELECT/INSERT/UPDATE
- `add_partner_delete_project_files_policy.sql` — RLS DELETE pour partenaires sur `project_files` + `storage.objects`

### 🔜 Prochains sujets potentiels
- Tester signature V2
- Génération PDF depuis `form_data`
- Notifications : tâches vérification humaine
- Nettoyage progressif localStorage → Supabase

---

## 19 février 2026

### ✅ Features
- **Formulaires partenaire** : Création mission → `form_ids` → partenaire voit/remplit formulaire → admin approuve/refuse
- **Validation/Refus admin** : Boutons Approuver/Refuser + raison de refus pour partenaire
- **`filled_by_role`** : Distinction client/partner sur `client_form_panels`

### 🗄️ Migrations SQL
- `add_form_ids_to_missions.sql`
- `add_filled_by_role_to_client_form_panels.sql`
- `add_rejection_reason_to_client_form_panels.sql`
- `add_partner_update_policy_client_form_panels.sql`
- `add_partner_project_files_policies.sql` (INSERT + SELECT)

---

## Janvier 2026

### ✅ Features
- **Workflow V2 Cockpit** : Config IA par module, catalogue V2, simulateur ActionOrder
- **Exécution V2→V1** : Bridge avec feature flags
- **Persistance Supabase** : Table `workflow_module_templates`
- **Signature V2** : Compatible schéma existant
- **Vérification humaine** : `verification_mode` sur `client_form_panels`

---

## ⚠️ Notes pour la prochaine session

- Le fichier `PROJECT_GUIDE.md` décrit la **philosophie** (pipeline calculé, workflows, IA encadrée)
- Le fichier `.github/copilot-instructions.md` décrit l'**architecture technique** (hooks, Supabase, dual-user)
- **CE FICHIER** (`PROGRESS_LOG.md`) décrit **où on en est** — à lire en premier pour comprendre le contexte récent
