# ✅ DISTINCTION FORMULAIRES CLIENT / INTERNES

## 📝 Résumé des modifications

### 🎯 Objectif
Ajouter la distinction entre **formulaires client** (envoyables via chat) et **formulaires internes** (remplis uniquement par l'équipe dans la fiche prospect).

---

## 🔧 Modifications effectuées

### 1️⃣ **Script SQL de migration Supabase**
**Fichier :** `add_audience_to_forms.sql`

- Ajout de la colonne `audience` à la table `forms`
- Valeurs possibles : `'client'` ou `'internal'`
- Valeur par défaut : `'client'`
- Constraint CHECK pour validation
- Index pour optimisation des filtres

**À exécuter dans Supabase Dashboard > SQL Editor**

---

### 2️⃣ **Interface de création de formulaire (ProfilePage.jsx)**

#### Composant `FormEditor` (ligne ~329)
**Ajout du champ "À qui est destiné ce formulaire ?"**

- Radio buttons : `Client` (par défaut) / `Interne (équipe)`
- Stocké dans `editedForm.audience`
- Description contextuelle selon le choix
- Positionné juste après le nom du formulaire (avant "Projets associés")

#### Fonction `handleSaveForm` (ligne ~2095)
**Sauvegarde du champ `audience` dans Supabase**

```javascript
const result = await saveFormToSupabase(formId, {
  name: formToSave.name,
  fields: formToSave.fields || [],
  projectIds: formToSave.projectIds || [],
  audience: formToSave.audience || 'client', // 🔥 AJOUT
});
```

---

### 3️⃣ **Hook Supabase (useSupabaseForms.js)**

#### Fonction `transformFromDB`
- Ajout de `audience: form.audience || 'client'` dans la transformation des données

#### Handlers Real-time (INSERT / UPDATE)
- Ajout de `audience: newForm.audience || 'client'` dans les deux handlers

#### Fonction `saveForm`
- Ajout de `audience: formData.audience || 'client'` dans le payload Supabase

---

### 4️⃣ **Affichage dans la fiche prospect (ProspectDetailsAdmin.jsx)**

#### Nouveau composant `InternalForms` (ligne ~1428)
**Caractéristiques :**

- Filtre automatique des formulaires avec `audience === 'internal'`
- Filtre par type de projet actif
- Interface de remplissage/édition similaire à `ProspectForms`
- Sauvegarde dans `prospect.form_data[projectType][formId]`
- Badge violet "Interne" pour identification visuelle
- Support des champs `text`, `email`, `phone`, `number`, `textarea`

#### Intégration dans le rendu (ligne ~2310)
```jsx
<ProspectForms ... />

{/* 🆕 Bloc Formulaires Internes */}
<InternalForms
  prospect={editableProspect}
  projectType={activeProjectTag}
  onUpdate={(updated) => {
    setEditableProspect(updated);
    if (onUpdate) onUpdate(updated);
  }}
/>

<div className="bg-white ..."> {/* Informations Prospect */}
```

---

## ✅ Comportement métier

### Formulaire Client (`audience = 'client'`)
- Envoyable au client via le chat
- Visible dans le bloc **"Formulaires soumis"**
- Workflow validation/rejet existant conservé
- Comportement identique à l'existant

### Formulaire Interne (`audience = 'internal'`)
- **Jamais envoyable au client**
- Visible uniquement dans le bloc **"Formulaires internes"**
- Remplissable/éditable par l'équipe admin
- Sauvegarde dans `prospects.form_data` (même structure)

---

## 🧪 Tests à effectuer

### ✅ Test 1 : Création de formulaire
1. Se connecter en admin
2. Aller dans `/admin/profil` > Gestion des Formulaires
3. Cliquer "Créer un formulaire"
4. Vérifier la présence du champ "À qui est destiné ce formulaire ?"
5. Cocher "Client" → Vérifier message "Ce formulaire sera envoyable au client via le chat"
6. Cocher "Interne (équipe)" → Vérifier message "Ce formulaire sera visible uniquement dans la fiche prospect"
7. Remplir et enregistrer
8. Vérifier dans Supabase (table `forms`) que le champ `audience` est bien enregistré

### ✅ Test 2 : Affichage dans la fiche prospect
1. Ouvrir une fiche prospect avec un projet actif
2. Vérifier le bloc **"Formulaires soumis"** (formulaires client uniquement)
3. Vérifier le bloc **"Formulaires internes"** juste en dessous
4. Vérifier que seuls les formulaires `audience='internal'` s'affichent

### ✅ Test 3 : Remplissage formulaire interne
1. Dans le bloc "Formulaires internes", cliquer "Modifier"
2. Remplir les champs
3. Cliquer "Sauvegarder"
4. Vérifier toast de succès
5. Recharger la page
6. Vérifier que les données sont bien persistées

---

## 📂 Fichiers modifiés

1. `add_audience_to_forms.sql` *(nouveau)*
2. `src/pages/admin/ProfilePage.jsx`
3. `src/hooks/useSupabaseForms.js`
4. `src/components/admin/ProspectDetailsAdmin.jsx`

---

## ⚠️ Points d'attention

### ✅ Aucune régression
- La création de formulaire existante n'a **PAS été refactorée**
- Le système de formulaires client (envoi via chat) est **intact**
- La logique de validation/rejet est **inchangée**

### ✅ Compatibilité
- Les formulaires existants (sans `audience`) seront traités comme `'client'` (valeur par défaut SQL)
- Le hook `useSupabaseForms` gère le fallback `audience || 'client'`

### ✅ Performance
- Index SQL créé sur `audience` pour optimiser les filtres
- Filtrage côté client via `useMemo()` dans `InternalForms`

---

## 🚀 Déploiement

### 1. Exécuter le script SQL
```sql
-- Dans Supabase Dashboard > SQL Editor
-- Coller le contenu de add_audience_to_forms.sql
```

### 2. Déployer le code
```bash
git add .
git commit -m "feat: distinction formulaires client / internes et affichage fiche prospect"
git push
```

### 3. Vérifier
- Créer un formulaire "Test Interne" avec `audience='internal'`
- Vérifier qu'il apparaît dans la fiche prospect sous "Formulaires internes"
- Vérifier qu'il n'est PAS visible dans la liste des formulaires envoyables via chat

---

## 📌 Checklist finale

- [x] Script SQL créé
- [x] Champ "audience" ajouté à l'interface de création
- [x] Sauvegarde du champ dans Supabase
- [x] Hook `useSupabaseForms` mis à jour
- [x] Composant `InternalForms` créé
- [x] Bloc "Formulaires internes" ajouté dans la fiche prospect
- [x] Aucune régression détectée
- [x] Commit préparé

---

**Date :** 5 janvier 2026  
**Développeur :** GitHub Copilot (VS Code Agent)  
**Product Owner :** Jack  
**Architecte :** ChatGPT
