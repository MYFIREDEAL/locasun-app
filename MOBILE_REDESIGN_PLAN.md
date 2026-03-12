# 📱 Plan de Redesign Mobile Client

> Date de création : 12 mars 2026
> Statut : PLANIFIÉ

---

## 🎯 Objectif
Transformer l'espace client mobile en une expérience app-native avec 3 onglets bottom nav, un chat centralisé et des formulaires plein écran.

## ⚠️ RÈGLE : Desktop ne change PAS
Tout le redesign est **conditionné par `isMobile`**. Le desktop garde ses 3 colonnes (progression + chat + formulaires).

## 🔒 NE PAS TOUCHER — Logique métier protégée

> **AUCUNE modification** sur ces fichiers/systèmes. Le redesign est UNIQUEMENT visuel/routing côté client mobile.

| Fichier / Système | Raison |
|-------------------|--------|
| `src/lib/executeActionOrderV2.js` | Moteur d'exécution V2 — envoi FORM, MESSAGE, SIGNATURE, PARTENAIRE |
| `src/hooks/useWorkflowActionTrigger.js` | Real-time listener panels + guard V2 (skip sendNextAction) |
| `src/hooks/useWorkflowExecutor.js` | Exécution actions V1/V2 |
| `src/hooks/useSupabaseChatMessages.js` | Hook chat + pagination — on utilise tel quel |
| `src/hooks/useSupabaseClientFormPanels.js` | Hook panels formulaires — on utilise tel quel |
| `src/components/admin/ProspectDetailsAdmin.jsx` | Page admin — rien à voir avec le client |
| `src/lib/workflowV2Config.js` | Feature flags V2 |
| Trigger DB `fn_v2_action_chaining` | Chaînage actions → subSteps → complétion étapes |
| Trigger DB `notify_client_on_admin_message` | Notifications client |
| Trigger DB `notify_admin_on_partner_form_submit` | Notifications admin partenaire |
| Les 3 guards frontend V1/V2 | Protection contre interférence V1 sur panels V2 |

### Ce qu'on RÉUTILISE sans modifier la logique :
- `ClientFormPanel.jsx` → même logique de rendu/soumission, juste wrappé dans une modal sur mobile
- `ProjectDetails.jsx` → on conditionne l'affichage (`isDesktop` vs `isMobile`), on ne touche pas au chat ni aux formulaires
- `ProjectCard.jsx` → on ajoute un bouton conditionnel mobile, le comportement desktop reste identique
- Les hooks `usePresenceCheck`, `useReminderReset`, `useFormReminderWatcher` → inchangés

---

## 📋 PLAN D'ACTION

### Phase 1 — Bottom Nav Mobile
**Fichiers impactés :** `ClientLayout.jsx`, nouveau composant `MobileBottomNav.jsx`

- [ ] **1.1** Créer `src/components/client/MobileBottomNav.jsx`
  - 3 onglets : Home 🏠 | Chat 💬 | Profil 👤
  - Pastille rouge sur Chat si messages non lus / action requise
  - Fixé en bas de l'écran (`fixed bottom-0`)
  - Affiché uniquement sur mobile (`md:hidden`)

- [ ] **1.2** Modifier `ClientLayout.jsx`
  - Masquer la navbar du haut sur mobile (garder uniquement le logo en mini header)
  - Ajouter `<MobileBottomNav />` dans le layout
  - Ajouter `padding-bottom` au contenu pour ne pas cacher derrière la bottom nav

- [ ] **1.3** Routing mobile
  - Home → `/dashboard` (liste projets)
  - Chat → `/dashboard/chat` (liste conversations)
  - Profil → `/dashboard/profil` (profil + parrainage)

### Phase 2 — Carte Projet Mobile (Home)
**Fichiers impactés :** `ProjectCard.jsx`, `Dashboard.jsx`

- [ ] **2.1** Modifier `ProjectCard.jsx` pour mobile
  - Garder : icône + nom projet + progression % + étape actuelle
  - Ajouter : pastille **"Action requise"** si panel `pending` (form ou message) côté client
  - Clic sur la carte → **Vue Timeline** (progression + liste étapes)
  - Desktop : pas de changement (bouton "Continuer le projet 🚀" reste)

### Phase 3 — Liste Conversations (Chat)
**Fichiers impactés :** nouveau composant `ChatConversationsList.jsx`

- [ ] **3.1** Créer `src/components/client/ChatConversationsList.jsx`
  - Liste des projets du client comme conversations (style WhatsApp)
  - Chaque ligne : icône projet + nom + dernier message + timestamp
  - Pastille si message non lu ou action requise
  - Clic → ouvre le chat du projet

- [ ] **3.2** Créer la route `/dashboard/chat`
  - Affiche `ChatConversationsList` par défaut
  - `/dashboard/chat/:projectType` → chat d'un projet spécifique

- [ ] **3.3** Pastille sur l'onglet Chat (bottom nav)
  - Compteur total de messages non lus / actions requises tous projets confondus
  - Utilise les données déjà dispo dans `clientNotifications`

### Phase 4 — Vue Chat Mobile (dans un projet)
**Fichiers impactés :** `ProjectDetails.jsx`, `ChatInterface` (dans ProjectDetails)

- [ ] **4.1** Vue Chat mobile quand on arrive depuis Chat
  - Header : emoji + nom étape + badge "En cours" (déjà existant)
  - Flèche retour ← → retour liste conversations
  - Chat Charly (messages existants)
  - Input "Écrire à votre conseiller..."

- [ ] **4.2** Bouton "📋 Remplir le formulaire" dans le chat (MOBILE UNIQUEMENT)
  - Détecter les messages liés à une action FORM (via metadata)
  - Afficher un bouton stylé sous le message
  - Clic → ouvre le formulaire en plein écran

- [ ] **4.3** Boutons MESSAGE dans le chat
  - "Valider" / "Besoin d'infos" → déjà existants, pas de changement

### Phase 5 — Formulaire Plein Écran Mobile
**Fichiers impactés :** nouveau composant `MobileFormModal.jsx`, `ClientFormPanel.jsx`

- [ ] **5.1** Créer `src/components/client/MobileFormModal.jsx`
  - Modal/overlay plein écran sur mobile
  - Header : nom du formulaire + bouton fermer ✕
  - Contenu : réutilise le rendu de `ClientFormPanel` (champs + bouton Envoyer)
  - Bouton "Valider mes infos" en bas (sticky)
  - Après soumission → retour au chat

- [ ] **5.2** Intégrer dans le chat
  - State `openFormPanelId` dans la vue chat
  - Bouton "Remplir le formulaire" → `setOpenFormPanelId(panelId)`
  - `<MobileFormModal>` s'ouvre par-dessus

### Phase 6 — Vue Timeline Mobile (depuis Home)
**Fichiers impactés :** `ProjectDetails.jsx`

- [ ] **6.1** Vue Timeline mobile quand on arrive depuis Home (clic carte projet)
  - Header : emoji + nom projet + flèche retour
  - Barre progression + %
  - Liste complète des étapes avec statuts (Terminé ✅ / En cours 🔄 / À venir)
  - Pas de chat, pas de formulaires

### Phase 7 — Nettoyage Mobile
**Fichiers impactés :** `ProjectDetails.jsx`, `ClientFormPanel.jsx`

- [ ] **7.1** Masquer `ClientFormPanel` empilé en bas sur mobile
  - Le formulaire est accessible uniquement via le bouton dans le chat
  - `{isDesktop && <ClientFormPanel ... />}` (déjà fait pour desktop, retirer le rendu mobile)

- [ ] **7.2** Masquer la navbar du haut sur mobile
  - Le logo reste en mini header
  - Les onglets "Tableau de bord / Offres / Parrainage" disparaissent (remplacés par bottom nav)

- [ ] **7.3** Cloche notifications
  - Desktop : reste dans la navbar (comme maintenant)
  - Mobile : supprimée (remplacée par pastille sur onglet Chat)

---

## 🔗 Dépendances
- Aucune migration SQL nécessaire
- Aucun changement backend/Supabase
- Tout est frontend (composants + routing + CSS conditionnel)

## 📐 Breakpoint
- **Mobile** : `< 768px` (cohérent avec `useWindowSize` et `md:` Tailwind)
- **Desktop** : `>= 768px`

## ⚡ Ordre d'implémentation + Points d'arrêt TEST

### 🔨 Étape 1 — Phase 1 + 7 (Bottom Nav + Nettoyage)
1. Phase 1 (Bottom Nav) — fondation
2. Phase 7 (Nettoyage) — masquer navbar mobile, retirer formulaires empilés

#### 🧪 POINT D'ARRÊT — Déployer & Tester
- [ ] ✅ Desktop : RIEN n'a changé (3 colonnes, navbar, formulaires, chat) 
- [ ] ✅ Mobile : bottom nav visible (Home / Chat / Profil)
- [ ] ✅ Mobile : navbar du haut masquée (logo seul reste)
- [ ] ✅ Mobile : formulaires plus empilés en bas
- [ ] ✅ Envoyer un formulaire V2 depuis admin → vérifier que ça fonctionne toujours côté admin
- [ ] ✅ Valider un formulaire côté admin → vérifier trigger + chaînage OK

---

### 🔨 Étape 2 — Phase 6 + 2 (Timeline + Carte Projet)
3. Phase 6 (Timeline mobile) — vue quand on clique sur un projet
4. Phase 2 (Carte Projet mobile) — pastille "Action requise"

#### 🧪 POINT D'ARRÊT — Déployer & Tester
- [ ] ✅ Desktop : carte projet inchangée (bouton "Continuer le projet 🚀")
- [ ] ✅ Mobile : clic carte projet → vue Timeline (progression + étapes)
- [ ] ✅ Mobile : pastille "Action requise" visible si panel pending
- [ ] ✅ Mobile : flèche retour ← → retour Home
- [ ] ✅ Envoyer un MESSAGE V2 → vérifier pastille apparaît côté client

---

### 🔨 Étape 3 — Phase 3 + 4 (Liste Conversations + Chat Mobile)
5. Phase 3 (Liste Conversations) — nouveau composant
6. Phase 4 (Chat Mobile) — bouton "Remplir le formulaire" dans le chat

#### 🧪 POINT D'ARRÊT — Déployer & Tester
- [ ] ✅ Desktop : chat inchangé
- [ ] ✅ Mobile : onglet Chat → liste conversations (projets)
- [ ] ✅ Mobile : clic conversation → chat du projet
- [ ] ✅ Mobile : pastille messages non lus sur conversations
- [ ] ✅ Mobile : bouton "Remplir le formulaire" visible dans le chat si FORM pending
- [ ] ✅ Envoyer un formulaire V2 → message apparaît dans chat + bouton visible
- [ ] ✅ Client écrit un message → admin le reçoit (vérifier real-time)

---

### 🔨 Étape 4 — Phase 5 (Formulaire Plein Écran)
7. Phase 5 (Formulaire Plein Écran) — le plus impactant UX

#### 🧪 POINT D'ARRÊT FINAL — Déployer & Tester
- [ ] ✅ Desktop : formulaires inchangés (colonne droite)
- [ ] ✅ Mobile : bouton dans chat → formulaire plein écran
- [ ] ✅ Mobile : remplir formulaire → soumettre → retour au chat
- [ ] ✅ Mobile : message "A complété le formulaire" apparaît dans le chat
- [ ] ✅ Admin : voit le formulaire soumis → valide → trigger chaînage OK
- [ ] ✅ Mobile : formulaire passe à "✅ Approuvé" 
- [ ] ✅ Mobile : message "Votre formulaire a été validé" apparaît dans le chat
- [ ] ✅ Test MESSAGE : boutons Valider/Besoin d'infos fonctionnent
- [ ] ✅ Test avec 1 seul projet
- [ ] ✅ Test avec plusieurs projets
7. Phase 2 (Carte Projet) — finitions

## 🧪 Tests à faire
- [ ] Desktop : vérifier que RIEN n'a changé
- [ ] Mobile : flow Home → carte projet → Timeline
- [ ] Mobile : flow Chat → liste conversations → chat projet → bouton formulaire → plein écran → soumission → retour chat
- [ ] Mobile : pastille Chat avec compteur notifs
- [ ] Mobile : client avec 1 seul projet
- [ ] Mobile : client avec plusieurs projets
- [ ] Mobile : formulaire déjà approuvé (pas de bouton)
- [ ] Mobile : message en attente (boutons Valider/Besoin d'infos)
