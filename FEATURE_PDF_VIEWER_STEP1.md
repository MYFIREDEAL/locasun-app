# 📄 Feature : PDF Viewer Simple (Step 1)

## 🎯 Objectif
Implémenter un viewer PDF simple dans le workflow de création de templates. L'admin peut uploader un PDF et le visualiser immédiatement dans l'interface.

## ✅ Ce qui a été implémenté

### 1. **Nouveaux états React**
```javascript
const [uploadedPdfFile, setUploadedPdfFile] = useState(null);
const [pdfUrl, setPdfUrl] = useState(null);
const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false);
```

### 2. **Modification du comportement du mode PDF**
Avant :
```javascript
// Affichait un toast "en développement" et ouvrait le formulaire HTML
```

Après :
```javascript
// Ouvre directement la modal PDF Viewer
setIsPdfViewerOpen(true);
```

### 3. **Nouvelle fonction `handlePdfUpload(event)`**
- Valide que le fichier est bien un PDF
- Crée une URL blob pour afficher le PDF
- Affiche un toast de confirmation
- Stocke le fichier dans l'état

### 4. **Nouvelle fonction `handleClosePdfViewer()`**
- Nettoie l'URL blob (évite les fuites mémoire)
- Ferme la modal
- Reset les états

### 5. **Nouvelle modal PDF Viewer**
Structure complète :
- **Header** : Titre + nom du fichier + taille
- **Zone d'upload** (si aucun PDF) :
  - Icône Upload
  - Texte d'instructions
  - Bouton "Sélectionner un PDF"
  - Input file caché (accept="application/pdf")
- **Viewer PDF** (si PDF uploadé) :
  - Barre d'actions avec nom du fichier
  - Bouton "Changer de PDF"
  - iframe pour afficher le PDF
  - Scroll vertical automatique
  - Hauteur 60vh avec minimum 600px
- **Footer** : Bouton "Fermer"

## 🎨 Interface utilisateur

### Écran d'upload (état initial)
```
┌─────────────────────────────────────────┐
│  📄 Visualisation du PDF                │
│  Importez un fichier PDF               │
├─────────────────────────────────────────┤
│                                         │
│    ⬆️  [Icône Upload]                  │
│                                         │
│    Importez votre fichier PDF          │
│    Cliquez pour sélectionner...        │
│                                         │
│    [Sélectionner un PDF]               │
│                                         │
└─────────────────────────────────────────┘
```

### Écran de visualisation (après upload)
```
┌─────────────────────────────────────────┐
│  📄 Visualisation du PDF                │
│  contrat-acc.pdf (245.67 KB)           │
├─────────────────────────────────────────┤
│  📄 contrat-acc.pdf  [X Changer de PDF]│
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────┐  │
│  │                                 │  │
│  │      [PDF AFFICHÉ ICI]         │  │
│  │      via iframe                │  │
│  │      scroll vertical           │  │
│  │                                 │  │
│  └─────────────────────────────────┘  │
│                [Fermer]                │
└─────────────────────────────────────────┘
```

## 🔧 Détails techniques

### Gestion mémoire
- Utilisation de `URL.createObjectURL()` pour créer une URL temporaire
- Nettoyage avec `URL.revokeObjectURL()` lors de la fermeture
- Évite les fuites mémoire

### Affichage PDF
- **Méthode** : `<iframe>` avec source blob
- **Avantages** :
  - Aucune dépendance externe
  - Utilise le viewer natif du navigateur
  - Zoom/scroll/navigation natifs
  - Compatible tous navigateurs modernes

### Validation
- Type MIME : `application/pdf`
- Toast d'erreur si fichier invalide
- Toast de succès avec nom du fichier

## ⚠️ Interdictions respectées

✅ **Aucun overlay ajouté**
✅ **Aucun champ ajouté**
✅ **Aucune génération JSON**
✅ **Aucune génération HTML**
✅ **Formulaire existant non modifié**
✅ **Moteur HTML non touché**
✅ **Templates existants intacts**

## 📦 Fichiers modifiés

### `/src/pages/admin/ContractTemplatesPage.jsx`
- Ajout imports : `Upload`, `ZoomIn`, `ZoomOut`, `X` (lucide-react)
- Ajout états PDF : `uploadedPdfFile`, `pdfUrl`, `isPdfViewerOpen`
- Ajout handlers : `handlePdfUpload`, `handleClosePdfViewer`
- Modification `handleModeSelected('pdf')` : ouvre PDF viewer au lieu du formulaire
- Ajout modal complète PDF Viewer avec upload + iframe

### Statistiques
- **Lignes ajoutées** : ~120
- **Lignes modifiées** : ~10
- **Aucune suppression**

## 🚀 Workflow utilisateur

1. **Créer un template** → Clic "Nouveau template"
2. **Choisir le mode** → Sélectionner "📄 Importer un PDF"
3. **Upload** → Modal s'ouvre avec zone d'upload
4. **Sélectionner PDF** → Clic sur "Sélectionner un PDF"
5. **Visualiser** → PDF s'affiche immédiatement dans iframe
6. **Changer** (optionnel) → Bouton "Changer de PDF" pour uploader un autre
7. **Fermer** → Bouton "Fermer" pour retourner à la liste

## 🧪 Tests effectués

✅ Build réussi (`npm run build`)
✅ Aucune erreur ESLint
✅ Aucune erreur TypeScript

## 📊 Tests manuels recommandés

1. **Ouvrir** `/admin/contract-templates`
2. **Créer** un nouveau template (mode PDF)
3. **Upload** un fichier PDF
4. **Vérifier** :
   - Le PDF s'affiche dans l'iframe
   - Le scroll fonctionne
   - Le nom et la taille sont affichés
   - Le bouton "Changer de PDF" fonctionne
5. **Fermer** la modal
6. **Vérifier** : aucune fuite mémoire (DevTools → Memory)

## 🔮 Prochaines étapes (Step 2)

- [ ] Ajouter overlay sur le PDF
- [ ] Permettre de placer des zones cliquables
- [ ] Enregistrer les positions dans un JSON
- [ ] Générer le HTML depuis le JSON
- [ ] Injecter dans le textarea existant

---

**Développé par** : Claude (EVATIME Team)  
**Date** : 14 janvier 2026  
**Step** : 1/5 (PDF Viewer uniquement)  
**Status** : ✅ TERMINÉ
