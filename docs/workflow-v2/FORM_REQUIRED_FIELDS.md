# Configuration des Champs Requis et Relances (Client uniquement)

## 📋 Vue d'ensemble

Cette fonctionnalité permet de configurer, pour les actions **Formulaire (Client)**, les champs obligatoires et un système de relance automatique.

**Périmètre** : Client uniquement (pas Commercial, pas Partenaire)

## ✨ Fonctionnalités

### 1️⃣ Définition des Champs Requis

Lorsqu'un formulaire est sélectionné pour une action Client :
- Un bouton **"Définir les champs requis"** apparaît
- Clic → Modal listant tous les champs du formulaire
- L'admin coche les champs **obligatoires pour valider l'objectif**
- Ces champs sont stockés dans `actionConfig.requiredFields[]`

**Exemple** :
```json
{
  "actionType": "FORM",
  "targetAudience": "CLIENT",
  "allowedFormIds": ["form-123"],
  "requiredFields": ["nom", "prenom", "email", "telephone"]
}
```

### 2️⃣ Validation du Formulaire

Le bloc de validation existant **"Formulaire validé"** est connecté aux champs requis :

**Logique** :
- `DONE = true` **uniquement** quand tous les champs requis sont remplis
- Si `requiredFields = []` → validation classique (tous les champs du formulaire)
- Si `requiredFields = ["nom", "email"]` → seuls ces 2 champs doivent être remplis

**⚠️ Important** :
- Ne crée **aucun nouveau bloc** de validation
- Utilise le système existant `completionTrigger: 'form_approved'`
- Le passage à l'étape suivante est autorisé **uniquement** si `DONE = true`

### 3️⃣ Relance Automatique

Configuration d'une relance si le formulaire n'est pas validé :

**Paramètres** :
- Toggle ON/OFF
- Délai : J+1 / J+2 / J+3 / J+4 (sélection unique)
- Fenêtre : Journée (ex: relance envoyée le lendemain dans la journée)

**Comportement** :
```json
{
  "reminderConfig": {
    "enabled": true,
    "delayDays": 2
  }
}
```

**Exemple** : Si le client reçoit le formulaire le Lundi à 10h et ne le valide pas :
- J+1 : Mardi dans la journée → relance envoyée
- J+2 : Mercredi dans la journée → relance envoyée (si `delayDays: 2`)
- Etc.

**Arrêt automatique** :
- Dès que le formulaire est validé (`DONE = true`), les relances s'arrêtent
- Pas besoin d'action manuelle

### 4️⃣ Aucune Action de Relance Créée

**Contrainte respectée** :
- Pas de nouvelle action "relance", "mail", etc.
- La relance est gérée **en backend** (déclencheur externe, cron, fonction edge)
- L'UI configure uniquement les paramètres (`reminderConfig`)
- L'exécution se fait **hors V2** (à implémenter dans V1 ou système séparé)

## 🎨 Interface Utilisateur

### Bouton "Définir les champs requis"

Bloc bleu avec :
- Titre : "Champs requis pour validation"
- Description : Nombre de champs définis
- Bouton : "Définir" (ouvre modal)

### Modal de Sélection

- Header : Nom du formulaire
- Liste des champs avec checkbox
- Affichage : Label, Type, "Obligatoire dans le formulaire"
- Footer : Compteur + Boutons "Annuler" / "Valider"

### Configuration Relance

Bloc violet avec :
- Toggle ON/OFF
- Si ON : Grille de boutons J+1 / J+2 / J+3 / J+4
- Texte explicatif :
  - "⏱️ Relance envoyée J+X si formulaire incomplet"
  - "✅ Arrêt automatique dès validation du formulaire"

## 📊 Structure de Données

### Dans `actionConfig` (mémoire Phase 3)

```javascript
{
  targetAudience: 'CLIENT',
  actionType: 'FORM',
  allowedFormIds: ['abc-123'],
  requiredFields: ['nom', 'email', 'telephone'], // Nouveauté
  reminderConfig: {                              // Nouveauté
    enabled: true,
    delayDays: 2
  },
  completionTrigger: 'form_approved'
}
```

### Futur (Phase 9 - Persistance Supabase)

Table `workflow_module_templates` :
```sql
action_config JSONB -- Contient requiredFields et reminderConfig
```

## 🔄 Workflow Complet

### Étape 1 : Configuration Admin

1. Admin ouvre "Configuration Actions V2"
2. Sélectionne "Formulaire" + "Client"
3. Choisit un formulaire
4. Clic "Définir les champs requis" → Coche "nom" et "email"
5. Active la relance J+2
6. Sauvegarde (en mémoire pour l'instant)

### Étape 2 : Exécution Client

1. Client reçoit le formulaire
2. Remplit "nom" mais pas "email"
3. Soumet le formulaire
4. Backend vérifie `requiredFields` → "email" manquant → `DONE = false`
5. Client ne peut pas passer à l'étape suivante

### Étape 3 : Relance

1. J+2 : Backend détecte formulaire incomplet + relance activée
2. Envoie message chat : "N'oubliez pas de compléter votre formulaire !"
3. Client complète "email" + soumet
4. Backend vérifie → Tous les champs requis remplis → `DONE = true`
5. Relances s'arrêtent automatiquement

### Étape 4 : Passage Étape Suivante

1. Client voit bouton "Passer à l'étape suivante"
2. Clic → Backend vérifie `DONE = true` → Autorisé ✅
3. Client avance dans le workflow

## 🚧 Contraintes Techniques

### Ce qui est fait (Phase 3)

✅ UI de configuration (bouton + modal + toggle relance)  
✅ Stockage en mémoire (`actionConfig.requiredFields`, `actionConfig.reminderConfig`)  
✅ Affichage conditionnel (uniquement si `targetAudience = CLIENT`)  
✅ Connexion au bloc "Formulaire validé" (conceptuelle)  

### Ce qui n'est PAS fait (hors scope Phase 3)

❌ Logique de validation backend (vérifier `requiredFields` à la soumission)  
❌ Système de relance automatique (cron, edge function)  
❌ Persistance en DB (Phase 9)  
❌ Exécution réelle des relances  

### À implémenter (Backend)

1. **Fonction de validation** :
   - Hook `on_form_submit` (V1 ou V2)
   - Compare `submittedFields` vs `requiredFields`
   - Retourne `{ valid: true/false, missingFields: [...] }`

2. **Système de relance** :
   - Cron quotidien ou edge function
   - Query prospects avec `DONE = false` et `reminderConfig.enabled = true`
   - Calcul `date_soumission + delayDays`
   - Envoi message chat si délai atteint
   - Arrêt si `DONE = true`

3. **Gestion de l'étape suivante** :
   - Vérifier `DONE = true` avant autorisation de passage
   - Bloquer si `completionTrigger = 'form_approved'` et `DONE = false`

## 📝 Notes de Développement

### Fichiers Modifiés

- `ModuleConfigTab.jsx` : Nouveau composant `FormRequiredFieldsConfig`
- `moduleAIConfig.js` : Ajout `requiredFields` et `reminderConfig` dans `DEFAULT_ACTION_CONFIG`

### Composant `FormRequiredFieldsConfig`

**Props** :
- `selectedFormIds` : IDs des formulaires sélectionnés
- `availableForms` : Liste complète des formulaires (pour récupérer les champs)
- `requiredFields` : Liste actuelle des champs requis
- `reminderConfig` : Config relance { enabled, delayDays }
- `onRequiredFieldsChange` : Callback mise à jour champs
- `onReminderConfigChange` : Callback mise à jour relance

**État interne** :
- `showModal` : Affichage du modal
- `tempRequiredFields` : Sélection temporaire (avant validation)

**Logique** :
- Récupère `form_schema.fields` du premier formulaire sélectionné
- Affiche les champs avec checkbox
- Validation → Appel `onRequiredFieldsChange(tempRequiredFields)`

### Affichage Conditionnel

Le composant n'est affiché que si :
```javascript
actionConfig.actionType === 'FORM' && actionConfig.targetAudience === 'CLIENT'
```

Commercial et Partenaire n'ont **pas accès** à cette fonctionnalité.

## 🔮 Évolutions Futures

### Phase 9 (Persistance DB)

- Ajouter colonnes `required_fields JSONB` et `reminder_config JSONB` dans `workflow_module_templates`
- Sauvegarder/Charger depuis Supabase
- Héritage multi-tenant (par `organization_id`)

### Améliorations UX

- Prévisualisation du formulaire avec champs requis surlignés
- Statistiques : % de formulaires validés, délai moyen
- Personnalisation du message de relance
- Relances multiples (J+1, J+3, J+7 en cascade)

### Backend Avancé

- Détection intelligente des champs critiques (IA suggère les champs requis)
- A/B testing des délais de relance (optimiser le taux de complétion)
- Escalade automatique si formulaire toujours incomplet après X relances

## ❓ FAQ

**Q : Que se passe-t-il si je ne définis aucun champ requis ?**  
R : Validation classique → Tous les champs du formulaire doivent être remplis.

**Q : La relance fonctionne-t-elle déjà ?**  
R : Non, c'est un mock. L'UI est prête, mais le backend doit implémenter l'envoi réel.

**Q : Puis-je avoir plusieurs formulaires avec des champs requis différents ?**  
R : Non en Phase 3 (sélection unique). Prévu pour Phase 9.

**Q : Le client peut-il désactiver les relances ?**  
R : Non, c'est configuré côté admin uniquement.

**Q : Comment tester cette fonctionnalité ?**  
R : En Phase 3, c'est visuel uniquement. Les données sont en mémoire (perdues au refresh).

---

**Date de création** : 30 janvier 2026  
**Version** : Workflow V2 - Phase 3 (Read-Only + Simulation)  
**Auteur** : GitHub Copilot
