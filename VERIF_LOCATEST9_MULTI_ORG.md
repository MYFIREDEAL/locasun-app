# 🔍 Vérification locatest9@yopmail.com - Multi-org

**Date** : 15 février 2026  
**Email testé** : locatest9@yopmail.com  
**Claim** : Cet email accède à plusieurs entreprises

---

## ✅ Requêtes à exécuter dans Supabase SQL Editor

### 1️⃣ Vérifier les prospects liés à cet email
```sql
SELECT 
  id,
  email,
  name,
  user_id,
  organization_id,
  created_at,
  updated_at
FROM prospects
WHERE email = 'locatest9@yopmail.com'
ORDER BY created_at;
```

**Résultat attendu** :
```
Si multi-org fonctionne :
- Plusieurs lignes (1 par organisation)
- user_id identique ou différent ? (clé du mystère)

Si mono-org :
- 1 seule ligne
```

---

### 2️⃣ Vérifier la contrainte UNIQUE actuelle
```sql
SELECT 
  con.conname as "Nom Contrainte",
  con.contype as "Type",
  pg_get_constraintdef(con.oid) as "Définition"
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'prospects'
  AND (con.conname LIKE '%user_id%' OR con.contype = 'u');
```

**Résultat attendu** :
```
Si contrainte UNIQUE existe :
- prospects_user_id_key | u | UNIQUE (user_id)

Si contrainte composite existe :
- unique_user_per_org | u | UNIQUE (user_id, organization_id)

Si aucune contrainte :
- (aucune ligne retournée)
```

---

### 3️⃣ Détecter tous les users multi-org
```sql
SELECT 
  user_id,
  COUNT(*) as nb_prospects,
  COUNT(DISTINCT organization_id) as nb_orgs,
  array_agg(DISTINCT email) as emails,
  array_agg(DISTINCT organization_id::text) as org_ids
FROM prospects
WHERE user_id IS NOT NULL
GROUP BY user_id
HAVING COUNT(DISTINCT organization_id) > 1
ORDER BY nb_orgs DESC;
```

**Résultat attendu** :
```
Si multi-org fonctionne :
- Au moins 1 ligne (user_id de locatest9)
- nb_orgs >= 2

Si contrainte UNIQUE active :
- Aucune ligne (impossible d'avoir même user_id dans 2 orgs)
```

---

### 4️⃣ Détail auth.users pour locatest9
```sql
SELECT 
  au.id as auth_user_id,
  au.email,
  au.created_at as auth_created_at,
  au.last_sign_in_at,
  COUNT(p.id) as nb_prospects_lies,
  array_agg(DISTINCT p.organization_id::text) as orgs
FROM auth.users au
LEFT JOIN prospects p ON p.user_id = au.id
WHERE au.email = 'locatest9@yopmail.com'
GROUP BY au.id, au.email, au.created_at, au.last_sign_in_at;
```

**Résultat attendu** :
```
Si 1 seul compte auth :
- 1 ligne, nb_prospects_lies = nombre d'orgs

Si plusieurs comptes auth (emails aliases) :
- Plusieurs lignes (1 par compte auth)
```

---

## 🎯 Scénarios possibles

### Scénario A : ✅ Contrainte déjà supprimée (multi-org fonctionne)
```
Requête #2 : Pas de prospects_user_id_key (ou contrainte composite)
Requête #3 : locatest9 apparaît avec nb_orgs >= 2
Requête #4 : 1 seul auth.users, plusieurs prospects liés
```
**Conclusion** : La migration a déjà été appliquée en production ! 🎉

### Scénario B : ⚠️ Workaround (emails différents en auth)
```
Requête #1 : Plusieurs prospects avec email='locatest9@yopmail.com'
Requête #4 : Plusieurs auth.users avec emails différents
Exemple :
  - locatest9@yopmail.com → Org A
  - locatest9+rosca@yopmail.com → Org B
```
**Conclusion** : Multi-org "faux" (emails aliases, pas vraiment le même user_id)

### Scénario C : ❌ Contrainte UNIQUE active (multi-org impossible)
```
Requête #2 : prospects_user_id_key | u | UNIQUE (user_id)
Requête #3 : Aucune ligne (aucun user_id sur plusieurs orgs)
Requête #1 : locatest9 a user_id = NULL sur les orgs secondaires
```
**Conclusion** : Claim incorrect, ou test incomplet (Magic Link jamais cliqué sur org B)

---

## 📋 Instructions

1. Copier-coller **Requête #1** dans Supabase SQL Editor
2. Exécuter et noter le résultat (nombre de lignes + user_id identiques ou différents)
3. Copier-coller **Requête #2** pour vérifier la contrainte
4. Partager les résultats ici

**Format de réponse attendu** :
```
Requête #1 : [X lignes]
- user_id identiques ? OUI/NON
- organization_id différents ? OUI/NON

Requête #2 : [prospects_user_id_key existe ? OUI/NON]
```

---

## 🚀 Prochaine étape selon résultat

| Résultat Requête #2 | Action |
|---------------------|--------|
| ✅ Contrainte composite existe | 🎉 Migration déjà appliquée → Fermer ticket |
| ⚠️ Pas de contrainte user_id | ⚠️ Dangereux → Ajouter contrainte composite |
| ❌ UNIQUE (user_id) existe | 🔴 Appliquer migration (bloquer multi-org actuel) |

---

**Attente résultats avant de conclure.**
