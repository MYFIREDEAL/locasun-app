# 🎯 GUIDE DE TEST - SYSTÈME D'AFFILIATION PRO

## 📋 Résumé du fix

### ✅ Problème identifié
Le système d'affiliation ne fonctionnait pas car `RegistrationPage.jsx` cherchait le commercial par **ID** au lieu de **affiliate_slug**.

### ✅ Solution implémentée
**Fichier modifié** : `src/pages/RegistrationPage.jsx` (lignes 54-62)

**Avant** :
```javascript
.eq('id', affiliateId)  // ❌ Cherchait par ID
```

**Après** :
```javascript
.eq('affiliate_slug', affiliateSlug)  // ✅ Cherche par slug
```

---

## 🧪 Tests à réaliser

### 1️⃣ Test en base de données (Supabase SQL Editor)

#### Vérifier que tous les users PRO ont un affiliate_slug
```sql
SELECT name, email, role, affiliate_slug, affiliate_link
FROM public.users
WHERE role IN ('Commercial', 'Manager', 'Global Admin')
ORDER BY name;
```

**✅ Résultat attendu** : Tous les users doivent avoir :
- `affiliate_slug` : ex. `jack-luc`, `elodie-martin`
- `affiliate_link` : ex. `https://evatime.fr/inscription/jack-luc`

---

#### Vérifier la politique RLS pour inscription publique
```sql
SELECT * FROM pg_policies 
WHERE tablename = 'prospects' 
AND policyname = 'Allow public client registration';
```

**✅ Résultat attendu** : La politique doit exister et être active.

---

### 2️⃣ Test frontend (Navigation manuelle)

#### A. Récupérer un lien d'affiliation
1. Dans Supabase SQL Editor, exécuter :
```sql
SELECT name, affiliate_slug, affiliate_link
FROM public.users
WHERE affiliate_slug IS NOT NULL
LIMIT 1;
```

2. Copier l'`affiliate_link` (ex: `https://evatime.fr/inscription/jack-luc`)

#### B. Tester l'inscription via le lien
1. Ouvrir une fenêtre de navigation privée
2. Accéder à l'URL : `http://localhost:5173/inscription/jack-luc` (remplacer par votre slug)
3. Vérifier dans la console du navigateur :
   - ✅ Message : `✅ Commercial trouvé via affiliate_slug: {id, name, slug}`
   - ❌ Si erreur : `❌ Commercial non trouvé pour le slug: {slug}`

4. Remplir le formulaire d'inscription :
   - Sélectionner au moins 1 projet
   - Entrer nom et email (utilisez un email jetable comme `test+slug123@gmail.com`)
   - Cliquer sur "Créer mon compte"

5. Vérifier dans Supabase :
```sql
SELECT 
  p.name AS prospect_name,
  p.email,
  p.affiliate_name,
  u.name AS owner_name,
  u.affiliate_slug
FROM public.prospects p
LEFT JOIN public.users u ON p.owner_id = u.id
WHERE p.email = 'test+slug123@gmail.com';
```

**✅ Résultat attendu** :
- `owner_name` doit correspondre au commercial du lien d'affiliation
- `affiliate_name` doit être le nom du commercial
- `affiliate_slug` doit correspondre au slug utilisé dans l'URL

---

### 3️⃣ Test d'attribution automatique

#### Créer 3 prospects via 3 liens différents
1. `/inscription/jack-luc` → prospect A
2. `/inscription/elodie-martin` → prospect B
3. `/inscription/autre-commercial` → prospect C

#### Vérifier l'attribution dans Supabase
```sql
-- Compter les prospects par commercial
SELECT 
  u.name AS commercial,
  u.affiliate_slug,
  COUNT(p.id) AS total_prospects,
  COUNT(CASE WHEN p.affiliate_name IS NOT NULL THEN 1 END) AS via_affiliation
FROM public.users u
LEFT JOIN public.prospects p ON p.owner_id = u.id
WHERE u.role IN ('Commercial', 'Manager', 'Global Admin')
GROUP BY u.id, u.name, u.affiliate_slug
ORDER BY total_prospects DESC;
```

**✅ Résultat attendu** :
- Jack Luc : 1 prospect via affiliation
- Elodie Martin : 1 prospect via affiliation
- Autre Commercial : 1 prospect via affiliation

---

## 🐛 Dépannage

### Erreur : "Commercial non trouvé pour le slug"
**Causes possibles** :
1. Le slug n'existe pas dans la base de données
2. Le slug contient des caractères spéciaux ou espaces

**Solution** :
```sql
-- Vérifier les slugs existants
SELECT affiliate_slug FROM public.users WHERE affiliate_slug IS NOT NULL;
```

---

### Erreur : "permission denied for table prospects"
**Cause** : La politique RLS `Allow public client registration` n'est pas active

**Solution** :
```sql
-- Activer la politique
CREATE POLICY "Allow public client registration"
  ON public.prospects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
```

---

### Le prospect est créé mais owner_id = Jack Luc par défaut
**Cause** : Le `affiliateInfo.id` est `null` donc fallback sur `DEFAULT_JACK_USER_ID`

**Solution** :
1. Vérifier dans la console : message "✅ Commercial trouvé"
2. Vérifier que `slugUser` est bien extrait de l'URL
3. Ajouter des logs dans `RegistrationPage.jsx` ligne 147 :
```javascript
console.log('owner_id utilisé:', affiliateInfo.id || DEFAULT_JACK_USER_ID);
console.log('affiliateInfo:', affiliateInfo);
```

---

## 📊 Métriques de succès

Après le déploiement, vérifier ces KPIs :

```sql
-- Taux d'attribution via affiliation (objectif : > 80%)
SELECT 
  COUNT(*) AS total_prospects,
  COUNT(CASE WHEN affiliate_name IS NOT NULL THEN 1 END) AS via_affiliation,
  ROUND(100.0 * COUNT(CASE WHEN affiliate_name IS NOT NULL THEN 1 END) / NULLIF(COUNT(*), 0), 2) AS taux_affiliation_pct
FROM public.prospects
WHERE created_at > NOW() - INTERVAL '30 days';
```

**✅ Objectif** : > 80% des nouveaux prospects créés via affiliation

---

## 🚀 Prochaines étapes (amélioration future)

1. **Analytics d'affiliation** :
   - Dashboard pour chaque commercial avec ses stats d'affiliation
   - Nombre de clics sur son lien (nécessite tracking externe)
   - Taux de conversion clic → inscription

2. **Personnalisation du lien** :
   - Page d'accueil personnalisée avec nom du commercial
   - Photo et message de bienvenue

3. **Gamification** :
   - Badges pour les meilleurs affiliateurs
   - Classement mensuel des affiliations

---

## 📝 Checklist finale

- [ ] ✅ Code modifié dans `RegistrationPage.jsx`
- [ ] ✅ Test en local avec un lien d'affiliation
- [ ] ✅ Vérification de l'attribution dans Supabase
- [ ] ✅ Test avec 3 commerciaux différents
- [ ] ✅ Documentation mise à jour
- [ ] ✅ Commit et push sur GitHub

---

**Auteur** : Claude (dev EVATIME)  
**Date** : 9 décembre 2025  
**Ticket** : Système d'affiliation PRO - Attribution automatique des prospects
