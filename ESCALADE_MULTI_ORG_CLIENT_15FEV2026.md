# 🚨 ESCALADE : Contrainte UNIQUE user_id bloque multi-org clients
**Date** : 15 février 2026  
**Priorité** : 🔴 **BLOQUANT** pour croissance multi-tenant  
**Impact** : Empêche un client de s'inscrire dans plusieurs organisations

---

## 📊 État actuel de la contrainte

### Table `prospects` (schema.sql ligne 203)
```sql
user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL
```

### Problème identifié
```
❌ UNIQUE empêche : tony.fabio@gmail.com → Org A + Org B
✅ UNIQUE protège : Pas de doublon user_id dans UNE org (déjà géré par RLS)
```

---

## 🔍 Historique des modifications

### Fichiers trouvés dans le dépôt

| Fichier | Date | Intention |
|---------|------|-----------|
| `fix_remove_unique_constraint.sql` | 25 nov 2025 | ❌ **Mauvaise raison** : "un Commercial doit pouvoir créer plusieurs prospects" |
| `remove_user_id_column.sql` | 25 nov 2025 | ⚠️ **Obsolète** : Proposait de supprimer user_id (jamais exécuté) |
| `restore_constraint.sql` | 25 nov 2025 | 🔄 **Rollback** : Restaurer UNIQUE (si supprimé par erreur) |
| `create_link_user_to_prospect_in_org_rpc.sql` | 21 jan 2026 | ✅ **Bon** : RPC multi-tenant (bypass RLS) |

### Commit clé : `91d5d99` (21 jan 2026)
```
fix: Use RPC to link user to prospect in hostname org (bypass RLS)
- Created link_user_to_prospect_in_org RPC with SECURITY DEFINER
- OrganizationContext now uses RPC instead of direct query
- Fixes issue where client couldn't see prospect with null user_id due to RLS
```

**Constat** : Le code **prévoyait déjà** le multi-org client, mais la contrainte DB n'a jamais été modifiée !

---

## 🧪 Preuve du blocage (scénario réel)

### Scénario actuel (sans fix)
```sql
-- Étape 1 : Tony s'inscrit chez ROSCA
INSERT INTO prospects (email, organization_id, user_id) 
VALUES ('tony.fabio@gmail.com', 'rosca-org-id', NULL);
-- ✅ OK

-- Étape 2 : Tony active son compte (Magic Link)
UPDATE prospects SET user_id = 'xxx-auth-uid' 
WHERE email = 'tony.fabio@gmail.com' AND organization_id = 'rosca-org-id';
-- ✅ OK (user_id = xxx)

-- Étape 3 : Tony s'inscrit chez LOCASUN (même email)
INSERT INTO prospects (email, organization_id, user_id) 
VALUES ('tony.fabio@gmail.com', 'locasun-org-id', NULL);
-- ✅ OK (user_id = NULL)

-- Étape 4 : Tony active chez LOCASUN (Magic Link)
UPDATE prospects SET user_id = 'xxx-auth-uid' 
WHERE email = 'tony.fabio@gmail.com' AND organization_id = 'locasun-org-id';
-- ❌ ERREUR : duplicate key value violates unique constraint "prospects_user_id_key"
```

### Résultat
- ✅ Tony peut se connecter chez ROSCA
- ❌ Tony **NE PEUT PAS** se connecter chez LOCASUN (user_id reste NULL)
- ❌ Magic Link ne fonctionne pas (RLS bloque prospect avec user_id=NULL)

---

## 🔴 Impact business

### Cas d'usage bloqués
1. **Client multi-marque** : Un même contact travaille avec plusieurs filiales
   - Exemple : Tony Fabio → Client ROSCA + Client LOCASUN
2. **Réseaux de partenaires** : Un prospect partagé entre organisations
   - Exemple : Lead généré par ENR COURTAGE, converti par ROSCA
3. **Fusion/acquisition** : Migration clients d'une org à une autre
   - Exemple : Clients ROSCA rachetés par LOCASUN

### Alternatives actuelles (workarounds)
❌ **Créer un nouvel email** : tony.fabio+locasun@gmail.com
   - Impact UX négatif
   - Pas de SSO possible
❌ **Utiliser une seule org** : Tout dans LOCASUN
   - Perd l'isolation multi-tenant
   - Pas conforme RGPD (données mélangées)

---

## ✅ Solution technique

### Migration SQL (3 lignes)
```sql
-- 1. Retirer contrainte UNIQUE globale
ALTER TABLE public.prospects 
DROP CONSTRAINT IF EXISTS prospects_user_id_key;

-- 2. Ajouter contrainte composite (user_id + organization_id)
ALTER TABLE public.prospects
ADD CONSTRAINT unique_user_per_org UNIQUE (user_id, organization_id);

-- 3. Index pour performances
CREATE INDEX IF NOT EXISTS idx_prospects_user_org 
ON public.prospects(user_id, organization_id) 
WHERE user_id IS NOT NULL;
```

### Vérification pré-migration
```sql
-- Détecter les doublons potentiels (user_id + organization_id en double)
SELECT user_id, organization_id, COUNT(*) as duplicates
FROM prospects
WHERE user_id IS NOT NULL
GROUP BY user_id, organization_id
HAVING COUNT(*) > 1;
-- Résultat attendu : 0 lignes (aucun doublon)
```

### Impact production
- ✅ **Aucune perte de données** (ajout de flexibilité)
- ✅ **Pas de downtime** (migration instantanée)
- ✅ **Pas de régression** (code frontend déjà compatible)
- ✅ **Performances** : Index composite optimisé pour les requêtes (user_id + org_id)

---

## 🧪 Tests recommandés après migration

### Test 1 : Inscription multi-org (nouveau comportement)
```javascript
// Test automatisé (Supabase SQL Editor)
DO $$
DECLARE
  v_user_id UUID := '123e4567-e89b-12d3-a456-426614174000';
  v_org_a UUID := '06bb4924-7eaa-47bc-a671-2f283d58cdc0'; -- EVATIME
  v_org_b UUID := 'autre-org-id'; -- ROSCA
BEGIN
  -- Créer prospect A
  INSERT INTO prospects (email, organization_id, user_id) 
  VALUES ('test@example.com', v_org_a, v_user_id);
  
  -- Créer prospect B (MÊME user_id, AUTRE org)
  INSERT INTO prospects (email, organization_id, user_id) 
  VALUES ('test@example.com', v_org_b, v_user_id);
  
  -- ✅ Doit réussir (pas d'erreur UNIQUE)
  RAISE NOTICE 'Test réussi : user_id peut être lié à 2 orgs différentes';
  
  -- Cleanup
  DELETE FROM prospects WHERE email = 'test@example.com';
END $$;
```

### Test 2 : Protection doublon dans MÊME org (comportement préservé)
```sql
-- Tenter de créer 2 prospects avec MÊME user_id + MÊME org
DO $$
DECLARE
  v_user_id UUID := '123e4567-e89b-12d3-a456-426614174000';
  v_org UUID := '06bb4924-7eaa-47bc-a671-2f283d58cdc0';
BEGIN
  INSERT INTO prospects (email, organization_id, user_id) 
  VALUES ('test@example.com', v_org, v_user_id);
  
  INSERT INTO prospects (email, organization_id, user_id) 
  VALUES ('test2@example.com', v_org, v_user_id); -- ❌ Doit échouer
  
  DELETE FROM prospects WHERE email LIKE 'test%@example.com';
EXCEPTION
  WHEN unique_violation THEN
    RAISE NOTICE 'Test réussi : doublon (user_id + org) correctement bloqué';
    DELETE FROM prospects WHERE email LIKE 'test%@example.com';
END $$;
```

### Test 3 : Flow complet end-to-end
```bash
# 1. Inscription Tony chez ROSCA
curl -X POST https://rosca.evatime.fr/api/register \
  -d '{"email":"tony.fabio@gmail.com","name":"Tony Fabio"}'

# 2. Activation Magic Link ROSCA
# → user_id lié à prospect ROSCA ✅

# 3. Inscription Tony chez LOCASUN (MÊME EMAIL)
curl -X POST https://locasun.evatime.fr/api/register \
  -d '{"email":"tony.fabio@gmail.com","name":"Tony Fabio"}'

# 4. Activation Magic Link LOCASUN
# → user_id lié à prospect LOCASUN ✅ (AVANT : ❌ ERREUR)

# 5. Connexion Tony sur ROSCA
curl -X POST https://rosca.evatime.fr/api/login \
  -d '{"email":"tony.fabio@gmail.com"}'
# → Voit ses projets ROSCA ✅

# 6. Connexion Tony sur LOCASUN
curl -X POST https://locasun.evatime.fr/api/login \
  -d '{"email":"tony.fabio@gmail.com"}'
# → Voit ses projets LOCASUN ✅
```

---

## 📋 Checklist avant migration

- [ ] Vérifier aucun doublon existant (requête ci-dessus)
- [ ] Backup table prospects (Supabase Time Travel : 7 jours)
- [ ] Tester migration sur environnement de staging (si disponible)
- [ ] Informer équipe dev (vérifier code frontend compatible)
- [ ] Planifier rollback si nécessaire (script `restore_constraint.sql` disponible)

---

## 🎯 Décision requise

### Question à Jack
**Faut-il appliquer cette migration maintenant ?**

**Arguments POUR** :
- ✅ Code frontend **déjà prévu** depuis janvier 2026 (commit 91d5d99)
- ✅ RPC `link_user_to_prospect_in_org` **déjà en place**
- ✅ Aucun impact négatif (amélioration pure)
- ✅ Débloque cas d'usage business (multi-marque, partenaires)

**Arguments CONTRE** :
- ⚠️ Pas encore de besoin client **confirmé** (Tony Fabio = exemple théorique)
- ⚠️ Peut attendre phase de scaling (pas urgent si mono-org pour l'instant)

### Recommandation
🟢 **Appliquer maintenant** :
- Migration simple (< 1s)
- Aucun risque (rollback facile)
- Aligne DB avec l'architecture code (déjà multi-org ready)
- Évite ticket d'escalade futur quand besoin client réel

---

## 📁 Fichiers de référence

| Fichier | Rôle |
|---------|------|
| `ANALYSE_MULTI_ORG_CLIENT_15FEV2026.md` | Analyse technique complète |
| `create_link_user_to_prospect_in_org_rpc.sql` | RPC multi-tenant (déjà appliquée) |
| `src/contexts/OrganizationContext.jsx` (ligne 150-200) | Logique résolution org par hostname |
| `src/App.jsx` (ligne 760) | Chargement prospect filtré par (user_id + org_id) |
| `src/pages/RegistrationPage.jsx` (ligne 130) | Check doublon par organisation |

---

**Prochaine étape** : Validation Jack → Appliquer migration ou attendre besoin client confirmé.
