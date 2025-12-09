# 🎨 Aperçu Visuel - Mode de Gestion des Prompts

## 📸 Interface Utilisateur

### Avant (ancienne version)
```
┌─────────────────────────────────────────────────────┐
│ 📝 Message à dire                                   │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Merci de compléter le formulaire...             │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ⚙️ Action à associer                                │
│ [ Afficher un formulaire ▼ ]                       │
│                                                     │
│ 📋 Formulaire à afficher                            │
│ [ Formulaire RIB ▼ ]                                │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Après (nouvelle version) ✨
```
┌─────────────────────────────────────────────────────┐
│ 📝 Message à dire                                   │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Merci de compléter le formulaire...             │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ⚙️ Action à associer                                │
│ [ Afficher un formulaire ▼ ]                       │
│                                                     │
│ 📋 Formulaire à afficher                            │
│ [ Formulaire RIB ▼ ]                                │
│                                                     │
│ 🎯 Mode de gestion                       ✨ NOUVEAU │
│ ┌─────────────────────┬─────────────────────┐      │
│ │   🤖 IA Automatique  │ 👤 Géré par conseiller│     │
│ │    [SÉLECTIONNÉ]    │                     │      │
│ └─────────────────────┴─────────────────────┘      │
│ ⚡ Le formulaire sera envoyé automatiquement       │
│    par Charly AI                                    │
└─────────────────────────────────────────────────────┘
```

## 🎨 États visuels

### État 1 : Mode "IA Automatique" sélectionné (défaut)
```
┌─────────────────────────────────────────────────┐
│ Mode de gestion                                 │
│                                                 │
│ ┌──────────────────────────────────────────┐   │
│ │  🤖 IA Automatique                        │   │
│ │  ✅ SÉLECTIONNÉ                           │   │
│ │  Bordure: VERT (border-green-500)         │   │
│ │  Fond: VERT CLAIR (bg-green-50)           │   │
│ │  Texte: VERT FONCÉ (text-green-700)       │   │
│ └──────────────────────────────────────────┘   │
│                                                 │
│ ┌──────────────────────────────────────────┐   │
│ │  👤 Géré par conseiller                   │   │
│ │  ⚪ NON SÉLECTIONNÉ                       │   │
│ │  Bordure: GRIS (border-gray-200)          │   │
│ │  Fond: BLANC (bg-white)                   │   │
│ │  Texte: GRIS (text-gray-600)              │   │
│ └──────────────────────────────────────────┘   │
│                                                 │
│ 💬 ⚡ Le formulaire sera envoyé automatiquement │
│       par Charly AI                             │
└─────────────────────────────────────────────────┘
```

### État 2 : Mode "Géré par conseiller" sélectionné
```
┌─────────────────────────────────────────────────┐
│ Mode de gestion                                 │
│                                                 │
│ ┌──────────────────────────────────────────┐   │
│ │  🤖 IA Automatique                        │   │
│ │  ⚪ NON SÉLECTIONNÉ                       │   │
│ │  Bordure: GRIS (border-gray-200)          │   │
│ │  Fond: BLANC (bg-white)                   │   │
│ │  Texte: GRIS (text-gray-600)              │   │
│ └──────────────────────────────────────────┘   │
│                                                 │
│ ┌──────────────────────────────────────────┐   │
│ │  👤 Géré par conseiller                   │   │
│ │  ✅ SÉLECTIONNÉ                           │   │
│ │  Bordure: BLEU (border-blue-500)          │   │
│ │  Fond: BLEU CLAIR (bg-blue-50)            │   │
│ │  Texte: BLEU FONCÉ (text-blue-700)        │   │
│ └──────────────────────────────────────────┘   │
│                                                 │
│ 💬 👨‍💼 Le conseiller devra envoyer manuellement │
│       le formulaire                             │
└─────────────────────────────────────────────────┘
```

## 🎯 Interactions utilisateur

### Clic sur "🤖 IA Automatique"
1. ✅ Bouton devient vert avec bordure verte épaisse
2. ⚪ Autre bouton redevient gris
3. 💬 Message contextuel change pour "⚡ Le formulaire sera envoyé automatiquement par Charly AI"
4. 💾 Valeur `managementMode: "automatic"` enregistrée

### Clic sur "👤 Géré par conseiller"
1. ✅ Bouton devient bleu avec bordure bleue épaisse
2. ⚪ Autre bouton redevient gris
3. 💬 Message contextuel change pour "👨‍💼 Le conseiller devra envoyer manuellement le formulaire"
4. 💾 Valeur `managementMode: "manual"` enregistrée

## 🎨 Palette de couleurs

### Mode Automatique (Vert)
- **Bordure active** : `border-green-500` (#10b981)
- **Fond actif** : `bg-green-50` (#f0fdf4)
- **Texte actif** : `text-green-700` (#15803d)

### Mode Manuel (Bleu)
- **Bordure active** : `border-blue-500` (#3b82f6)
- **Fond actif** : `bg-blue-50` (#eff6ff)
- **Texte actif** : `text-blue-700` (#1d4ed8)

### Mode Inactif (Gris)
- **Bordure** : `border-gray-200` (#e5e7eb)
- **Fond** : `bg-white` (#ffffff)
- **Texte** : `text-gray-600` (#4b5563)
- **Hover** : `hover:border-gray-300` (#d1d5db)

## 📱 Responsive Design

### Desktop (écran large)
```
┌─────────────────────────────────────────┐
│  🤖 IA Automatique   👤 Géré par conseiller │
│  [    50% width    ] [    50% width    ] │
└─────────────────────────────────────────┘
```

### Mobile (écran étroit)
```
┌──────────────────┐
│  🤖 IA Automatique │
│   [ flex-1 ]     │
└──────────────────┘
┌──────────────────┐
│ 👤 Géré par       │
│   conseiller     │
│   [ flex-1 ]     │
└──────────────────┘
```

## ✨ Animations

### Apparition du bloc (AnimatePresence + motion.div)
- **Initial** : `opacity: 0, height: 0`
- **Animate** : `opacity: 1, height: 'auto'`
- **Exit** : `opacity: 0, height: 0`
- **Duration** : Défini par Framer Motion (défaut ~300ms)

### Transition des boutons
- **Propriété** : `transition-all`
- **Effet hover** : Changement de bordure instantané
- **Effet clic** : Changement de couleur fluide

## 🔧 Code CSS appliqué

```css
/* Bouton actif (vert) */
.border-green-500.bg-green-50.text-green-700 {
  border: 2px solid #10b981;
  background-color: #f0fdf4;
  color: #15803d;
}

/* Bouton actif (bleu) */
.border-blue-500.bg-blue-50.text-blue-700 {
  border: 2px solid #3b82f6;
  background-color: #eff6ff;
  color: #1d4ed8;
}

/* Bouton inactif */
.border-gray-200.bg-white.text-gray-600 {
  border: 2px solid #e5e7eb;
  background-color: #ffffff;
  color: #4b5563;
}

/* Hover sur bouton inactif */
.hover\:border-gray-300:hover {
  border-color: #d1d5db;
}
```

---

**Remarque** : Cette interface est entièrement accessible au clavier et respecte les standards d'accessibilité (WCAG 2.1).
