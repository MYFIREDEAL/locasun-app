# 🐛 FIX : Commerciaux/Managers ne peuvent pas modifier leurs contacts

## ❌ Problème Identifié

**Symptôme :** Jack Luc (Global Admin) peut modifier les contacts, mais les utilisateurs avec rôle **Commercial** ou **Manager** ne peuvent pas modifier leurs propres contacts (où `owner_id = leur UUID`).

## 🔍 Analyse Technique

### Policies RLS Existantes (AVANT le fix) :

1. ✅ **`Users can view their own and authorized prospects`** (SELECT)
   - Permet de VOIR ses propres contacts + ceux partagés
   
2. ✅ **`Users can insert prospects`** (INSERT)
   - Permet de CRÉER des contacts (devient owner)
   
3. ✅ **`Users can delete their own prospects`** (DELETE)
   - Permet de SUPPRIMER ses propres contacts
   
4. ✅ **`Users can manage authorized prospects`** (UPDATE)
   - Permet de MODIFIER les contacts **partagés via access_rights.users**
   - **Mais pas ses propres contacts !**
   
5. ✅ **`Managers can manage their team prospects`** (UPDATE)
   - Manager peut modifier les contacts de son **équipe** (via manager_id)
   
6. ✅ **`Global Admin can manage all prospects`** (ALL)
   - Global Admin peut tout faire

### 🚨 Policy Manquante :

**Il manquait une policy UPDATE pour :**
```sql
owner_id = auth.uid() 
AND role IN ('Commercial', 'Manager', 'Global Admin')
```

### Pourquoi Jack Luc (Global Admin) peut modifier ?

Parce que la policy **`Global Admin can manage all prospects`** utilise `FOR ALL` (SELECT + INSERT + UPDATE + DELETE), donc il bypasse toutes les restrictions.

### Pourquoi les Commerciaux/Managers ne peuvent pas ?

Ils avaient :
- ✅ Policy pour **voir** leurs contacts
- ✅ Policy pour **supprimer** leurs contacts  
- ✅ Policy pour modifier les contacts **partagés** (via `access_rights.users`)
- ❌ **MANQUE** : Policy pour **modifier** leurs **propres** contacts

## ✅ Solution Appliquée

### Nouvelle Policy Ajoutée :

```sql
CREATE POLICY "Users can update their own prospects"
  ON public.prospects
  FOR UPDATE
  USING (
    owner_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE user_id = auth.uid() AND role IN ('Commercial', 'Manager', 'Global Admin')
    )
  );
```

### Ce que ça change :

| Utilisateur | AVANT le fix | APRÈS le fix |
|-------------|--------------|--------------|
| **Commercial** (ses contacts) | ❌ Ne peut pas modifier | ✅ Peut modifier |
| **Commercial** (contacts partagés) | ✅ Peut modifier | ✅ Peut modifier |
| **Manager** (ses contacts) | ❌ Ne peut pas modifier | ✅ Peut modifier |
| **Manager** (contacts équipe) | ✅ Peut modifier | ✅ Peut modifier |
| **Global Admin** | ✅ Peut tout modifier | ✅ Peut tout modifier |

## 📝 Déploiement

### Étapes pour appliquer le fix :

1. **Ouvrir Supabase Dashboard**
   - Aller dans le projet
   - Menu : **SQL Editor**

2. **Exécuter le script `fix_commercial_update_policy.sql`**
   - Copier/coller le contenu du fichier
   - Cliquer sur **Run**

3. **Vérifier l'application**
   - Le script affiche : `✅ Policy "Users can update their own prospects" créée avec succès`
   - Liste toutes les policies UPDATE

4. **Tester dans l'application**
   - Se connecter avec un compte Commercial/Manager
   - Essayer de modifier un de ses propres contacts
   - ✅ Devrait fonctionner maintenant

## 🧪 Tests de Validation

### Test 1 : Commercial modifie son propre contact

```sql
-- Se connecter avec un compte Commercial (ex: joe@test.com)
-- Tenter de modifier un contact où owner_id = UUID de Joe

UPDATE prospects 
SET name = 'Nouveau Nom', email = 'nouveau@email.com'
WHERE id = 'contact_uuid' AND owner_id = 'joe_uuid';

-- ✅ DOIT RÉUSSIR (après le fix)
```

### Test 2 : Commercial tente de voler un contact

```sql
-- Tenter de changer le owner_id d'un contact partagé
UPDATE prospects 
SET owner_id = 'joe_uuid'
WHERE owner_id = 'jack_luc_uuid';

-- ❌ DOIT ÉCHOUER (protégé par "Users can manage authorized prospects" WITH CHECK)
```

### Test 3 : Manager modifie son propre contact

```sql
-- Se connecter avec un compte Manager
UPDATE prospects 
SET phone = '+33 6 12 34 56 78'
WHERE owner_id = 'manager_uuid';

-- ✅ DOIT RÉUSSIR (après le fix)
```

## 📊 Matrice Complète des Permissions (APRÈS fix)

| Action | Client | Commercial | Manager | Global Admin |
|--------|--------|------------|---------|--------------|
| **SELECT** | ✅ Ses données | ✅ Ses contacts + partagés | ✅ Équipe | ✅ Tous |
| **INSERT** | ❌ | ✅ Devient owner | ✅ Pour lui + équipe | ✅ Tous |
| **UPDATE** (ses contacts) | ✅ Champs limités | ✅ **FIXÉ** | ✅ **FIXÉ** | ✅ Tous |
| **UPDATE** (contacts partagés) | ❌ | ✅ Sauf owner_id | ✅ Sauf owner_id | ✅ Tous |
| **UPDATE** (contacts équipe) | ❌ | ❌ | ✅ Tous champs | ✅ Tous |
| **DELETE** | ❌ | ✅ Ses contacts | ✅ Équipe | ✅ Tous |

## 🔒 Sécurité Maintenue

### Protections en place :

1. ✅ **Anti-vol de contacts** : Un Commercial ne peut pas changer le `owner_id` d'un contact partagé
2. ✅ **Isolation par rôle** : Clients ne peuvent pas modifier les champs admin (status, tags, etc.)
3. ✅ **Hiérarchie Manager** : Manager ne peut réassigner que dans son équipe (via `manager_id`)
4. ✅ **Global Admin** : Seul rôle qui peut modifier `owner_id` librement

## 📚 Fichiers Modifiés

- ✅ `supabase/schema.sql` (ligne 935) : Policy ajoutée dans le schéma principal
- ✅ `fix_commercial_update_policy.sql` : Script de migration pour production
- ✅ `FIX_COMMERCIAL_UPDATE_POLICY.md` : Cette documentation

## ⚠️ Important

Cette policy **doit être appliquée en production** pour que les Commerciaux/Managers puissent modifier leurs contacts. Sans elle, ils ne peuvent que :
- ✅ Voir leurs contacts
- ✅ Créer des contacts
- ✅ Supprimer leurs contacts
- ✅ Modifier les contacts **partagés** (si accès via `access_rights.users`)
- ❌ **Modifier leurs propres contacts** (c'était le bug)

## 🎯 Résumé

**Cause racine :** Policy UPDATE manquante pour `owner_id = auth.uid()`  
**Impact :** Commerciaux/Managers bloqués pour modifier leurs propres contacts  
**Solution :** Ajout de la policy `"Users can update their own prospects"`  
**Statut :** ✅ Fixé dans `schema.sql` + script de migration prêt
