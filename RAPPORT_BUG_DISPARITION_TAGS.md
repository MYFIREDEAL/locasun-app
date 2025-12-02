# 🔴 RAPPORT D'ANALYSE — BUG DISPARITION TAGS APRÈS FORMULAIRE CLIENT

**Date :** 2 décembre 2025  
**Gravité :** 🔴 CRITIQUE  
**Statut :** ✅ CAUSE IDENTIFIÉE — AUCUNE MODIFICATION EFFECTUÉE

---

## 📋 RÉSUMÉ EXÉCUTIF

### ❌ Symptôme
Après qu'un **client remplit un formulaire** dans son espace (`/dashboard`), **tous ses projets (tags) disparaissent** de Supabase.

### ✅ Cause exacte
**UPDATE DESTRUCTIF** dans `ClientFormPanel.jsx` ligne **183-189** qui envoie **UNIQUEMENT** `{ id, formData, form_data }` à la fonction `updateProspect()`, **SANS** inclure `tags`.

La RPC `update_own_prospect_profile()` utilise `COALESCE()` qui remplace `tags` par `NULL` quand `_data->'tags'` est absent.

---

## 🔍 ANALYSE DÉTAILLÉE

### 1️⃣ FICHIER RESPONSABLE

**Fichier :** `src/components/client/ClientFormPanel.jsx`  
**Fonction :** `handleSubmit()`  
**Lignes :** **183-189**

---

### 2️⃣ CODE PROBLÉMATIQUE

```javascript
// 🔥 FIX: Mettre à jour currentUser immédiatement pour que le client voit ses changements
// App.jsx updateProspect attend un objet avec id, pas (id, updates)
try {
  await updateProspect({ 
    id: prospectId,                    // ✅ OK
    formData: updatedFormData,         // ✅ OK
    form_data: updatedFormData         // ✅ OK
    // ❌ MANQUANT : tags
    // ❌ MANQUANT : name
    // ❌ MANQUANT : email
    // ❌ MANQUANT : phone
    // ❌ MANQUANT : company
    // ❌ MANQUANT : address
    // ❌ MANQUANT : status
    // ❌ MANQUANT : ownerId
    // ❌ MANQUANT : hasAppointment
    // ❌ MANQUANT : affiliateName
  });
  console.log('✅ [ClientFormPanel] currentUser mis à jour avec form_data:', updatedFormData);
} catch (err) {
  console.warn('⚠️ Erreur mise à jour currentUser (non bloquant):', err);
}
```

**❌ PROBLÈME :**  
L'objet envoyé contient **SEULEMENT 3 champs** : `id`, `formData`, `form_data`.  
**TOUS les autres champs sont ABSENTS** (dont `tags`).

---

### 3️⃣ CHAÎNE D'EXÉCUTION

#### Étape 1 : Transformation dans `useSupabaseProspects.js`

**Fichier :** `src/hooks/useSupabaseProspects.js`  
**Lignes :** **366-377**

```javascript
// Transformer les clés du format app vers le format DB
const dbUpdates = {};
if (updates.name !== undefined) dbUpdates.name = updates.name;
if (updates.email !== undefined) dbUpdates.email = updates.email;
if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
if (updates.company !== undefined) dbUpdates.company_name = updates.company;
if (updates.address !== undefined) dbUpdates.address = updates.address;
// ✅ Envoyer owner_id - la RPC update_prospect_safe gère les permissions selon le rôle
if (updates.ownerId !== undefined) dbUpdates.owner_id = updates.ownerId;
if (updates.status !== undefined) dbUpdates.status = updates.status;
if (updates.tags !== undefined) dbUpdates.tags = updates.tags; // ❌ JAMAIS DÉFINI
if (updates.hasAppointment !== undefined) dbUpdates.has_appointment = updates.hasAppointment;
if (updates.affiliateName !== undefined) dbUpdates.affiliate_name = updates.affiliateName;
if (updates.formData !== undefined) dbUpdates.form_data = updates.formData; // ✅ DÉFINI
```

**Résultat :**  
```javascript
dbUpdates = {
  form_data: { ... } // ✅ SEUL CHAMP PRÉSENT
  // ❌ tags: undefined (NON AJOUTÉ au dbUpdates)
}
```

---

#### Étape 2 : Appel RPC `update_own_prospect_profile()`

**Fichier :** `src/hooks/useSupabaseProspects.js`  
**Lignes :** **406-410**

```javascript
// 🔥 CLIENT : Utiliser update_own_prospect_profile (sans prospect_id)
console.log('🔍 [updateProspect] Mode CLIENT - RPC update_own_prospect_profile');
const result = await supabase.rpc('update_own_prospect_profile', {
  _data: dbUpdates // ❌ { form_data: {...} } SANS tags
});
```

**Payload envoyé à Supabase :**
```json
{
  "_data": {
    "form_data": {
      "ACC": {
        "form-123": {
          "field1": "value1",
          "field2": "value2"
        }
      }
    }
  }
}
```

**❌ ABSENCE TOTALE DE `tags` dans le payload**

---

#### Étape 3 : Exécution SQL destructive

**Fichier :** `supabase/functions/update_own_prospect_profile.sql`  
**Lignes :** **53-75**

```sql
-- 3. EFFECTUER LA MISE À JOUR (CHAMPS AUTORISÉS UNIQUEMENT)
RETURN QUERY
UPDATE public.prospects
SET
  name = COALESCE((_data->>'name'), name),
  email = COALESCE((_data->>'email'), email),
  phone = COALESCE((_data->>'phone'), phone),
  company_name = COALESCE((_data->>'company_name'), company_name),
  address = COALESCE((_data->>'address'), address),
  form_data = COALESCE((_data->'form_data')::JSONB, form_data),
  tags = COALESCE(
    ARRAY(SELECT jsonb_array_elements_text(_data->'tags')),
    tags
  ), -- ❌ DESTRUCTIF ICI !
  updated_at = NOW()
WHERE user_id = v_current_user_id
RETURNING *;
```

**❌ COMPORTEMENT DE `COALESCE()` :**

```sql
-- Si _data->'tags' est ABSENT (NULL)
COALESCE(
  ARRAY(SELECT jsonb_array_elements_text(NULL)), -- ❌ Retourne []
  tags                                             -- ❌ IGNORÉ car premier argument non-NULL
)
-- RÉSULTAT : tags = [] (TABLEAU VIDE)
```

**⚠️ LOGIQUE COALESCE :**
- `COALESCE(A, B)` retourne **le premier argument NON NULL**
- `ARRAY(SELECT ... FROM NULL)` retourne `[]` (tableau vide), **PAS NULL**
- Donc `COALESCE([], ['ACC', 'Centrale'])` retourne `[]` ✅ (premier non-NULL)
- **Les tags existants sont ÉCRASÉS par un tableau vide** 🔴

---

## 🧪 PREUVE AVEC PSEUDO-PAYLOAD

### Avant la soumission du formulaire

**État Supabase (`prospects` table) :**
```json
{
  "id": "prospect-uuid-123",
  "name": "Georges Client",
  "email": "georges@example.com",
  "tags": ["ACC", "Centrale", "Autonomie"], // ✅ 3 projets
  "form_data": {},
  "status": "Qualifié",
  "owner_id": "admin-uuid-456"
}
```

---

### Après la soumission du formulaire

**1. Client remplit formulaire ACC**

**2. `ClientFormPanel.jsx` appelle :**
```javascript
updateProspect({ 
  id: "prospect-uuid-123",
  formData: { ACC: { "form-rib": { iban: "FR76..." } } },
  form_data: { ACC: { "form-rib": { iban: "FR76..." } } }
  // ❌ tags ABSENT
});
```

**3. `useSupabaseProspects.js` transforme en :**
```javascript
dbUpdates = {
  form_data: { ACC: { "form-rib": { iban: "FR76..." } } }
  // ❌ tags: undefined (NON inclus)
};
```

**4. RPC reçoit :**
```json
{
  "_data": {
    "form_data": {
      "ACC": {
        "form-rib": {
          "iban": "FR76..."
        }
      }
    }
  }
}
```

**5. SQL exécute :**
```sql
UPDATE prospects
SET
  form_data = '{"ACC": {"form-rib": {"iban": "FR76..."}}}'::jsonb, -- ✅ OK
  tags = COALESCE(
    ARRAY(SELECT jsonb_array_elements_text(NULL)), -- ❌ Retourne []
    ARRAY['ACC', 'Centrale', 'Autonomie']          -- ❌ IGNORÉ
  ) -- RÉSULTAT: tags = []
WHERE user_id = 'client-uuid-789';
```

**6. État Supabase APRÈS UPDATE :**
```json
{
  "id": "prospect-uuid-123",
  "name": "Georges Client",
  "email": "georges@example.com",
  "tags": [], // 🔴 VIDE ! Projets disparus
  "form_data": { "ACC": { "form-rib": { "iban": "FR76..." } } },
  "status": "Qualifié",
  "owner_id": "admin-uuid-456"
}
```

**🔴 RÉSULTAT : TOUS LES PROJETS ONT DISPARU**

---

## 🎯 POURQUOI ÇA ARRIVE APRÈS UN FORMULAIRE CLIENT

### Contexte d'utilisation

1. **Admin envoie un formulaire au client** (via Charly AI)
2. **Client remplit le formulaire** dans son espace `/dashboard`
3. **`ClientFormPanel.jsx` soumet les données**
4. **Appel `updateProspect()`** avec **SEULEMENT `form_data`**
5. **RPC `update_own_prospect_profile()`** écrase `tags` avec `[]`

### Pourquoi seulement côté client ?

**Admin :** Utilise `update_prospect_safe()` (RPC différente, possiblement sans `COALESCE` destructif sur `tags`)

**Client :** Utilise `update_own_prospect_profile()` qui a la logique `COALESCE()` destructive

---

## 📊 COMPARAISON AVANT/APRÈS

| Champ | Avant formulaire | Après formulaire | Changement |
|-------|------------------|------------------|------------|
| `id` | `prospect-uuid-123` | `prospect-uuid-123` | ✅ Inchangé |
| `name` | `"Georges Client"` | `"Georges Client"` | ✅ Inchangé |
| `email` | `"georges@example.com"` | `"georges@example.com"` | ✅ Inchangé |
| `tags` | `["ACC", "Centrale", "Autonomie"]` | `[]` | 🔴 **PERDU** |
| `form_data` | `{}` | `{ "ACC": {...} }` | ✅ Ajouté |
| `status` | `"Qualifié"` | `"Qualifié"` | ✅ Inchangé |
| `owner_id` | `"admin-uuid-456"` | `"admin-uuid-456"` | ✅ Inchangé |

---

## 🔬 LOGS CONSOLE ATTENDUS

### Avant update
```javascript
🔍 [updateProspect] idOrProspect: object { id: "prospect-uuid-123", formData: {...}, form_data: {...} }
🔍 [updateProspect] updatesParam: undefined
🔍 [updateProspect] Mode objet complet
🔍 [updateProspect] Updates reçus: { id: "prospect-uuid-123", formData: {...}, form_data: {...} }
🔍 [updateProspect] dbUpdates (snake_case): { form_data: {...} }
🔍 [updateProspect] Mode CLIENT - RPC update_own_prospect_profile
```

### Après update (Supabase query result)
```javascript
✅ [updateProspect] RPC Success: [
  {
    id: "prospect-uuid-123",
    name: "Georges Client",
    tags: [], // 🔴 VIDE !
    form_data: { ACC: {...} },
    ...
  }
]
```

---

## 🧩 STRUCTURE OBJET ENVOYÉ (DÉTAILLÉE)

### Objet JavaScript envoyé par `ClientFormPanel.jsx`

```javascript
{
  id: "prospect-uuid-123",              // ✅ Présent
  formData: {                           // ✅ Présent
    "ACC": {
      "form-rib-acc": {
        "iban": "FR76...",
        "bic": "BNPAFRPP"
      }
    }
  },
  form_data: {                          // ✅ Présent (doublon)
    "ACC": {
      "form-rib-acc": {
        "iban": "FR76...",
        "bic": "BNPAFRPP"
      }
    }
  }
  // ❌ MANQUANTS :
  // tags: undefined
  // name: undefined
  // email: undefined
  // phone: undefined
  // company: undefined
  // address: undefined
  // status: undefined
  // ownerId: undefined
  // hasAppointment: undefined
  // affiliateName: undefined
}
```

---

### Objet transformé en `dbUpdates` (snake_case)

```javascript
{
  form_data: {                          // ✅ Présent
    "ACC": {
      "form-rib-acc": {
        "iban": "FR76...",
        "bic": "BNPAFRPP"
      }
    }
  }
  // ❌ TOUS LES AUTRES CHAMPS ABSENTS
  // Car conditions `if (updates.field !== undefined)` sont false
}
```

---

### Objet JSONB envoyé à la RPC

```json
{
  "_data": {
    "form_data": {
      "ACC": {
        "form-rib-acc": {
          "iban": "FR76...",
          "bic": "BNPAFRPP"
        }
      }
    }
  }
}
```

**❌ Absence totale de `tags` dans le JSONB `_data`**

---

## 🔴 CONFIRMATION : UPDATE DESTRUCTIF

### ✅ OUI, c'est un UPDATE DESTRUCTIF

| Critère | Détection | Preuve |
|---------|-----------|--------|
| **Champs manquants** | ✅ OUI | `tags` absent de l'objet envoyé |
| **COALESCE destructif** | ✅ OUI | `ARRAY(SELECT ... FROM NULL)` retourne `[]`, pas `NULL` |
| **Écrasement** | ✅ OUI | `tags` passe de `["ACC", "Centrale"]` à `[]` |
| **Perte de données** | ✅ OUI | Client perd tous ses projets |
| **Bug reproductible** | ✅ OUI | 100% du temps après soumission formulaire |

---

## 🧪 COMMENT REPRODUIRE LE BUG

### Étapes de reproduction

1. **Créer un prospect admin** avec tags `["ACC", "Centrale", "Autonomie"]`
2. **Lier le prospect à un user auth** (inscription client)
3. **Admin envoie un formulaire ACC** via Charly AI
4. **Client se connecte** à `/dashboard`
5. **Client remplit et soumet le formulaire**
6. **Observer Supabase** : `tags` devient `[]`

### Commande SQL de vérification

```sql
-- Avant soumission
SELECT id, name, tags, form_data 
FROM prospects 
WHERE email = 'georges@example.com';

-- Résultat attendu :
-- id                | name           | tags                          | form_data
-- prospect-uuid-123 | Georges Client | {ACC,Centrale,Autonomie}      | {}

-- Après soumission
SELECT id, name, tags, form_data 
FROM prospects 
WHERE email = 'georges@example.com';

-- Résultat BUGUÉ :
-- id                | name           | tags | form_data
-- prospect-uuid-123 | Georges Client | {}   | {"ACC": {"form-rib-acc": {...}}}
```

---

## 📂 FICHIERS IMPLIQUÉS (RÉSUMÉ)

| Fichier | Rôle | Lignes critiques |
|---------|------|------------------|
| **`src/components/client/ClientFormPanel.jsx`** | 🔴 **SOURCE DU BUG** | **183-189** (appel `updateProspect()` partiel) |
| `src/hooks/useSupabaseProspects.js` | Transformation camelCase → snake_case | 366-377 (conditions `if (updates.field !== undefined)`) |
| `supabase/functions/update_own_prospect_profile.sql` | 🔴 **UPDATE SQL DESTRUCTIF** | **64-72** (logique `COALESCE()` incorrecte) |

---

## 🎯 CAUSE RACINE (ROOT CAUSE)

### Problème #1 : Objet incomplet dans `ClientFormPanel.jsx`

**Ligne 183-189 :**  
Envoie **SEULEMENT** `{ id, formData, form_data }` au lieu de **TOUT l'objet prospect**.

**Impact :**  
Tous les champs absents (dont `tags`) sont transformés en `undefined` → non inclus dans `dbUpdates`.

---

### Problème #2 : Logique `COALESCE()` destructive dans SQL

**Ligne 64-72 de `update_own_prospect_profile.sql` :**

```sql
tags = COALESCE(
  ARRAY(SELECT jsonb_array_elements_text(_data->'tags')), -- ❌ Retourne [] si _data->'tags' est NULL
  tags                                                     -- ❌ IGNORÉ car [] est non-NULL
)
```

**Logique incorrecte :**
- `ARRAY(SELECT ... FROM NULL)` retourne `[]` (pas `NULL`)
- `COALESCE([], ['ACC'])` retourne `[]` (premier non-NULL)
- **Les tags existants sont écrasés**

**Logique correcte attendue :**
```sql
tags = CASE 
  WHEN _data ? 'tags' THEN ARRAY(SELECT jsonb_array_elements_text(_data->'tags'))
  ELSE tags
END
```

---

## 📊 TABLEAU DE DIAGNOSTIC

| Élément | État | Cause |
|---------|------|-------|
| **form_data mis à jour** | ✅ OK | Champ inclus dans l'objet envoyé |
| **tags perdus** | 🔴 BUG | Champ absent → `COALESCE()` destructif |
| **name, email, phone préservés** | ✅ OK | `COALESCE(NULL, current_value)` retourne `current_value` |
| **RLS policies** | ✅ OK | Pas de problème RLS |
| **Real-time sync** | ✅ OK | Fonctionne correctement |

---

## 🔬 ANALYSE DU `COALESCE()` POSTGRESQL

### Comportement attendu vs réel

```sql
-- CAS 1 : _data->'tags' est PRÉSENT
SELECT COALESCE(
  ARRAY(SELECT jsonb_array_elements_text('["Solar", "Wind"]'::jsonb)),
  ARRAY['ACC', 'Centrale']
);
-- RÉSULTAT : {"Solar", "Wind"} ✅ OK

-- CAS 2 : _data->'tags' est NULL (ABSENT du JSONB)
SELECT COALESCE(
  ARRAY(SELECT jsonb_array_elements_text(NULL)),
  ARRAY['ACC', 'Centrale']
);
-- RÉSULTAT ATTENDU : {"ACC", "Centrale"}
-- RÉSULTAT RÉEL : {} 🔴 BUG !
-- RAISON : ARRAY(SELECT ... FROM NULL) retourne [], pas NULL
```

### Explication technique

```sql
-- ARRAY(SELECT ...) retourne TOUJOURS un tableau, jamais NULL
SELECT ARRAY(SELECT jsonb_array_elements_text(NULL));
-- Résultat : {} (tableau vide, PAS NULL)

-- COALESCE retourne le premier argument NON NULL
SELECT COALESCE('{}', '{ACC, Centrale}');
-- Résultat : {} (premier est non-NULL, donc retourné)
```

**⚠️ Erreur de conception :**  
Le développeur a cru que `ARRAY(SELECT ... FROM NULL)` retournerait `NULL`, mais PostgreSQL retourne `[]`.

---

## 🎯 CONCLUSION FINALE

### ✅ CONFIRMATION DU BUG

| Question | Réponse |
|----------|---------|
| **Y a-t-il un bug ?** | ✅ **OUI** |
| **Est-ce un UPDATE destructif ?** | ✅ **OUI** |
| **Quel fichier est responsable ?** | `ClientFormPanel.jsx` ligne **183-189** |
| **Quelle ligne efface les tags ?** | `update_own_prospect_profile.sql` ligne **64-72** |
| **Pourquoi après un formulaire client ?** | Objet `updateProspect()` incomplet + `COALESCE()` destructif |
| **Pourquoi Supabase écrase les autres champs ?** | `ARRAY(SELECT ... FROM NULL)` retourne `[]` au lieu de `NULL` |

---

### 🔴 GRAVITÉ

**Impact :** 🔴 **CRITIQUE**  
- ✅ Perte de données utilisateur (tous les projets)
- ✅ Bug silencieux (pas d'erreur visible)
- ✅ 100% reproductible
- ✅ Affecte tous les clients qui remplissent un formulaire

**Urgence :** 🔥 **IMMÉDIATE**

---

## 📌 PROCHAINES ÉTAPES (NON EFFECTUÉES)

### Option 1 : Fix minimal (côté JavaScript)

**Fichier :** `src/components/client/ClientFormPanel.jsx`  
**Ligne 183-189 :**

```javascript
// ❌ AVANT (BUG)
await updateProspect({ 
  id: prospectId,
  formData: updatedFormData,
  form_data: updatedFormData 
});

// ✅ APRÈS (FIX)
await updateProspect({ 
  id: prospectId,
  name: currentUser.name,              // ✅ Ajouter
  email: currentUser.email,            // ✅ Ajouter
  phone: currentUser.phone,            // ✅ Ajouter
  company: currentUser.company,        // ✅ Ajouter
  address: currentUser.address,        // ✅ Ajouter
  tags: currentUser.tags,              // 🔥 CRITIQUE
  status: currentUser.status,          // ✅ Ajouter
  ownerId: currentUser.ownerId,        // ✅ Ajouter
  hasAppointment: currentUser.hasAppointment, // ✅ Ajouter
  affiliateName: currentUser.affiliateName,   // ✅ Ajouter
  formData: updatedFormData,           // ✅ Déjà présent
  form_data: updatedFormData           // ✅ Déjà présent
});
```

---

### Option 2 : Fix SQL (côté RPC)

**Fichier :** `supabase/functions/update_own_prospect_profile.sql`  
**Ligne 64-72 :**

```sql
-- ❌ AVANT (BUG)
tags = COALESCE(
  ARRAY(SELECT jsonb_array_elements_text(_data->'tags')),
  tags
)

-- ✅ APRÈS (FIX)
tags = CASE 
  WHEN _data ? 'tags' THEN ARRAY(SELECT jsonb_array_elements_text(_data->'tags'))
  ELSE tags
END
```

---

### Option 3 : Fix complet (les deux)

Combiner **Option 1** ET **Option 2** pour sécurité maximale.

---

## ⚠️ VALIDATION DES RÈGLES

✅ **Aucun code modifié** (analyse pure)  
✅ **Aucun fichier supprimé**  
✅ **Aucun fix implémenté**  
✅ **Cause exacte identifiée**  
✅ **Fonction responsable documentée**  
✅ **Ligne exacte précisée**  
✅ **Structure objet détaillée**  
✅ **Preuve avec pseudo-payload**  
✅ **Conclusion claire : OUI, bug UPDATE destructif**  

---

**📝 FIN DU RAPPORT D'ANALYSE**

_Analyse complète terminée — 2 décembre 2025_
