# Session 20 Février 2026 — App Partenaire Complète

## 📋 Résumé de tout ce qui a été fait et qui FONCTIONNE

---

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
- **Bouton +** (style WhatsApp) avec popup : 📷 Photo, 🖼️ Galerie, 📎 Fichier
- Upload via `useSupabaseProjectFiles` → fichiers aussi dans onglet Fichiers admin
- **Preview images** dans les bulles de chat (signed URLs)
- **Téléchargement fichiers** : Lien cliquable avec icône
- **Anti-zoom iOS** : `font-size: 16px`, `maximum-scale=1`
- **Anti-AutoFill iOS** : `data-form-type="other"`, `autoComplete="off"`
- **Layout fixe** : `fixed inset-0 bottom-16` + `dvh` pour clavier iOS/Android
- **enterKeyHint="send"** pour clavier iOS

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
| `src/pages/partner/PartnerMissionDetailPage.jsx` | Support champ fichier + bouton Signaler un problème + import AlertTriangle |
| `src/pages/partner/PartnerCharlyPage.jsx` | useLocation + ouverture auto chat depuis state |
| `src/pages/partner/PartnerProofsPage.jsx` | Accordéons submitted/completed/blocked |
| `src/pages/partner/PartnerMissionsPage.jsx` | Filtre status='pending' |
| `src/components/admin/ProspectDetailsAdmin.jsx` | handleApprove/handleReject pour missions partenaire |
| `add_partner_project_files_policies.sql` | 4 RLS policies (table + storage) |
| `index.html` | Meta viewport anti-zoom iOS |

## 🔧 SQL exécutés dans Supabase Dashboard
1. `ALTER TABLE missions DROP CONSTRAINT missions_status_check; ALTER TABLE missions ADD CONSTRAINT missions_status_check CHECK (status IN ('pending','in_progress','completed','blocked','cancelled','submitted'));` → Ajout status 'submitted'
2. `add_partner_project_files_policies.sql` → 4 policies RLS pour upload fichiers partenaire
