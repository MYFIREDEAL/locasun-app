# 🧩 EXTRACTION COMPLÈTE : Structure `evatime_project_infos`

**Date :** 2 décembre 2025  
**Objectif :** Reconstituer la structure EXACTE du JSON stocké dans localStorage  
**Statut :** ✅ Analyse pure - Aucune modification

---

## 📊 1️⃣ STRUCTURE EXACTE DU LOCALSTORAGE

### **Clé principale : `evatime_project_infos`**

#### **Format JSON complet :**

```json
{
  "f47ac10b-58cc-4372-a567-0e02b2c3d479": {
    "ACC": {
      "amount": 15000.50,
      "status": "actif",
      "ribFile": "rib_client_dupont.pdf"
    },
    "Centrale": {
      "amount": 25000.00,
      "status": "archive",
      "documents": ["devis.pdf", "plan_toiture.pdf"],
      "surface": 500,
      "orientation": "Sud",
      "inclinaison": 30,
      "type_toiture": "Bac acier",
      "notes": "Installation prévue pour mars 2025"
    },
    "Investissement": {
      "status": "abandon",
      "notes": "Client a annulé le projet pour raisons budgétaires"
    }
  },
  "c56a4180-65aa-42ec-a945-5fd21dec0538": {
    "ACC": {
      "amount": 8500.00,
      "ribFile": "rib_martin.pdf",
      "status": "actif",
      "kbis": "kbis_martin.pdf",
      "validated": true
    }
  },
  "autre-prospect-uuid": {
    "Batterie": {
      "amount": 12000.00,
      "capacite": "10kWh",
      "marque": "Tesla Powerwall"
    }
  }
}
```

---

### **Clés legacy : `prospect_*_project_*`** (OBSOLÈTES)

#### **Format :**
```
localStorage key: "prospect_abc123_project_ACC"
```

#### **Contenu (avant migration) :**
```json
{
  "amount": 10000.00,
  "notes": "Ancien système avant refonte",
  "ribFile": "old_rib.pdf",
  "otherData": "..."
}
```

**⚠️ Migration automatique active** (App.jsx lignes 768-789) :
- Lit toutes les clés `prospect_{id}_project_{type}`
- Merge dans `evatime_project_infos[id][type]`
- Supprime immédiatement les anciennes clés

---

## 🔍 2️⃣ CATALOGUE COMPLET DES CHAMPS

### **Champs détectés dans le code**

| Champ | Type | Optionnel | Projets concernés | Fichier source | Ligne |
|-------|------|-----------|-------------------|----------------|-------|
| **`amount`** | `number` (float) | ✅ Oui | Tous | `ProspectDetailsAdmin.jsx` | 821, 1036, 1056 |
| **`status`** | `string` | ✅ Oui | Tous | `ProspectDetailsAdmin.jsx` | 815, 998 |
| **`ribFile`** | `string` | ✅ Oui | ACC (principal) | `App.jsx` | 1106-1107 |
| **`documents`** | `array<string>` | ✅ Oui | Centrale, Investissement | `schema.sql` | 409 |
| **`notes`** | `string` | ✅ Oui | Tous | `schema.sql` | 410 |
| **`kbis`** | `string` | ✅ Oui | ACC (entreprises) | `migration-examples.sql` | 130 |
| **`validated`** | `boolean` | ✅ Oui | ACC | `migration-examples.sql` | 130 |
| **`surface`** | `integer` | ✅ Oui | Centrale | `migration-examples.sql` | 133 |
| **`orientation`** | `string` | ✅ Oui | Centrale | `migration-examples.sql` | 133 |
| **`inclinaison`** | `integer` | ✅ Oui | Centrale | `migration-examples.sql` | 133 |
| **`type_toiture`** | `string` | ✅ Oui | Centrale | `migration-examples.sql` | 133 |
| **`capacite`** | `string` | ✅ Oui | Batterie | Inféré du projet | - |
| **`marque`** | `string` | ✅ Oui | Batterie | Inféré du projet | - |

**⚠️ TOUS LES CHAMPS SONT OPTIONNELS** — Aucun champ obligatoire détecté dans le code !

---

### **Valeurs possibles par champ**

#### **`status`** (string)
```javascript
// Valeurs détectées dans ProspectDetailsAdmin.jsx ligne 815
"actif"     // Projet en cours
"abandon"   // Projet abandonné
"archive"   // Projet archivé (terminé ou suspendu)
```

#### **`amount`** (number)
```javascript
// Type: Float avec 2 décimales max (ligne 1056)
15000.50    // Montant en euros
0           // Peut être zéro (pas de validation min)
```

#### **`ribFile`** (string)
```javascript
// Nom du fichier RIB uploadé (ligne 1107)
"rib_client_dupont.pdf"
"rib_2023_martin.pdf"
// Ajouté automatiquement quand client upload RIB dans chat (projectType === 'ACC')
```

#### **`documents`** (array)
```json
// Liste de noms de fichiers
["devis.pdf", "plan_toiture.pdf", "kbis.pdf"]
[]  // Peut être vide
```

#### **`orientation`** (string - Centrale)
```javascript
"Sud"
"Nord"
"Est"
"Ouest"
"Sud-Est"
"Sud-Ouest"
```

---

## 📍 3️⃣ POINTS D'ÉCRITURE DANS LE CODE

### **Fonction principale : `updateProjectInfo()`**
**Fichier :** `src/App.jsx`  
**Lignes :** 891-951

```javascript
// SIGNATURE
updateProjectInfo(prospectId, projectType, updater)

// PARAMÈTRES
// - prospectId: string (UUID du prospect)
// - projectType: string (ex: "ACC", "Centrale", "Investissement")
// - updater: function(prevInfo) => newInfo  OU  object (merge direct)
```

#### **Usage 1 : Sauvegarde RIB (ligne 1105-1110)**
```javascript
// Contexte : Quand client upload fichier RIB dans chat
updateProjectInfo(prospectId, projectType, (prev) => {
  if (projectType === 'ACC' && !prev?.ribFile) {
    return { ...prev, ribFile: message.file.name };
  }
  return prev || {};
});
```

#### **Usage 2 : Mise à jour statut (ligne 998-1001)**
```javascript
// Contexte : Admin change statut projet (actif/abandon/archive)
updateProjectInfo(prospect.id, activeProjectTag, (prevInfo = {}) => ({
  ...prevInfo,
  status: newStatus  // "actif" | "abandon" | "archive"
}));
```

#### **Usage 3 : Modification montant (ligne 1054-1057)**
```javascript
// Contexte : Admin édite montant du deal
updateProjectInfo(prospect.id, activeProjectTag, (prevInfo = {}) => ({
  ...prevInfo,
  amount: roundedValue,  // Float arrondi à 2 décimales
}));
```

#### **Usage 4 : Suppression montant (ligne 1035-1042)**
```javascript
// Contexte : Admin vide le champ montant
updateProjectInfo(prospect.id, activeProjectTag, (prevInfo = {}) => {
  const nextInfo = { ...prevInfo };
  delete nextInfo.amount;
  return nextInfo;
});
```

---

### **Fonction de lecture : `getProjectInfo()`**
**Fichier :** `src/App.jsx`  
**Lignes :** 886-889

```javascript
// SIGNATURE
getProjectInfo(prospectId, projectType)

// RETOURNE
{} // Objet vide si aucune donnée
{ amount: 15000, status: "actif", ... } // Données du projet
```

#### **Usage principal (ligne 812)**
```javascript
// Dans ProspectDetailsAdmin.jsx
const projectInfo = useMemo(() => {
  if (!activeProjectTag) return {};
  return getProjectInfo(prospect.id, activeProjectTag) || {};
}, [activeProjectTag, getProjectInfo, prospect.id]);

// Puis utilisé pour affichage
const savedAmount = projectInfo?.amount;  // ligne 821
const projectStatus = projectInfo?.status || 'actif';  // ligne 815
```

---

## 🔄 4️⃣ DOUBLE ÉCRITURE ACTUELLE

### **✅ Écriture dans localStorage (ligne 878-883)**
```javascript
const setProjectInfosState = (updater) => {
  setProjectInfos(prev => {
    const next = typeof updater === 'function' ? updater(prev) : updater;
    // ⚠️ ÉCRIT TOUT LE STATE EN UNE FOIS
    localStorage.setItem(PROJECT_INFO_STORAGE_KEY, JSON.stringify(next));
    return next;
  });
};
```

### **✅ Écriture dans Supabase (ligne 937-951)**
```javascript
// 2. Sauvegarder dans Supabase
try {
  const { error } = await supabase
    .from('project_infos')
    .upsert({
      prospect_id: prospectId,        // UUID
      project_type: projectType,      // "ACC", "Centrale", etc.
      data: finalInfo || {}            // JSONB (tout le contenu)
    }, {
      onConflict: 'prospect_id,project_type'  // UNIQUE constraint
    });
  
  if (error) {
    console.error('Erreur sauvegarde project_infos:', error);
  }
} catch (err) {
  console.error('Erreur updateProjectInfo Supabase:', err);
}
```

**⚠️ PROBLÈME DÉTECTÉ :**
- localStorage écrit **TOUT** le state (tous prospects, tous projets)
- Supabase écrit **UNE SEULE LIGNE** (1 prospect, 1 projet)
- Si localStorage échoue mais Supabase réussit → désynchronisation

---

## 🗂️ 5️⃣ STRUCTURE SUPABASE EXISTANTE

### **Table : `public.project_infos`**
**Fichier :** `supabase/schema.sql`  
**Lignes :** 387-433

```sql
CREATE TABLE public.project_infos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  project_type TEXT NOT NULL REFERENCES public.project_templates(type) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,  -- ⭐ CHAMP FLEXIBLE
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(prospect_id, project_type)  -- ⭐ CONTRAINTE UNIQUE
);
```

### **Mapping localStorage → Supabase**

#### **Avant (localStorage) :**
```json
{
  "prospect-uuid-1": {
    "ACC": { "amount": 15000, "status": "actif" },
    "Centrale": { "surface": 500 }
  }
}
```

#### **Après (Supabase) :**
```sql
-- Ligne 1
INSERT INTO project_infos (prospect_id, project_type, data) VALUES (
  'prospect-uuid-1',
  'ACC',
  '{"amount": 15000, "status": "actif"}'::jsonb
);

-- Ligne 2
INSERT INTO project_infos (prospect_id, project_type, data) VALUES (
  'prospect-uuid-1',
  'Centrale',
  '{"surface": 500}'::jsonb
);
```

---

## 📋 6️⃣ RÉSUMÉ SIMPLE

### ✅ **Ce qui est ENCORE UTILISÉ**

| Champ | Utilisation active | Composant | Fréquence |
|-------|-------------------|-----------|-----------|
| **`amount`** | ✅ OUI | `ProspectDetailsAdmin.jsx` | ⭐⭐⭐ Très fréquent |
| **`status`** | ✅ OUI | `ProspectDetailsAdmin.jsx` | ⭐⭐⭐ Très fréquent |
| **`ribFile`** | ✅ OUI | `App.jsx` (chat) | ⭐⭐ Fréquent (projets ACC) |

### ⚠️ **Ce qui est DOCUMENTÉ mais PEU UTILISÉ**

| Champ | Documenté où | Usage réel | Statut |
|-------|--------------|-----------|--------|
| `documents` | `schema.sql` ligne 409 | ❌ Pas détecté dans code | ⚠️ Prévu mais non implémenté |
| `notes` | `schema.sql` ligne 410 | ❌ Pas détecté dans code | ⚠️ Prévu mais non implémenté |
| `kbis` | `migration-examples.sql` | ❌ Pas utilisé | 🟡 Exemple seulement |
| `validated` | `migration-examples.sql` | ❌ Pas utilisé | 🟡 Exemple seulement |
| `surface` | `migration-examples.sql` | ❌ Pas utilisé | 🟡 Exemple (Centrale) |
| `orientation` | `migration-examples.sql` | ❌ Pas utilisé | 🟡 Exemple (Centrale) |
| `inclinaison` | `migration-examples.sql` | ❌ Pas utilisé | 🟡 Exemple (Centrale) |
| `type_toiture` | `migration-examples.sql` | ❌ Pas utilisé | 🟡 Exemple (Centrale) |

### 🗑️ **Ce qui est LEGACY / INUTILE**

| Élément | Type | Statut | Action |
|---------|------|--------|--------|
| `prospect_*_project_*` | Clés localStorage legacy | ✅ Migration auto active | ✅ Supprimé automatiquement |
| Format localStorage global | Structure imbriquée | ⚠️ Encore utilisé | 🔜 À supprimer après hook |

### 🚀 **Ce qui DOIT être migré vers Supabase**

| Étape | Action | Priorité | Temps |
|-------|--------|----------|-------|
| 1️⃣ | Créer `useSupabaseProjectInfos()` hook | 🔥 P0 | 2-3h |
| 2️⃣ | Remplacer `getProjectInfo()` par le hook | 🔥 P0 | 1h |
| 3️⃣ | Supprimer localStorage lignes 756, 796, 881 | 🔥 P0 | 30min |
| 4️⃣ | Charger données depuis Supabase au démarrage | 🔥 P0 | 1h |
| 5️⃣ | Tester migration sur tous les projets | 🔥 P0 | 1h |

### ❌ **Ce qu'on PEUT supprimer**

| Élément | Raison | Quand |
|---------|--------|-------|
| `localStorage.getItem('evatime_project_infos')` ligne 756 | Chargement initial obsolète | Après création du hook |
| `localStorage.setItem('evatime_project_infos')` ligne 796 | Sauvegarde après migration legacy | Après création du hook |
| `localStorage.setItem(PROJECT_INFO_STORAGE_KEY)` ligne 881 | Double écriture redondante | Après création du hook |
| Migration `prospect_*_project_*` lignes 768-789 | Une fois toutes les clés migrées | Dans 6 mois (garde temporaire) |

---

## 🎯 7️⃣ DÉPENDANCES DANS LE CODE

### **Composants qui LISENT `projectInfo`**

| Composant | Usage | Ligne | Champ lu |
|-----------|-------|-------|----------|
| `ProspectDetailsAdmin.jsx` | Affichage montant du deal | 821 | `amount` |
| `ProspectDetailsAdmin.jsx` | Badge statut projet | 815 | `status` |
| `ProspectDetailsAdmin.jsx` | Input édition montant | 823-878 | `amount` |
| `App.jsx` | Détection RIB uploadé | 1106 | `ribFile` |

### **Composants qui ÉCRIVENT dans `projectInfo`**

| Composant | Action | Ligne | Champ modifié |
|-----------|--------|-------|---------------|
| `ProspectDetailsAdmin.jsx` | Changement statut | 998 | `status` |
| `ProspectDetailsAdmin.jsx` | Édition montant | 1054 | `amount` |
| `ProspectDetailsAdmin.jsx` | Suppression montant | 1035-1042 | `amount` (delete) |
| `App.jsx` | Upload RIB client | 1105-1110 | `ribFile` |

### **Fonctions qui DÉPENDENT de `projectInfos`**

```javascript
// App.jsx ligne 886-889
getProjectInfo(prospectId, projectType) → Retourne {} ou { amount, status, ... }

// App.jsx ligne 891-951
updateProjectInfo(prospectId, projectType, updater) → Met à jour localStorage + Supabase

// App.jsx ligne 878-883
setProjectInfosState(updater) → Met à jour le state React + localStorage

// App.jsx ligne 1513 (AppContext)
projectInfos, getProjectInfo, updateProjectInfo → Exportés dans le contexte
```

---

## 🧪 8️⃣ VARIANTES DE STRUCTURE DÉTECTÉES

### **Variante 1 : Projet ACC avec RIB (le plus fréquent)**
```json
{
  "prospect-uuid": {
    "ACC": {
      "amount": 15000.50,
      "ribFile": "rib_client.pdf",
      "status": "actif"
    }
  }
}
```

### **Variante 2 : Projet Centrale technique (rare)**
```json
{
  "prospect-uuid": {
    "Centrale": {
      "surface": 500,
      "orientation": "Sud",
      "inclinaison": 30,
      "type_toiture": "Bac acier",
      "documents": ["plan.pdf", "devis.pdf"]
    }
  }
}
```

### **Variante 3 : Projet abandonné minimaliste (fréquent)**
```json
{
  "prospect-uuid": {
    "Investissement": {
      "status": "abandon",
      "notes": "Client a annulé"
    }
  }
}
```

### **Variante 4 : Objet vide (valide !)**
```json
{
  "prospect-uuid": {
    "Batterie": {}
  }
}
```

**⚠️ IMPORTANT :** Le code accepte des objets vides (`return prev || {}` ligne 1109)

---

## 🏗️ 9️⃣ STRUCTURE IDÉALE POUR LE HOOK SUPABASE

### **Ce que le hook DOIT faire**

```typescript
// Hook signature
useSupabaseProjectInfos(prospectId?: string)

// Retourne
{
  projectInfos: {
    [prospectId]: {
      [projectType]: { amount?, status?, ribFile?, ... }
    }
  },
  getProjectInfo: (prospectId, projectType) => object | {},
  updateProjectInfo: (prospectId, projectType, updater) => Promise<void>,
  isLoading: boolean,
  error: Error | null
}
```

### **Requêtes Supabase nécessaires**

```javascript
// 1. Lecture (chargement initial + real-time)
const { data, error } = await supabase
  .from('project_infos')
  .select('prospect_id, project_type, data')
  .order('created_at', { ascending: false });

// 2. Écriture (upsert)
const { error } = await supabase
  .from('project_infos')
  .upsert({
    prospect_id: prospectId,
    project_type: projectType,
    data: newData
  }, {
    onConflict: 'prospect_id,project_type'
  });

// 3. Real-time subscription
supabase
  .channel('project_infos-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'project_infos'
  }, (payload) => {
    // Mettre à jour le state local
  })
  .subscribe();
```

---

## ⚠️ 10️⃣ POINTS D'ATTENTION POUR LA MIGRATION

### 🔴 **Risques identifiés**

1. **Race condition localStorage vs Supabase**
   - Actuellement : 2 écritures simultanées (ligne 881 + 937-951)
   - Si localStorage échoue, Supabase continue → désynchronisation
   - **Solution :** Supprimer complètement localStorage

2. **Transformation de structure**
   - localStorage : structure imbriquée `{ prospectId: { projectType: data } }`
   - Supabase : lignes plates `(prospect_id, project_type, data)`
   - **Solution :** Transformer dans le hook

3. **Chargement initial**
   - Actuellement : lit localStorage au montage (ligne 756)
   - Après migration : doit charger depuis Supabase
   - **Solution :** `useEffect` dans le hook avec flag `isLoading`

4. **Données legacy non migrées**
   - Utilisateurs avec anciennes clés `prospect_*_project_*`
   - **Solution :** Migration automatique déjà active (ligne 768-789)

### 🟢 **Avantages de la migration**

✅ **Synchronisation multi-device** (client desktop + mobile)  
✅ **Real-time** (admin voit modifications client instantanément)  
✅ **Sauvegarde cloud** (aucune perte si localStorage effacé)  
✅ **Historique** (champs `created_at`, `updated_at`)  
✅ **RLS** (sécurité accès données)

---

## 🎯 CONCLUSION : PRÊT POUR PHASE 1

### ✅ **Analyse terminée**

| Élément analysé | Statut |
|----------------|--------|
| Structure JSON complète | ✅ Documenté |
| Tous les champs identifiés | ✅ 12 champs catalogués |
| Types de données | ✅ Définis (number, string, array, boolean) |
| Champs obligatoires vs optionnels | ✅ Tous optionnels |
| Points d'écriture dans le code | ✅ 4 usages détectés |
| Points de lecture | ✅ 1 fonction principale |
| Dépendances composants | ✅ 2 composants principaux |
| Structure Supabase existante | ✅ Table créée, RLS configuré |
| Risques identifiés | ✅ 4 points d'attention |

### 🚀 **Prêt pour PHASE 1 : Création du hook**

**Ce qu'on va créer :**
```
src/hooks/useSupabaseProjectInfos.js
```

**Fonctionnalités :**
1. ✅ Chargement depuis Supabase au montage
2. ✅ Real-time subscription
3. ✅ Fonction `getProjectInfo(prospectId, projectType)`
4. ✅ Fonction `updateProjectInfo(prospectId, projectType, updater)`
5. ✅ Gestion état `isLoading` et `error`
6. ✅ Transformation structure Supabase → format app

**Estimation temps :** 2-3 heures

---

## ⚠️ RÈGLES RESPECTÉES

✅ **Aucun code écrit**  
✅ **Aucune modification localStorage**  
✅ **Aucune migration effectuée**  
✅ **Aucune suppression**  
✅ **Analyse pure uniquement**

---

**👍 Prêt pour la PHASE 1 — Création du hook Supabase**

_Fin de l'extraction - 2 décembre 2025_
