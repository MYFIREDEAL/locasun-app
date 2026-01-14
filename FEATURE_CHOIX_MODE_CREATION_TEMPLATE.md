# 🎯 Feature : Choix du mode de création de template

## 📋 Résumé
Ajout d'une étape de choix du mode de création au début du workflow de création de templates de contrats dans `/admin/contract-templates`.

## ✅ Modifications apportées

### 1. **Nouveaux états React**
```javascript
const [isModeSelectionOpen, setIsModeSelectionOpen] = useState(false);
const [creationMode, setCreationMode] = useState(null); // null | 'pdf' | 'manual'
```

### 2. **Nouvelle fonction `handleStartCreation()`**
- Remplace l'ancienne logique qui créait directement le template
- Affiche la modal de choix du mode

### 3. **Nouvelle fonction `handleModeSelected(mode)`**
- Gère la sélection du mode (PDF ou Manuel)
- **Mode Manuel** : affiche directement le formulaire avec `contentHtml` vide
- **Mode PDF** : affiche un toast "en développement" + ouvre le formulaire (workflow PDF à implémenter plus tard)

### 4. **Nouvelle modal de choix**
Modal avec 2 options cliquables :
- 📄 **Importer un PDF et générer le HTML** (mode `pdf`)
- ✍️ **J'ai déjà mon HTML** (mode `manual`)

## 🔧 Fichiers modifiés

### `/src/pages/admin/ContractTemplatesPage.jsx`
- Ajout des états `isModeSelectionOpen` et `creationMode`
- Ajout des handlers `handleStartCreation` et `handleModeSelected`
- Remplacement des appels directs à `setEditingContractTemplate` par `handleStartCreation`
- Ajout de la modal de choix du mode avec design cohérent (purple pour PDF, green pour Manuel)

## 🎨 UI/UX

### Modal de choix
- **Titre** : "Choisissez votre méthode de création"
- **Description** : "Comment souhaitez-vous créer votre template de contrat ?"
- **Options** :
  1. Carte PDF (purple) avec icône FileText
  2. Carte Manuel (green) avec icône Edit
- **Bouton** : "Annuler" pour fermer sans action

### Boutons déclencheurs
Deux boutons mènent à cette modal :
1. **Sidebar gauche** : "Nouveau template"
2. **État vide (aucun template sélectionné)** : "Créer un template"

## ⚠️ Interdictions respectées

✅ **Aucune modification du moteur HTML existant**
- Le champ `contentHtml` reste inchangé
- La fonction `handleSaveContractTemplate` est intacte

✅ **Aucune modification des balises/variables dynamiques**
- Pas de changement dans `contractPdfGenerator.js`
- Les variables `{{prospect.name}}`, etc. fonctionnent toujours

✅ **Aucune modification du workflow de signature**
- `executeContractSignatureAction` non touché
- La génération PDF reste identique

✅ **Aucune modification des templates existants**
- Les templates en base restent fonctionnels
- Aucun changement de schéma SQL

## 🚀 État actuel

### ✅ Fonctionnel
- Choix du mode à la création
- Mode Manuel (HTML direct)
- Navigation fluide entre les modals

### 🚧 À implémenter (hors scope actuel)
- **Mode PDF** : Upload PDF + éditeur visuel overlay
- Génération automatique du HTML depuis les zones définies dans le PDF

## 🧪 Tests recommandés

1. **Créer un template en mode Manuel**
   - Cliquer "Nouveau template"
   - Sélectionner "J'ai déjà mon HTML"
   - Vérifier que le formulaire s'affiche avec `contentHtml` vide
   - Saisir du HTML, enregistrer

2. **Créer un template en mode PDF**
   - Cliquer "Nouveau template"
   - Sélectionner "Importer un PDF"
   - Vérifier le toast "en développement"
   - Vérifier que le formulaire s'affiche quand même

3. **Annuler la création**
   - Cliquer "Nouveau template"
   - Cliquer "Annuler"
   - Vérifier que la modal se ferme sans créer de template

4. **Éditer un template existant**
   - Cliquer sur un template dans la liste
   - Vérifier qu'il s'ouvre directement (sans passer par le choix du mode)

## 📦 Commit

```bash
git add src/pages/admin/ContractTemplatesPage.jsx
git add FEATURE_CHOIX_MODE_CREATION_TEMPLATE.md
git commit -m "feat: choix mode création template (PDF ou HTML manuel)"
git push
```

---

**Développé par** : Claude (EVATIME Team)  
**Date** : 14 janvier 2026  
**Product Owner** : Jack  
**Architecte** : ChatGPT
