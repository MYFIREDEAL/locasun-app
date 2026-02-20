# Session 20 Février 2026 — App Partenaire Complète

## 📋 Résumé de tout ce qui a été fait et qui FONCTIONNE

---

### 0. Sessions précédentes (contexte important)

#### Chat Multi-Canal (client / partner / internal) ✅
- Table `chat_messages` : colonne `channel` TEXT ('client', 'partner', 'internal')
- Colonne `sender` TEXT ('client', 'admin', 'pro', 'partner')
- Colonne `file` JSONB pour pièces jointes, `metadata` JSONB
- **Isolation totale** : client ne voit que channel='client', partenaire que channel='partner'
- **Notifications** fonctionnent pour tous les canaux

#### Chat Interne avec Sélecteur de Collègue ✅
- Onglet "Interne" dans le chat admin
- Dropdown pour sélectionner un collègue (query `public.users`)
- Messages filtrés par collègue sélectionné
- **C'est le modèle à suivre** pour le chat partenaire multi-partenaire

#### Corrections Manager / Rôles ✅
- Fix bug où le rôle n'était pas correctement détecté
- `users.manager_id` UUID REFERENCES `users(id)` — hiérarchie correcte

### 1. Architecture App Partenaire (Bottom Nav 4 onglets)
- **MISSIONS** : Liste des missions `status='pending'`, triées par priorité
- **CONTACTS** : Liste des prospects liés aux missions, clic → déplie infos + missions liées (1 mission = direct, 2+ = accordéon pour choisir)
- **CHARLY** : Chat partenaire avec liste de conversations dédupliquées par prospect/projet
- **PREUVES** : Accordéons (En attente 🟡 = `submitted`, Validées 🟢 = `completed`, Refusées 🔴 = `blocked`)

### 2. Flow Mission Partenaire → Admin
| Étape | Status mission | Où ça apparaît |
|-------|---------------|----------------|
| Mission créée | `pending` | Onglet MISSIONS du partenaire |
| Partenaire valide | `submitted` | Onglet PREUVES → "En attente" |
| Admin approuve | `completed` | Onglet PREUVES → "Validées" |
| Admin rejette | `pending` | Retour dans onglet MISSIONS (à corriger) |
| Partenaire dit "impossible" | `blocked` | Onglet PREUVES → "Refusées" |

### 3. Formulaires Partenaire avec Champ Fichier ✅
- **Rendu en mode édition** : Zone upload drag-and-drop (comme client) avec preview nom/taille + bouton ✕
- **Upload** : Via `useSupabaseProjectFiles` → bucket `project-files` + table `project_files`
- **Métadonnées dans `form_data`** : `{ id, name, size, type, storagePath, fieldLabel }`
- **Rendu en lecture seule** (soumis/validé) : Icône 📄 + nom du fichier
- **Validation** : Taille max 10MB, formats PDF/PNG/JPG/DOCX
- **Fichier aussi visible côté admin** dans l'onglet Fichiers du prospect

### 4. RLS Policies Partenaire pour Fichiers ✅
Exécutées dans Supabase (fichier `add_partner_project_files_policies.sql`) :
- `project_files` INSERT : Partenaire peut insérer si prospect_id correspond à une de ses missions
- `project_files` SELECT : Partenaire peut voir les fichiers de ses missions
- `storage.objects` INSERT : Partenaire peut uploader dans bucket `project-files`
- `storage.objects` SELECT : Partenaire peut lire les fichiers du bucket

### 5. Chat Partenaire avec Pièces Jointes ✅
- **Bouton +** (style WhatsApp) avec popup : 📷 Photo (caméra), 🖼️ Galerie, 📎 Fichier
- Upload via `useSupabaseProjectFiles` → fichiers aussi dans onglet Fichiers admin
- **Preview images** dans les bulles de chat (signed URLs via `createSignedUrl`)
- **Téléchargement fichiers** : Lien cliquable avec icône
- Hidden file inputs : camera (`capture="environment"`), gallery (`accept="image/*"`), file (`accept="*/*"`)

### 6. UX Mobile iOS/Android ✅ (Corrections importantes)
- **Anti-zoom iOS sur focus input** : `index.html` meta viewport `maximum-scale=1.0, user-scalable=no` + `font-size: 16px` sur tous les inputs
- **Anti-AutoFill iOS "Préremplir le contact"** : `data-form-type="other"`, `autoComplete="off"`, `aria-autocomplete="none"`, `data-lpignore="true"`, `<form autoComplete="off">` wrapper
- **Layout chat fixe avec clavier** : `fixed inset-0 bottom-16` + `height: calc(100dvh - 4rem)` — `dvh` = dynamic viewport height qui s'adapte quand le clavier iOS/Android s'ouvre
- **enterKeyHint="send"** : Le clavier iOS affiche "Envoyer" au lieu de "Retour"
- **Bouton envoyer** : Vert `bg-green-500`, plus gros `w-10 h-10`
- **`onFocus` scroll** : Scroll automatique vers le bas quand l'input prend le focus

### 6. Bouton "Signaler un problème" ✅
- Dans `PartnerMissionDetailPage` : Bouton orange ⚠️ au-dessus de IMPOSSIBLE/VALIDER
- Navigue vers `/partner/charly` avec `location.state = { openChat: { prospectId, projectType, prospectName } }`
- `PartnerCharlyPage` lit le state → ouvre directement le chat du bon prospect/projet
- Nettoie le state après ouverture (`window.history.replaceState`)

### 7. Admin : Validation/Rejet des Missions Partenaire ✅
- **`handleApprove`** dans `ProspectDetailsAdmin.jsx` : Quand `isPartnerForm`, trouve la mission par `form_ids.includes(panel.formId)` où status='submitted', met status='completed' + `completed_at`
- **`handleReject`** dans `ProspectDetailsAdmin.jsx` : Quand `isPartnerForm`, trouve la mission, remet status='pending' → mission retourne dans MISSIONS du partenaire

### 8. Chat Multi-Canal (client / partner / internal) ✅
- Table `chat_messages` : colonne `channel` TEXT ('client', 'partner', 'internal')
- Chaque canal isolé : client ne voit que 'client', partenaire que 'partner'
- Notifications pour tous les canaux

---

## 🔜 Prochaine étape : Chat Partenaire Multi-Partenaire

### Problème actuel
Le chat partenaire fonctionne avec 1 seul canal "partner" par `prospect_id + project_type`. Si 2 partenaires interviennent sur le même projet (électricien + couvreur), **ils partagent le même canal** → ils voient les messages de l'autre.

### Objectif
- **Côté admin** : Sélecteur de partenaire dans l'onglet chat "Partenaire" (comme le sélecteur de collègue en chat interne)
- **Côté partenaire** : Son user est automatiquement identifié → il tombe dans SON canal dédié
- **Isolation** : Partenaire A ne voit jamais les messages de Partenaire B

### Approche envisagée
Ajouter une colonne `partner_id` (UUID) dans `chat_messages` pour isoler les conversations partenaire par partenaire :
- `channel='partner'` + `partner_id=UUID_du_partenaire` = canal unique
- Admin sélectionne le partenaire → filtre les messages par `partner_id`
- Partenaire : `partner_id` auto-renseigné depuis son profil `partners.id`
- "Signaler un problème" : Le `partner_id` du partenaire est automatiquement mis dans le message

### Fichiers à modifier
| Fichier | Modification |
|---------|-------------|
| `chat_messages` table | Ajouter colonne `partner_id UUID REFERENCES partners(id)` |
| `useSupabaseChatMessages.js` | Accepter `partnerId` optionnel, filtrer par `partner_id` si channel='partner' |
| `ProspectDetailsAdmin.jsx` | Chat onglet Partenaire : sélecteur de partenaire (dropdown des partenaires assignés au projet) |
| `PartnerCharlyPage.jsx` | Auto-détecter `partnerId` depuis auth → `partners.user_id = auth.uid()` |
| `PartnerMissionDetailPage.jsx` | Passer `partnerId` dans le state vers Charly |

### Référence : Comment fonctionne le chat interne (modèle à suivre)
Le chat interne utilise un sélecteur de collègue. On fait pareil pour les partenaires :
- Admin ouvre chat → onglet "Partenaire" → dropdown avec la liste des partenaires ayant des missions sur ce prospect/projet
- Sélectionne un partenaire → affiche les messages filtrés par `partner_id`

---

## 📁 Fichiers clés modifiés dans cette session

| Fichier | Changements |
|---------|------------|
| `src/pages/partner/PartnerMissionDetailPage.jsx` | Fix status 'submitted' (pas 'completed') + support champ fichier + bouton Signaler un problème |
| `src/pages/partner/PartnerCharlyPage.jsx` | Bouton + WhatsApp (Photo/Galerie/Fichier) + useLocation pour ouverture auto |
| `src/pages/partner/PartnerProofsPage.jsx` | Accordéons submitted/completed/blocked |
| `src/pages/partner/PartnerMissionsPage.jsx` | Filtre status='pending' uniquement |
| `src/components/admin/ProspectDetailsAdmin.jsx` | handleApprove → mission 'completed' + handleReject → mission 'pending' (retour MISSIONS) |
| `add_partner_project_files_policies.sql` | 4 RLS policies (table + storage) pour partenaires |
| `index.html` | Meta viewport `maximum-scale=1, user-scalable=no` anti-zoom iOS |

## 🔧 SQL exécutés dans Supabase Dashboard
1. `ALTER TABLE missions DROP CONSTRAINT missions_status_check; ALTER TABLE missions ADD CONSTRAINT missions_status_check CHECK (status IN ('pending','in_progress','completed','blocked','cancelled','submitted'));` → Ajout status 'submitted' au CHECK
2. `add_partner_project_files_policies.sql` → 4 policies RLS pour upload fichiers partenaire

## ⚠️ Bugs corrigés dans cette session
1. **Mission passait direct en 'completed'** au lieu de 'submitted' → Fix dans `PartnerMissionDetailPage.jsx`
2. **DB CHECK constraint** n'avait pas 'submitted' → ALTER TABLE exécuté manuellement
3. **Admin reject ne renvoyait pas la mission** dans MISSIONS → Fix handleReject → status 'pending'
4. **Upload fichier partenaire bloqué RLS 42501** → 4 policies ajoutées
5. **Zoom iOS** sur focus input chat → meta viewport + font-size 16px
6. **AutoFill iOS "Préremplir le contact"** → data-form-type + autoComplete off
