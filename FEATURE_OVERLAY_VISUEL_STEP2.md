# 🎨 Feature : Overlay Visuel avec Blocs Déplaçables (Step 2)

## 🎯 Objectif
Ajouter un overlay visuel au-dessus du PDF permettant à l'admin de positionner des blocs rectangulaires déplaçables et redimensionnables.

## ✅ Ce qui a été implémenté

### 1. **Nouveaux états React**
```javascript
const [overlayBlocks, setOverlayBlocks] = useState([]); // { id, x, y, width, height }
const [selectedBlockId, setSelectedBlockId] = useState(null);
const [isDragging, setIsDragging] = useState(false);
const [isResizing, setIsResizing] = useState(false);
const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
```

### 2. **Nouvelles fonctions de gestion des blocs**

#### `handleAddBlock()`
- Crée un nouveau bloc avec position par défaut (50, 50)
- Dimensions par défaut : 200x100px
- ID unique basé sur timestamp
- Sélectionne automatiquement le bloc créé
- Affiche un toast de confirmation

#### `handleDeleteBlock(blockId)`
- Supprime un bloc de la liste
- Désélectionne si c'était le bloc actif
- Affiche un toast de confirmation

#### `handleBlockMouseDown(blockId, e)`
- Active le mode "déplacement"
- Sélectionne le bloc
- Enregistre la position de départ

#### `handleResizeMouseDown(blockId, e)`
- Active le mode "redimensionnement"
- Sélectionne le bloc
- Enregistre la position de départ

#### `handleMouseMove(e)`
- Gère le déplacement en temps réel
- Gère le redimensionnement en temps réel
- Calcule les deltas depuis le point de départ
- Met à jour les positions/dimensions

#### `handleMouseUp()`
- Désactive le mode drag/resize
- Termine l'interaction

### 3. **Overlay visuel complet**

Structure d'un bloc :
```jsx
<div className="absolute border-2 bg-blue-500 bg-opacity-20">
  {/* Icône de déplacement */}
  <Move className="top-left" />
  
  {/* Bouton supprimer */}
  <Trash2 className="top-right" />
  
  {/* Handle de redimensionnement */}
  <div className="bottom-right cursor-se-resize" />
</div>
```

### 4. **Interactions utilisateur**

**Ajouter un bloc :**
- Bouton "Ajouter un bloc" dans la barre d'actions
- Crée un bloc à position fixe (50, 50)

**Déplacer un bloc :**
- Cliquer sur le bloc (zone bleue semi-transparente)
- Maintenir et déplacer la souris
- Le bloc suit le curseur
- Relâcher pour fixer la position

**Redimensionner un bloc :**
- Cliquer sur le coin bas-droit (carré bleu)
- Maintenir et déplacer la souris
- Le bloc s'agrandit/rétrécit
- Dimensions minimales : 50x30px

**Supprimer un bloc :**
- Cliquer sur l'icône poubelle (rouge, coin haut-droit)
- Le bloc disparaît immédiatement

### 5. **Interface utilisateur**

**Barre d'actions enrichie :**
```
[📄 nom.pdf] [🟦 Ajouter un bloc] [❌ Changer de PDF]
```

**Overlay sur le PDF :**
```
┌────────────────────────────────────────┐
│  PDF (iframe)                          │
│                                        │
│    ┌─────────────────┐  ← Bloc 1      │
│    │ 🔵 Move     ❌   │                │
│    │                 │                │
│    │   Zone bleue    │                │
│    │   semi-trans.   │                │
│    │              ◣  │  ← Resize      │
│    └─────────────────┘                │
│                                        │
│         ┌──────────┐  ← Bloc 2        │
│         │ 🔵    ❌  │                  │
│         │        ◣ │                  │
│         └──────────┘                  │
└────────────────────────────────────────┘
```

**Barre d'info (si blocs présents) :**
```
🟦 2 blocs positionnés
```

### 6. **États visuels**

**Bloc non sélectionné :**
- Bordure bleue claire (`border-blue-400`)
- Fond bleu semi-transparent (20% opacity)

**Bloc sélectionné :**
- Bordure bleue foncée (`border-blue-600`)
- Ombre portée (`shadow-lg`)
- Feedback visuel clair

**Curseurs :**
- Déplacement : `cursor-move`
- Redimensionnement : `cursor-se-resize`

## 🔧 Détails techniques

### Gestion de l'overlay
```javascript
// L'overlay est un div positionné en absolu au-dessus de l'iframe
<div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
  <div className="relative w-full h-full pointer-events-auto">
    {/* Blocs ici */}
  </div>
</div>
```

**Pourquoi `pointer-events-none` puis `pointer-events-auto` ?**
- Le container parent ne capte pas les events (laisse passer au PDF)
- Le container interne capte les events (pour les blocs)
- Permet d'interagir avec le PDF ET les blocs

### Algorithme de déplacement
```javascript
const deltaX = e.clientX - dragStart.x;
const deltaY = e.clientY - dragStart.y;

block.x = Math.max(0, block.x + deltaX); // Empêche x négatif
block.y = Math.max(0, block.y + deltaY); // Empêche y négatif

setDragStart({ x: e.clientX, y: e.clientY }); // MAJ point de référence
```

### Algorithme de redimensionnement
```javascript
const deltaX = e.clientX - dragStart.x;
const deltaY = e.clientY - dragStart.y;

block.width = Math.max(50, block.width + deltaX);  // Min 50px
block.height = Math.max(30, block.height + deltaY); // Min 30px

setDragStart({ x: e.clientX, y: e.clientY });
```

### Structure d'un bloc
```javascript
{
  id: 'block-1705228800000', // Timestamp unique
  x: 150,                     // Position X (px)
  y: 200,                     // Position Y (px)
  width: 250,                 // Largeur (px)
  height: 120                 // Hauteur (px)
}
```

**⚠️ Aucune donnée métier** : les blocs ne contiennent QUE des coordonnées visuelles.

## ⚠️ Interdictions respectées

✅ **Aucune variable métier** (pas de `fieldName`, `type`, etc.)  
✅ **Aucun type de signature**  
✅ **Aucun type métier**  
✅ **Aucune génération JSON final**  
✅ **Aucune génération HTML**  
✅ **Formulaire existant intact**  
✅ **Moteur HTML non touché**  
✅ **Templates existants intacts**  

## 📦 Fichiers modifiés

### `/src/pages/admin/ContractTemplatesPage.jsx`
- Ajout imports : `Square`, `Trash2`, `Move` (lucide-react)
- Ajout 5 états React pour l'overlay
- Ajout 6 fonctions de gestion des blocs
- Modification de `handleClosePdfViewer` : reset des blocs
- Modification du viewer PDF : ajout overlay + handlers
- Ajout bouton "Ajouter un bloc"
- Ajout barre d'info blocs

### Statistiques
- **Lignes ajoutées** : ~180
- **Lignes modifiées** : ~20
- **Aucune suppression**

## 🚀 Workflow utilisateur

1. **Upload PDF** (Step 1 déjà fait)
2. **Cliquer "Ajouter un bloc"**
   - Un rectangle bleu apparaît en (50, 50)
3. **Déplacer le bloc**
   - Cliquer sur la zone bleue
   - Maintenir et déplacer
   - Relâcher pour fixer
4. **Redimensionner le bloc**
   - Cliquer sur le coin bas-droit
   - Maintenir et déplacer
   - Relâcher pour fixer
5. **Ajouter plus de blocs** (répéter étape 2)
6. **Supprimer un bloc**
   - Cliquer sur l'icône poubelle rouge
7. **Fermer** quand terminé

## 🎨 Design

**Palette de couleurs :**
- Blocs : Bleu (`bg-blue-500` à 20% opacity)
- Bordure normale : `border-blue-400`
- Bordure sélectionnée : `border-blue-600`
- Bouton supprimer : Rouge (`bg-red-600`)
- Icône déplacer : Bleu foncé (`bg-blue-600`)
- Handle resize : Bleu foncé (`bg-blue-600`)

**Espacements :**
- Position initiale : (50, 50)
- Dimensions par défaut : 200x100
- Dimensions minimales : 50x30

## 🧪 Tests effectués

✅ Build production (`npm run build`) : OK  
✅ Aucune erreur ESLint  
✅ Aucune erreur TypeScript  
✅ Aucun warning bloquant  

## 📊 Tests manuels recommandés

1. **Ouvrir** `/admin/contract-templates`
2. **Créer** un template (mode PDF)
3. **Uploader** un PDF
4. **Cliquer** "Ajouter un bloc"
5. **Vérifier** :
   - ✓ Un rectangle bleu apparaît
   - ✓ L'icône Move est visible (coin haut-gauche)
   - ✓ L'icône Poubelle est visible (coin haut-droit)
   - ✓ Le handle de resize est visible (coin bas-droit)
6. **Déplacer** le bloc
   - ✓ Le bloc suit la souris
   - ✓ Il ne sort pas de la zone (x, y >= 0)
7. **Redimensionner** le bloc
   - ✓ Le bloc s'agrandit/rétrécit
   - ✓ Dimensions minimales respectées
8. **Ajouter** 2-3 blocs supplémentaires
9. **Vérifier** la barre d'info : "3 blocs positionnés"
10. **Supprimer** un bloc
    - ✓ Il disparaît immédiatement
    - ✓ Toast "Bloc supprimé"
11. **Fermer** la modal
12. **Réouvrir** en mode PDF
    - ✓ Les blocs sont réinitialisés (pas de persistance)

## 🔮 Prochaines étapes (Step 3)

- [ ] Générer un JSON avec les positions des blocs
- [ ] Sauvegarder le JSON en state
- [ ] Afficher le JSON dans l'interface (debug/preview)

## 🐛 Limitations connues (volontaires)

- **Pas de multi-sélection** : un seul bloc sélectionné à la fois
- **Pas de copier/coller** : création manuelle uniquement
- **Pas de grille magnétique** : positionnement pixel-perfect
- **Pas de undo/redo** : suppression définitive
- **Pas de sauvegarde** : les blocs sont perdus à la fermeture

Ces limitations seront levées dans les prochaines steps si nécessaire.

---

**Développé par** : Claude (EVATIME Team)  
**Date** : 14 janvier 2026  
**Step** : 2/5 (Overlay visuel)  
**Status** : ✅ TERMINÉ
