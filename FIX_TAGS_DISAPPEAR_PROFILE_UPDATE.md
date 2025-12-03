# 🔥 FIX URGENT - Bug disparition projets (tags) après modification profil client

**Date :** 3 décembre 2025  
**Gravité :** 🔴 CRITIQUE  
**Status :** ✅ FIX READY TO DEPLOY

---

## 🐛 SYMPTÔME

Quand un **client modifie son profil** (téléphone, etc.) dans `/dashboard/profil`, **tous ses projets (tags) disparaissent** de Supabase.

**Exemple :**
- Client a les projets : `["ACC", "Centrale", "Autonomie"]`
- Client change son téléphone dans Paramètres
- Après enregistrement : `tags = []` ❌

---

## 🔍 CAUSE EXACTE

**Fichier SQL problématique :** `supabase/functions/update_own_prospect_profile.sql`

**Ligne 64-72 :**
```sql
tags = COALESCE(
  ARRAY(SELECT jsonb_array_elements_text(_data->'tags')),
  tags
)
```

**Problème :**
- Quand `_data->'tags'` est `NULL` (pas fourni dans l'update)
- `ARRAY(SELECT ... FROM NULL)` retourne `[]` au lieu de `NULL`
- `COALESCE([], tags)` choisit `[]` car ce n'est pas `NULL`
- **Résultat : écrase les tags existants avec un tableau vide** 💥

---

## ✅ SOLUTION

**Remplacer par :**
```sql
tags = CASE 
  WHEN _data ? 'tags' THEN ARRAY(SELECT jsonb_array_elements_text(_data->'tags'))
  ELSE tags
END
```

**Logique :**
- Si `_data` contient la clé `'tags'` → utiliser la nouvelle valeur
- Sinon → **garder la valeur existante**

---

## 🚀 DÉPLOIEMENT

### Étape 1 : Aller sur Supabase Dashboard

1. Ouvrir https://supabase.com/dashboard
2. Sélectionner le projet **locasun-app** (vvzxvtiyybilkswslqfn)
3. Aller dans **SQL Editor** (menu gauche)

### Étape 2 : Exécuter le fix SQL

1. Créer un nouveau query
2. Copier le contenu du fichier `fix_tags_coalesce_bug.sql`
3. Cliquer sur **Run** ▶️
4. Vérifier le message de succès ✅

### Étape 3 : Tester

1. Connecté en tant que **client** sur https://locasun-app.vercel.app/dashboard
2. Aller dans **Profil**
3. Modifier le téléphone
4. Cliquer sur **Enregistrer**
5. **Vérifier que les projets sont toujours là** ✅

---

## 📋 FICHIERS MODIFIÉS

```
supabase/functions/update_own_prospect_profile.sql (ligne 64-72)
fix_tags_coalesce_bug.sql (nouveau - script de déploiement)
FIX_TAGS_DISAPPEAR_PROFILE_UPDATE.md (ce fichier)
```

---

## 🔬 AVANT/APRÈS

### AVANT (BUG)
```javascript
// Client met à jour son téléphone
await updateProspect({ 
  id: "abc-123",
  phone: "06 12 34 56 78"
  // ❌ tags pas fourni
});

// SQL exécute:
// tags = COALESCE(ARRAY(SELECT ... FROM NULL), tags)
//      = COALESCE([], ["ACC", "Centrale"])
//      = []  🔴 BUG!

// Résultat en DB:
{ 
  phone: "06 12 34 56 78",
  tags: [] // 🔴 PERDU
}
```

### APRÈS (FIX)
```javascript
// Client met à jour son téléphone
await updateProspect({ 
  id: "abc-123",
  phone: "06 12 34 56 78"
  // ❌ tags pas fourni
});

// SQL exécute:
// tags = CASE WHEN _data ? 'tags' THEN ... ELSE tags END
//      = tags (gardé tel quel)

// Résultat en DB:
{ 
  phone: "06 12 34 56 78",
  tags: ["ACC", "Centrale"] // ✅ PRÉSERVÉ
}
```

---

## ⚠️ IMPACT

**Avant le fix :**
- ❌ Perte de données à chaque modification profil client
- ❌ Admin doit rajouter manuellement les projets
- ❌ Bug silencieux (pas d'erreur visible)

**Après le fix :**
- ✅ Tags préservés lors des updates partiels
- ✅ Clients peuvent modifier leur profil en toute sécurité
- ✅ Données cohérentes entre frontend et Supabase

---

## 🎯 PROCHAINE ÉTAPE

**Action immédiate requise :**
1. ⏰ Exécuter `fix_tags_coalesce_bug.sql` sur Supabase Dashboard
2. ✅ Tester avec un compte client
3. 🔔 Informer les utilisateurs que le bug est corrigé

---

**Statut déploiement :** ⏳ EN ATTENTE D'EXÉCUTION SQL
