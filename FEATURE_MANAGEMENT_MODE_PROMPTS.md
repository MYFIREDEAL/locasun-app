# 🤖 Nouvelle Fonctionnalité : Mode de Gestion des Prompts

## 📋 Vue d'ensemble

Une nouvelle option a été ajoutée au système de création de prompts Charly AI pour permettre aux admins de choisir si un formulaire doit être envoyé **automatiquement par l'IA** ou **manuellement par un conseiller**.

## ✨ Fonctionnalité ajoutée

### Localisation
- **Fichier modifié** : `src/pages/admin/ProfilePage.jsx`
- **Composant** : `ActionEditor` (dans le bloc "Modifier le prompt")
- **Ligne** : ~840-890

### Interface utilisateur

Lors de la création/modification d'un prompt avec une action de type "Afficher un formulaire", deux options sont maintenant disponibles :

1. **🤖 IA Automatique** (par défaut)
   - Le formulaire sera envoyé automatiquement par Charly AI
   - Aucune intervention manuelle requise
   - Idéal pour les workflows entièrement automatisés

2. **👤 Géré par conseiller**
   - Le conseiller devra envoyer manuellement le formulaire
   - Permet un contrôle humain sur le moment d'envoi
   - Idéal pour les cas nécessitant validation ou timing spécifique

### Affichage

```
┌─────────────────────────────────────────────────┐
│ Formulaire à afficher                           │
│ [Sélecteur de formulaire ▼]                     │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Mode de gestion                                 │
│                                                 │
│ ┌──────────────────┐  ┌──────────────────┐    │
│ │  🤖 IA Automatique │  │ 👤 Géré par conseiller│ │
│ └──────────────────┘  └──────────────────┘    │
│                                                 │
│ ⚡ Le formulaire sera envoyé automatiquement   │
│    par Charly AI                                │
└─────────────────────────────────────────────────┘
```

## 🔧 Implémentation technique

### Structure de données

Le champ `managementMode` est maintenant ajouté à chaque action de type `show_form` :

```javascript
{
  "id": "action-123",
  "message": "Merci de compléter ce formulaire",
  "type": "show_form",
  "formId": "form-rib-acc",
  "managementMode": "automatic" // ou "manual"
}
```

### Valeurs possibles

- `"automatic"` (défaut) : Envoi automatique par Charly AI
- `"manual"` : Envoi manuel par le conseiller

### Logique d'affichage

```javascript
// Dans ActionEditor
handleActionChange('managementMode', 'automatic') // IA Automatique
handleActionChange('managementMode', 'manual')    // Géré par conseiller
```

## 🎯 Cas d'usage

### Scenario 1 : Workflow entièrement automatisé
```javascript
{
  project_id: "ACC",
  steps_config: {
    "0": {
      "actions": [{
        "message": "Merci de compléter votre RIB",
        "type": "show_form",
        "formId": "form-rib",
        "managementMode": "automatic"  // ✅ Envoyé automatiquement
      }]
    }
  }
}
```

### Scenario 2 : Validation manuelle requise
```javascript
{
  project_id: "Centrale",
  steps_config: {
    "2": {
      "actions": [{
        "message": "Formulaire de financement à envoyer après validation commerciale",
        "type": "show_form",
        "formId": "form-financement",
        "managementMode": "manual"  // ⏸️ Envoyé manuellement par le conseiller
      }]
    }
  }
}
```

## 🚀 Prochaines étapes

### Backend à implémenter
- [ ] Logique dans `useSupabasePrompts.js` pour respecter le `managementMode`
- [ ] Fonction pour que les conseillers puissent déclencher l'envoi manuel
- [ ] Notification pour alerter le conseiller qu'un formulaire est prêt à être envoyé

### Interface conseiller
- [ ] Ajouter un bouton "Envoyer le formulaire" dans l'interface admin
- [ ] Liste des formulaires en attente d'envoi manuel
- [ ] Historique des envois (automatiques vs manuels)

## 📊 Base de données

### Table `prompts`

La colonne `steps_config` (JSONB) stocke maintenant le champ `managementMode` :

```sql
-- Exemple de steps_config
{
  "0": {
    "actions": [
      {
        "id": "action-1",
        "message": "Message de bienvenue",
        "type": "show_form",
        "formId": "form-123",
        "managementMode": "automatic"  -- Nouveau champ
      }
    ],
    "autoCompleteStep": true
  }
}
```

## 🎨 Design

### Styles appliqués

- **Mode actif** : Bordure verte/bleue + fond clair + texte foncé
- **Mode inactif** : Bordure grise + fond blanc + hover sur bordure
- **Icônes** : 🤖 (IA) et 👤 (Conseiller) pour clarté visuelle
- **Description contextuelle** : Texte explicatif sous les boutons

### Responsive

- Les deux boutons s'affichent côte à côte avec `flex gap-2`
- Adaptable sur mobile grâce à `flex-1` sur chaque bouton

## ✅ Tests recommandés

1. **Créer un nouveau prompt** avec mode automatique
2. **Modifier un prompt existant** pour passer en mode manuel
3. **Vérifier la sauvegarde** dans Supabase (`prompts.steps_config`)
4. **Tester l'affichage** sur différents projets (ACC, Centrale, Autonomie)
5. **Valider la rétrocompatibilité** : anciens prompts sans `managementMode` doivent fonctionner en mode "automatic"

## 📝 Notes importantes

- **Valeur par défaut** : Si `managementMode` n'est pas défini, le système considère que c'est "automatic"
- **Rétrocompatibilité** : Les prompts existants continueront de fonctionner normalement
- **Migration non nécessaire** : Les anciennes données sans ce champ fonctionneront comme avant

---

**Date d'ajout** : 9 décembre 2024  
**Auteur** : GitHub Copilot  
**Statut** : ✅ Interface complète | ⏳ Backend à implémenter
