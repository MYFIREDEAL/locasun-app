# 📋 Nouvelle Structure de la Page Projet - EVATIME

## 🎯 Ce qui a été fait

### ✅ Nouveaux Composants Créés

#### 1. **ProjectCenterPanel.jsx** (Wrapper principal)
- **Emplacement** : `src/components/admin/ProjectCenterPanel.jsx`
- **Rôle** : Enveloppe la colonne centrale complète
- **Structure** :
  - Chat en haut (inchangé)
  - Tabs juste en dessous
  - Historique tout en bas (toujours visible)

#### 2. **ProjectTabs.jsx** (Navigation entre onglets)
- **Emplacement** : `src/components/admin/project-tabs/ProjectTabs.jsx`
- **3 onglets** :
  - 📝 Notes (ouvert par défaut)
  - 📊 Activité
  - 📁 Fichiers
- Style : Simple, propre, dans le style EVATIME actuel

#### 3. **NotesTab.jsx** (Onglet Notes)
- **Emplacement** : `src/components/admin/project-tabs/NotesTab.jsx`
- **Features** :
  - Éditeur de note (textarea)
  - Bouton "Enregistrer" (avec toast de confirmation)
  - Icônes pour :
    - @mention (mentionner un user) - UX seulement
    - Joindre un fichier - UX seulement
  - Liste des notes existantes (avec mock data pour l'instant)
- **À faire** :
  - Créer table Supabase `project_notes` avec :
    - `id` (uuid)
    - `prospect_id` (uuid)
    - `project_type` (text)
    - `content` (text)
    - `created_by` (uuid → users.id)
    - `created_at` (timestamp)
    - `mentions` (jsonb) - optionnel
  - Hook `useSupabaseProjectNotes.js` pour CRUD + real-time
  - Système de mentions @user

#### 4. **ActivityTab.jsx** (Onglet Activité)
- **Emplacement** : `src/components/admin/project-tabs/ActivityTab.jsx`
- **Features** :
  - Bouton "Ajouter une activité" en haut
  - Section "En cours" (activités futures)
  - Section "Passées" (activités terminées)
  - Mock data affiché pour l'instant
- **À faire** :
  - Brancher `useSupabaseAgenda` pour récupérer :
    - `appointments` (rdv)
    - `calls` (appels)
    - `tasks` (tâches)
  - Filtrer par `prospectId` et `projectType`
  - Intégrer modal `AddActivityModal` (déjà existante)
  - Afficher vraies données avec icônes et couleurs

#### 5. **FilesTab.jsx** (Onglet Fichiers)
- **Emplacement** : `src/components/admin/project-tabs/FilesTab.jsx`
- **Features** :
  - Zone de drag & drop pour upload
  - Liste des fichiers avec :
    - Nom + type + taille + date + auteur
    - Icônes par type (PDF, image, etc.)
    - Actions : Télécharger / Supprimer
  - Mock data pour l'instant
- **À faire** :
  - Créer bucket Supabase Storage `project-files`
  - Implémenter upload :
    ```js
    await supabase.storage
      .from('project-files')
      .upload(`${prospectId}/${projectType}/${fileName}`, file)
    ```
  - Créer table `project_files` pour metadata :
    - `id`, `prospect_id`, `project_type`, `file_name`, `file_url`, `file_size`, `file_type`, `uploaded_by`, `uploaded_at`
  - Hook `useSupabaseProjectFiles.js` pour CRUD
  - Download : `supabase.storage.from('project-files').download(path)`

#### 6. **ProjectHistory.jsx** (Historique global)
- **Emplacement** : `src/components/admin/project-tabs/ProjectHistory.jsx`
- **Features** :
  - Timeline avec icônes et couleurs
  - Événements affichés :
    - Formulaires complétés
    - Étapes changées
    - RDV ajoutés/passés
    - Tâches terminées
    - Notes ajoutées
    - Tags modifiés
  - Mock data pour l'instant
- **À faire** :
  - Agréger données depuis plusieurs sources Supabase :
    - `client_form_panels` (WHERE status = 'submitted')
    - `project_steps_status` (tracker les changements d'étapes)
    - `appointments` (nouveaux rdv)
    - `tasks` (WHERE done = true)
    - `project_notes` (nouvelles notes)
  - Créer hook `useProjectHistory(prospectId, projectType)` qui :
    - Fusionne toutes ces sources
    - Trie par date DESC
    - Formate pour affichage timeline
  - ⚠️ **IMPORTANT** : Ne PAS inclure les messages du chat (trop volumineux)

---

## 📐 Structure Finale de la Page

```
┌─────────────────────────────────────────────────────────────────┐
│                      HEADER + NAVIGATION                         │
└─────────────────────────────────────────────────────────────────┘
┌──────────────┬────────────────────────────┬─────────────────────┐
│ COLONNE      │ COLONNE CENTRALE           │ COLONNE DROITE      │
│ GAUCHE       │ (NOUVEAU)                  │ (INCHANGÉE)         │
│              │                            │                     │
│ ✅ Projets   │ ✅ Chat (en haut)         │ ✅ Montant du deal │
│ ✅ Actions   │                            │                     │
│ ✅ Activité  │ ⭐ NOUVEAU MODULE :       │ ✅ Pipeline (drag)  │
│   en cours   │   ┌──────────────────┐    │                     │
│ (gardée !)   │   │ 📝 Notes         │    │                     │
│              │   │ 📊 Activité      │    │                     │
│ ✅ Forms     │   │ 📁 Fichiers      │    │                     │
│ ✅ Infos     │   └──────────────────┘    │                     │
│              │                            │                     │
│              │ ⭐ HISTORIQUE (toujours   │                     │
│              │    visible, sous tabs)     │                     │
│              │   • Formulaires complétés  │                     │
│              │   • Étapes changées        │                     │
│              │   • RDV ajoutés            │                     │
│              │   • Tâches terminées       │                     │
│              │   • Notes ajoutées         │                     │
└──────────────┴────────────────────────────┴─────────────────────┘
```

---

## ✅ Ce qui est FAIT (UX prête)

1. ✅ Composants créés et intégrés
2. ✅ Navigation par tabs fonctionnelle
3. ✅ Notes : éditeur + barre d'outils + bouton Enregistrer
4. ✅ Activité : affichage en cours/passées + bouton Ajouter
5. ✅ Fichiers : zone upload + liste avec actions
6. ✅ Historique : timeline avec icônes
7. ✅ Style cohérent avec EVATIME (Tailwind)
8. ✅ Mock data pour toutes les sections
9. ✅ Aucune breaking change (colonnes gauche/droite intactes)
10. ✅ Committed & pushed sur `main`

---

## 🚧 Ce qu'il reste à faire (Backend)

### 1️⃣ Onglet Notes
- [ ] Créer table `project_notes` dans Supabase
- [ ] Hook `useSupabaseProjectNotes.js` (CRUD + real-time)
- [ ] Remplacer mock data par vraies notes
- [ ] Système de mentions @user (optionnel)
- [ ] Support attachments (lier à `project_files`)

### 2️⃣ Onglet Activité
- [ ] Brancher `useSupabaseAgenda` existant
- [ ] Filtrer par `prospectId` + `projectType`
- [ ] Intégrer `AddActivityModal` (déjà existe dans Agenda.jsx)
- [ ] Remplacer mock data

### 3️⃣ Onglet Fichiers
- [ ] Créer bucket Supabase Storage `project-files`
- [ ] Créer table `project_files` (metadata)
- [ ] Hook `useSupabaseProjectFiles.js`
- [ ] Implémenter upload/download/delete
- [ ] Remplacer mock data

### 4️⃣ Historique
- [ ] Hook `useProjectHistory(prospectId, projectType)`
- [ ] Agréger données depuis :
  - `client_form_panels` (formulaires complétés)
  - `project_steps_status` (changements d'étapes)
  - `appointments` (rdv ajoutés)
  - `tasks` (tâches terminées)
  - `project_notes` (notes ajoutées)
- [ ] Trier par date DESC
- [ ] ⚠️ Exclure messages du chat

---

## 🎨 Détails Techniques

### Fichiers Modifiés
- `src/components/admin/ProspectDetailsAdmin.jsx` :
  - Import de `ProjectCenterPanel`
  - Remplacement de la colonne centrale (lignes ~1101-1139)

### Fichiers Créés
- `src/components/admin/ProjectCenterPanel.jsx`
- `src/components/admin/project-tabs/ProjectTabs.jsx`
- `src/components/admin/project-tabs/NotesTab.jsx`
- `src/components/admin/project-tabs/ActivityTab.jsx`
- `src/components/admin/project-tabs/FilesTab.jsx`
- `src/components/admin/project-tabs/ProjectHistory.jsx`

### Props Pattern
```jsx
<ProjectCenterPanel
  prospectId={prospect.id}
  projectType={activeProjectTag}
  currentStep={currentStep}
  statusConfig={statusConfig}
>
  <ChatInterface {...props} />
</ProjectCenterPanel>
```

---

## 📊 Tables Supabase à Créer

### 1. `project_notes`
```sql
CREATE TABLE project_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  project_type TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  mentions JSONB DEFAULT '[]'::jsonb
);

-- Index pour performance
CREATE INDEX idx_project_notes_prospect ON project_notes(prospect_id, project_type);
CREATE INDEX idx_project_notes_created_at ON project_notes(created_at DESC);

-- RLS Policy
ALTER TABLE project_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view notes for their prospects"
  ON project_notes FOR SELECT
  USING (
    prospect_id IN (
      SELECT id FROM prospects 
      WHERE owner_id = auth.uid() 
      OR owner_id IN (
        SELECT id FROM users WHERE manager_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create notes"
  ON project_notes FOR INSERT
  WITH CHECK (created_by = auth.uid());
```

### 2. `project_files`
```sql
CREATE TABLE project_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  project_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_project_files_prospect ON project_files(prospect_id, project_type);

-- RLS Policy (même logique que project_notes)
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;
```

### 3. Bucket Storage
```sql
-- Créer le bucket dans Supabase Dashboard > Storage
-- Nom: project-files
-- Public: false (accès avec auth seulement)

-- Policy pour upload
CREATE POLICY "Users can upload project files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'project-files' 
    AND auth.uid() IS NOT NULL
  );

-- Policy pour download
CREATE POLICY "Users can download project files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'project-files'
    AND auth.uid() IS NOT NULL
  );
```

---

## 🚀 Prochaines Étapes Recommandées

1. **Phase 1 : Notes** (le plus simple)
   - Créer table `project_notes`
   - Hook `useSupabaseProjectNotes`
   - Remplacer mock data dans `NotesTab.jsx`

2. **Phase 2 : Activité** (réutilise existant)
   - Brancher `useSupabaseAgenda` dans `ActivityTab.jsx`
   - Intégrer modal d'ajout

3. **Phase 3 : Fichiers** (Storage)
   - Setup Supabase Storage + table
   - Hook `useSupabaseProjectFiles`
   - Implémenter upload/download

4. **Phase 4 : Historique** (plus complexe)
   - Hook d'agrégation multi-sources
   - Transformer en timeline

---

## 🎯 Résumé

✅ **Structure UX complète et fonctionnelle**
✅ **Tous les composants créés et intégrés**
✅ **Mock data affichée partout**
✅ **Style cohérent avec EVATIME**
✅ **Aucune régression (colonnes gauche/droite intactes)**

🚧 **Backend Supabase à brancher** (tables + hooks + Storage)

Le code est **production-ready** côté UX. Tu peux maintenant :
- Tester l'interface en local
- Brancher progressivement le backend Supabase
- Itérer sur chaque onglet indépendamment

🚀 **Commit** : `8822f5e` sur `main`
📦 **Pushed** vers GitHub

---

**Bon dev ! 🎉**
