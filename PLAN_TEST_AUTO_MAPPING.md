# 🧪 PLAN DE TEST AUTO-MAPPING

## Contexte
Système d'auto-mapping qui charge dynamiquement les formulaires depuis Supabase et mappe automatiquement les champs aux variables de contrat PDF.

## Pré-requis
1. Serveur de développement démarré (`npm run dev`)
2. Console navigateur ouverte (F12)
3. Prospect Eva (eva.ongoriaz@yopmail.com) avec données formulaire
4. Formulaire `form-1768488893344` existant dans la table `forms`

---

## TEST 1: Vérification Base de Données

### Objectif
Confirmer que le formulaire existe dans Supabase et contient les bonnes définitions de champs.

### Étapes
1. Ouvrir Supabase Dashboard → SQL Editor
2. Copier et exécuter le contenu de `test_auto_mapping_eva.sql`
3. Vérifier les résultats

### Résultats attendus

**Query #1** - Le formulaire existe :
```
form_id: form-1768488893344
name: LOCATION DE TOITURE (ou similaire)
nb_champs: > 0
fields: [array de champs avec id, label, type]
```

**Query #2** - Les labels des champs :
```
field-1768488880462-0-e6e3qhc | label: "Prénom du client"
field-1768488880462-3-ym008qx | label: "Téléphone du client"
...autres champs
```

**Query #4** - Les données d'Eva :
```
field-1768488880462-0-e6e3qhc | Eva
field-1768488880462-3-ym008qx | 0757485748
```

---

## TEST 2: Chargement du Hook useSupabaseForms

### Objectif
Vérifier que le hook charge correctement tous les formulaires au démarrage.

### Étapes
1. Ouvrir l'application (`npm run dev`)
2. Se connecter en tant qu'admin
3. Ouvrir la fiche d'un prospect (par exemple Eva)
4. Ouvrir la console navigateur
5. Taper : `window.supabaseForms` ou inspecter le state React

### Résultats attendus
```javascript
{
  "form-1768488893344": {
    id: "form-1768488893344",
    name: "LOCATION DE TOITURE",
    fields: [
      {
        id: "field-1768488880462-0-e6e3qhc",
        label: "Prénom du client",
        type: "text",
        required: true
      },
      {
        id: "field-1768488880462-3-ym008qx",
        label: "Téléphone du client",
        type: "phone",
        required: true
      }
      // ...autres champs
    ]
  }
}
```

---

## TEST 3: Auto-Mapping des Champs

### Objectif
Vérifier que le système mappe automatiquement les champs lors de la génération du contrat.

### Étapes
1. Ouvrir la fiche prospect d'Eva
2. Aller dans l'onglet du projet "ACC" (ou celui avec le workflow LOCATION DE TOITURE)
3. Compléter l'étape qui déclenche l'action `start_signature`
4. Observer les logs dans la console

### Résultats attendus

**Log 1** - Chargement du formulaire :
```
🎯 AUTO-MAPPING: Formulaire trouvé dans Supabase
{
  formId: "form-1768488893344",
  formName: "LOCATION DE TOITURE",
  fieldsCount: X
}
```

**Log 2** - Mapping des champs généraux :
```
✅ Mapping auto: "Prénom du client" → client_firstname (field-1768488880462-0-e6e3qhc)
✅ Mapping auto: "Téléphone du client" → client_phone (field-1768488880462-3-ym008qx)
✅ Mapping auto: "Email du client" → client_email (field-xxx)
...autres mappings
```

**Log 3** - Résumé auto-mapping :
```
🎯 AUTO-MAPPING TERMINÉ
{
  generalMappingsCount: X,
  repeatableMappingsCount: Y,
  autoGeneralFieldMappings: {
    "field-1768488880462-0-e6e3qhc": "client_firstname",
    "field-1768488880462-3-ym008qx": "client_phone",
    ...
  },
  autoFieldMappings: {
    // Champs des co-signataires si applicable
  }
}
```

**Log 4** - Extraction des données :
```
📋 Données générales extraites
{
  generalData: {
    client_firstname: "Eva",
    client_phone: "0757485748",
    ...
  },
  usedAutoMapping: true
}
```

**Log 5** - Co-signataires (si applicable) :
```
✅ Co-signataires extraits
{
  count: N,
  cosigners: [
    {
      cosigner_name_1: "...",
      cosigner_phone_1: "...",
      ...
    }
  ],
  usedAutoMapping: true
}
```

---

## TEST 4: Génération du PDF

### Objectif
Vérifier que le PDF généré contient les bonnes données extraites via auto-mapping.

### Étapes
1. Après avoir complété l'étape de signature (TEST 3)
2. Attendre la génération du PDF
3. Télécharger le PDF généré
4. Ouvrir le PDF et vérifier les champs

### Résultats attendus

**Dans le PDF** :
- **Prénom** : "Eva" (et non vide)
- **Téléphone** : "0757485748" (et non vide)
- **Email** : "eva.ongoriaz@yopmail.com" (si mappé)
- Tous les autres champs mappés doivent contenir leurs valeurs

**Si un champ est vide** :
1. Vérifier que la donnée existe dans `form_data` (Query #4)
2. Vérifier le log "Mapping auto" pour ce champ
3. Vérifier le log "Données générales extraites"
4. Si le mapping a échoué, vérifier `findVariableByLabel()` pour ce label

---

## TEST 5: Fallback sur Config Manuelle

### Objectif
Vérifier que le système utilise la config manuelle si l'auto-mapping échoue.

### Étapes
1. Créer un workflow avec `generalFieldMappings` configuré manuellement
2. Renommer temporairement le `formId` dans le workflow pour qu'il ne trouve pas le formulaire
3. Générer le contrat
4. Observer les logs

### Résultats attendus

**Log 1** - Formulaire non trouvé :
```
⚠️ Formulaire non trouvé dans Supabase, utilisation des mappings manuels
{
  formId: "form-inexistant",
  availableForms: ["form-1768488893344", ...]
}
```

**Log 2** - Utilisation config manuelle :
```
📋 Données générales extraites
{
  generalData: { ... },
  usedAutoMapping: false
}
```

---

## TEST 6: Champs Sans Mapping

### Objectif
Vérifier le comportement quand un champ du formulaire n'a pas de correspondance dans `CONTRACT_VARIABLES`.

### Étapes
1. Créer un formulaire avec un champ au label unique (ex: "Champ test sans correspondance")
2. Remplir ce champ dans le formulaire client
3. Générer le contrat
4. Observer les logs

### Résultats attendus

**Log warning** :
```
⚠️ Pas de mapping trouvé pour: "Champ test sans correspondance" (field-xxx)
```

**Résultat** :
- Le champ est ignoré (ne provoque pas d'erreur)
- Les autres champs sont mappés normalement
- Le PDF est généré avec les champs mappés

---

## Critères de Succès Globaux

✅ **RÉUSSI** si :
1. Le formulaire est chargé depuis Supabase
2. Tous les champs avec labels reconnus sont mappés automatiquement
3. Les logs montrent `usedAutoMapping: true`
4. Le PDF contient les données du formulaire
5. Aucune erreur JavaScript dans la console
6. Le fallback sur config manuelle fonctionne

❌ **ÉCHOUÉ** si :
1. Erreur "Cannot read property 'fields' of undefined"
2. `autoGeneralFieldMappings` est vide alors que le formulaire existe
3. Le PDF a des champs vides alors que les données existent
4. Le système ne fallback pas sur la config manuelle

---

## Debugging

### Si auto-mapping ne fonctionne pas :

1. **Vérifier que `useSupabaseForms` charge les formulaires** :
   ```javascript
   console.log('Forms loaded:', Object.keys(supabaseForms));
   ```

2. **Vérifier que le `formId` correspond** :
   ```javascript
   console.log('Looking for formId:', config.formId);
   console.log('Available forms:', Object.keys(supabaseForms));
   ```

3. **Vérifier `findVariableByLabel`** :
   ```javascript
   console.log(findVariableByLabel("Prénom du client")); // Devrait retourner "client_firstname"
   ```

4. **Vérifier les données `form_data`** :
   ```sql
   SELECT form_data->'ACC'->'form-1768488893344' 
   FROM prospects 
   WHERE email = 'eva.ongoriaz@yopmail.com';
   ```

---

## Checklist Finale

Avant de considérer le test complet :

- [ ] Query SQL #1 : Formulaire existe
- [ ] Query SQL #2 : Labels des champs corrects
- [ ] Query SQL #4 : Données Eva présentes
- [ ] Console : `supabaseForms` chargé
- [ ] Console : Logs "AUTO-MAPPING: Formulaire trouvé"
- [ ] Console : Logs "✅ Mapping auto" pour chaque champ
- [ ] Console : Log "AUTO-MAPPING TERMINÉ" avec counts > 0
- [ ] Console : Log "usedAutoMapping: true"
- [ ] PDF : Champs remplis (pas vides)
- [ ] Aucune erreur JavaScript

**Si tous les points sont cochés → AUTO-MAPPING FONCTIONNE CORRECTEMENT ✅**
