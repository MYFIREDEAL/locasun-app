# 📂 Audit - Onglet Fichiers (FilesTab)

**Date**: 19 novembre 2025  
**Statut**: ⚠️ **INCOMPLET** - Besoin d'exécuter le script SQL

---

## 🎯 Fonctionnalité

Gestion complète des fichiers par projet dans ProspectDetailsAdmin:
- Upload de fichiers (PDF, images, documents)
- Liste des fichiers avec métadonnées
- Téléchargement de fichiers
- Suppression de fichiers
- Suivi via historique du projet

---

## 📦 Composants Créés

### 1. **FilesTab.jsx**
📍 `src/components/admin/project-tabs/FilesTab.jsx`

**Fonctionnalités**:
- Zone d'upload drag-and-drop style
- Liste des fichiers avec icônes (PDF, images, autres)
- Boutons télécharger/supprimer
- Affichage taille + date de création
- Gestion des états (loading, uploading, deleting, error)
- Intégration avec historique du projet

**Props**:
- `projectType`: Type de projet (ACC, Centrale, etc.)
- `prospectId`: UUID du prospect
- `currentUser`: Utilisateur connecté

---

### 2. **useSupabaseProjectFiles.js**
📍 `src/hooks/useSupabaseProjectFiles.js`

**API**:
```javascript
const {
  files,           // Array de fichiers
  loading,         // Boolean: chargement initial
  uploading,       // Boolean: upload en cours
  deleting,        // Boolean: suppression en cours
  error,           // String: message d'erreur
  uploadFile,      // Function: uploader un fichier
  deleteFile,      // Function: supprimer un fichier
  refetch          // Function: recharger la liste
} = useSupabaseProjectFiles({ projectType, prospectId, enabled })
```

**Fonctions principales**:

#### `uploadFile({ file, uploadedBy })`
1. Génère un nom unique avec UUID
2. Upload dans Supabase Storage (`project-files` bucket)
3. Insert métadonnées dans table `project_files`
4. Retourne l'objet créé

#### `deleteFile(id, storagePath)`
1. Supprime du Storage
2. Supprime de la table

**Real-time**: Écoute les INSERT/DELETE sur `project_files` et met à jour l'état automatiquement.

---

## 🗄️ Structure Database

### Table: `project_files`

**Script SQL**: `supabase/create_project_files_table.sql`

```sql
CREATE TABLE public.project_files (
  id UUID PRIMARY KEY,
  project_type TEXT NOT NULL,
  prospect_id UUID REFERENCES prospects(id),
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  storage_path TEXT NOT NULL UNIQUE,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Colonnes**:
- `id`: UUID primaire
- `project_type`: "ACC", "Centrale", "Autonomie", etc.
- `prospect_id`: Lien vers le prospect (nullable)
- `file_name`: Nom original du fichier
- `file_type`: MIME type (ex: `application/pdf`)
- `file_size`: Taille en bytes
- `storage_path`: Chemin dans Storage (ex: `ACC/uuid.pdf`)
- `uploaded_by`: UUID de l'utilisateur qui a uploadé
- `created_at` / `updated_at`: Timestamps

**Index**:
- `idx_project_files_project_type`
- `idx_project_files_prospect_id`
- `idx_project_files_created_at`

---

### Storage Bucket: `project-files`

**Accès**: Privé (non public)

**Structure**:
```
project-files/
├── ACC/
│   ├── uuid-1234.pdf
│   └── uuid-5678.jpg
├── Centrale/
│   └── uuid-9012.pdf
└── Autonomie/
    └── uuid-3456.docx
```

**Policies**:
- Admins peuvent: INSERT, SELECT, DELETE
- Clients: ❌ Pas d'accès direct (pour l'instant)

---

## 🔒 RLS Policies

### Table `project_files`

1. **SELECT**: Admins voient tous les fichiers
2. **INSERT**: Admins peuvent uploader
3. **DELETE**: Admins peuvent supprimer

### Storage `project-files`

1. **INSERT**: Admins peuvent uploader
2. **SELECT**: Admins peuvent télécharger (via signed URL)
3. **DELETE**: Admins peuvent supprimer

---

## 🔄 Real-Time

**Canal**: `project-files-{projectType}`

**Événements écoutés**:
- `INSERT`: Ajoute le fichier en haut de la liste
- `DELETE`: Retire le fichier de la liste

---

## 🔗 Intégrations

### 1. Historique du projet
Chaque upload génère un événement dans `project_history`:
```javascript
{
  event_type: "file",
  title: "Fichier ajouté",
  description: "nom_du_fichier.pdf",
  metadata: {
    size: 1234567,
    type: "application/pdf",
    storage_path: "ACC/uuid.pdf"
  }
}
```

### 2. ProspectDetailsAdmin
Le FilesTab est intégré dans les onglets:
```jsx
<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList>
    <TabsTrigger value="notes">Notes</TabsTrigger>
    <TabsTrigger value="activity">Activité</TabsTrigger>
    <TabsTrigger value="files">Fichiers</TabsTrigger>
  </TabsList>
  <TabsContent value="files">
    <FilesTab projectType={projectType} prospectId={prospectId} />
  </TabsContent>
</Tabs>
```

---

## ⚠️ TODO - Actions Requises

### 🚨 **CRITIQUE**: Exécuter le script SQL

**Fichier**: `supabase/create_project_files_table.sql`

**Actions**:
1. Ouvrir Supabase Dashboard → SQL Editor
2. Copier/coller tout le contenu du script
3. Exécuter (Run)
4. Vérifier dans Table Editor que `project_files` existe
5. Vérifier dans Storage que le bucket `project-files` existe
6. Tester l'upload d'un fichier

### 📋 Checklist de vérification

- [ ] Table `project_files` créée
- [ ] Index créés (3 index)
- [ ] Trigger `updated_at` fonctionne
- [ ] RLS activé sur `project_files`
- [ ] Policies RLS créées (3 policies)
- [ ] Bucket Storage `project-files` créé
- [ ] Policies Storage créées (3 policies)
- [ ] Real-time activé sur `project_files`
- [ ] Test upload fichier OK
- [ ] Test download fichier OK
- [ ] Test delete fichier OK
- [ ] Historique enregistré OK

---

## 🎨 UI/UX

### Zone d'upload
- Bordure pointillée grise
- Hover: bordure bleue + fond bleu clair
- Icône upload + texte descriptif
- Accepte: `.pdf,.png,.jpg,.jpeg,.doc,.docx`
- Limite: 10 MB (à vérifier dans les policies Storage)

### Liste des fichiers
- Cartes blanches avec bordure
- Icône selon type (PDF rouge, Image bleue, Document gris)
- Nom du fichier tronqué si trop long
- Taille formatée (Ko/Mo)
- Date formatée (français)
- Boutons: Download (bleu) + Delete (rouge)

### États
- **Loading**: "Chargement des fichiers..."
- **Empty**: Icône grisée + "Aucun fichier pour ce projet"
- **Uploading**: "Upload en cours..." (input désactivé)
- **Error**: Bandeau rouge avec message

---

## 🐛 Problèmes Connus

1. **Limite de taille**: Actuellement hardcodé texte "max 10 MB" mais pas de validation côté client
2. **Types de fichiers**: Accept hardcodé, pas configurable
3. **Permissions clients**: Les clients ne peuvent pas voir/uploader pour l'instant
4. **Drag & drop**: Zone stylée comme drag-drop mais pas implémenté (seulement click)

---

## 🚀 Améliorations Futures

### Court terme
- [ ] Validation taille fichier avant upload (10 MB max)
- [ ] Barre de progression d'upload
- [ ] Prévisualisation images (modal)
- [ ] Drag & drop réel (pas juste le style)

### Moyen terme
- [ ] Permissions pour clients (voir leurs fichiers)
- [ ] Upload multiple (plusieurs fichiers en même temps)
- [ ] Catégories de fichiers (Contrat, Devis, Facture, etc.)
- [ ] Recherche/filtrage de fichiers

### Long terme
- [ ] Versioning de fichiers
- [ ] Partage de fichiers par email
- [ ] Signature électronique de documents
- [ ] OCR pour extraire données des PDF

---

## 📊 Métriques

**Taille codebase**:
- FilesTab.jsx: ~230 lignes
- useSupabaseProjectFiles.js: ~160 lignes
- Script SQL: ~120 lignes

**Dépendances**:
- `lucide-react`: Upload, Download, Trash2, FileText, Image, File
- `uuid`: Génération noms uniques
- Supabase Storage API
- Hook `useSupabaseProjectHistory`

---

## 🎯 Conclusion

Le système de fichiers est **fonctionnel côté code** mais nécessite **l'exécution du script SQL** pour être opérationnel en production.

**Prochaine étape**: Exécuter `supabase/create_project_files_table.sql` dans Supabase Dashboard.
