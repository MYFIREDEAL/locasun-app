# 🔍 Analyse Multi-Org Client - Tony Fabio Cas d'Usage
**Date** : 15 février 2026  
**Demande** : Permettre à tony.fabio@gmail.com de se connecter à Org A ET Org B avec le même email

---

## 📊 État actuel du système

### Table `prospects` (ligne 203 schema.sql)
```sql
CREATE TABLE public.prospects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL, -- ⚠️ UNIQUE = PROBLÈME
  name TEXT NOT NULL,
  email TEXT,  -- ⚠️ PAS DE UNIQUE (OK multi-org)
  phone TEXT,
  company_name TEXT,
  address TEXT,
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id),  -- ✅ Multi-tenant
  ...
)
```

### ⚠️ **CONTRAINTE BLOQUANTE** : `user_id UUID UNIQUE`

**Impact** :
- ✅ **Même email peut créer PLUSIEURS prospects** (pas de contrainte UNIQUE sur email)
- ❌ **Mais UN SEUL prospect peut être lié à auth.users** (contrainte UNIQUE sur user_id)

**Résultat** :
```
tony.fabio@gmail.com s'inscrit chez Org A → Prospect A créé, user_id = xxx
tony.fabio@gmail.com s'inscrit chez Org B → Prospect B créé, user_id = NULL (ne peut pas lier)
```

---

## 🛠️ Ce qui existe déjà (Multi-org prévu)

### 1️⃣ RPC `check_prospect_exists_in_org` (create_check_prospect_exists_in_org_rpc.sql)
```sql
-- Vérifie si prospect existe DANS UNE ORGANISATION SPÉCIFIQUE
SELECT 1 FROM public.prospects 
WHERE email = p_email AND organization_id = p_organization_id
```
✅ **Permet déjà de détecter doublons PAR ORG** (pas global)

### 2️⃣ RPC `link_user_to_prospect_in_org` (create_link_user_to_prospect_in_org_rpc.sql)
```sql
-- Lie un user_id à un prospect PAR EMAIL + ORGANIZATION
UPDATE public.prospects
SET user_id = p_user_id
WHERE email = p_email AND organization_id = p_organization_id
```
✅ **Prévoit déjà de lier par (email + org)** au lieu de juste email

### 3️⃣ OrganizationContext (src/contexts/OrganizationContext.jsx, ligne 150-240)
```javascript
// Étape 2b : Chercher prospect dans l'org du hostname
const { data: existingProspect } = await supabase
  .from('prospects')
  .select('id, organization_id')
  .eq('user_id', authUserId)
  .eq('organization_id', hostnameOrgId)  // ✅ Filtre par org
  .maybeSingle();

// Si pas trouvé, essayer de lier via RPC
await supabase.rpc('link_user_to_prospect_in_org', {
  p_user_id: authUserId,
  p_email: userEmail,
  p_organization_id: hostnameOrgId  // ✅ Spécifie l'org
});
```
✅ **Le code frontend prévoit déjà le multi-org**

### 4️⃣ RegistrationPage (src/pages/RegistrationPage.jsx, ligne 130)
```javascript
// Multi-tenant : même email peut s'inscrire dans plusieurs organisations
const { data: prospectExists } = await supabase
  .rpc('check_prospect_exists_in_org', { 
    p_email: formData.email.trim(),
    p_organization_id: organizationId  // ✅ Check par org
  });

if (prospectExists) {
  toast({
    title: "Compte existant",
    description: "Un compte existe déjà avec cet email DANS CETTE ORGANISATION.",
  });
}
```
✅ **Message déjà prévu pour multi-org** ("dans cette organisation")

---

## 🔴 Problème : Contrainte `user_id UNIQUE`

### Scénario actuel
| Étape | Action | État DB | Résultat |
|-------|--------|---------|----------|
| 1 | tony.fabio@gmail.com s'inscrit chez **Org A** | Prospect A créé (email, org_id=A, user_id=NULL) | ✅ |
| 2 | Magic Link envoyé, Tony clique | `UPDATE prospects SET user_id=xxx WHERE email=... AND org_id=A` | ✅ user_id lié |
| 3 | Tony visite **locasun.evatime.fr** (Org B) | Hostname résolu → org_id=B | ✅ |
| 4 | Tony clique "Inscription" | Prospect B créé (email, org_id=B, user_id=NULL) | ✅ |
| 5 | Magic Link envoyé, Tony clique | `UPDATE prospects SET user_id=xxx WHERE email=... AND org_id=B` | ❌ **ERREUR UNIQUE CONSTRAINT** |

### Erreur PostgreSQL attendue
```
ERROR:  duplicate key value violates unique constraint "prospects_user_id_key"
DETAIL:  Key (user_id)=(xxx) already exists.
```

---

## ✅ Solution : Contrainte composite UNIQUE (email, organization_id, user_id)

### Changement requis dans schema.sql

#### Avant (ligne 203)
```sql
user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
```

#### Après
```sql
user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- Retirer UNIQUE
```

#### Ajouter contrainte composite (fin de CREATE TABLE)
```sql
-- Un user_id peut être lié à PLUSIEURS prospects (un par organisation)
-- Mais un prospect ne peut avoir qu'UN SEUL user_id
CONSTRAINT unique_user_per_org UNIQUE (user_id, organization_id)
```

### Migration SQL requise
```sql
-- 1. Retirer la contrainte UNIQUE sur user_id
ALTER TABLE public.prospects 
DROP CONSTRAINT IF EXISTS prospects_user_id_key;

-- 2. Ajouter contrainte composite (user_id + organization_id)
ALTER TABLE public.prospects
ADD CONSTRAINT unique_user_per_org UNIQUE (user_id, organization_id);

-- 3. Créer index pour performances
CREATE INDEX idx_prospects_user_org ON public.prospects(user_id, organization_id);
```

---

## 🧪 Scénario après fix

| Étape | Action | État DB | Résultat |
|-------|--------|---------|----------|
| 1 | tony.fabio@gmail.com → Org A | Prospect A (email, org_id=A, user_id=xxx) | ✅ |
| 2 | tony.fabio@gmail.com → Org B | Prospect B (email, org_id=B, user_id=xxx) | ✅ **Pas de conflit** |
| 3 | Tony se connecte sur rosca.evatime.fr | OrganizationContext résout org=A, charge Prospect A | ✅ |
| 4 | Tony se connecte sur locasun.evatime.fr | OrganizationContext résout org=B, charge Prospect B | ✅ |

### Requêtes App.jsx (loadAuthUser, ligne 760)
```javascript
// Chercher par user_id + organization_id (aucun fallback cross-tenant)
const { data: prospectByUser } = await supabase
  .from("prospects")
  .select("*")
  .eq("user_id", userId)
  .eq("organization_id", organizationId)  // ✅ Filtre par org
  .maybeSingle();
```
✅ **Code déjà prêt** : filtre déjà par (user_id + org_id)

---

## 📁 Fichiers concernés (AUCUNE MODIFICATION CODE)

| Fichier | État | Action requise |
|---------|------|----------------|
| `supabase/schema.sql` (ligne 203) | ⚠️ `user_id UUID UNIQUE` | ✅ Retirer UNIQUE, ajouter contrainte composite |
| `src/contexts/OrganizationContext.jsx` | ✅ Filtre déjà par org_id | ❌ Aucune |
| `src/App.jsx` (loadAuthUser) | ✅ Filtre déjà par org_id | ❌ Aucune |
| `src/pages/RegistrationPage.jsx` | ✅ Check déjà par org | ❌ Aucune |
| `create_link_user_to_prospect_in_org_rpc.sql` | ✅ RPC déjà prévue | ❌ Aucune |

---

## 🎯 Conclusion

### Ce qui marche déjà
1. ✅ Détection doublons PAR organisation (`check_prospect_exists_in_org`)
2. ✅ Liaison user_id PAR organisation (`link_user_to_prospect_in_org`)
3. ✅ Résolution organization_id par hostname (OrganizationContext)
4. ✅ Chargement prospect filtré par (user_id + org_id) dans App.jsx
5. ✅ Messages UI mentionnent "dans cette organisation"

### Ce qui bloque
❌ **UNE SEULE CONTRAINTE SQL** : `user_id UUID UNIQUE` dans `prospects`

### Fix requis
1. Migration SQL (3 lignes) : Retirer UNIQUE, ajouter contrainte composite
2. ✅ **Aucune modification code frontend** (déjà prévu)
3. ✅ **Aucune modification RPC** (déjà prêtes)

---

## 🚀 Migration à appliquer

```sql
-- Fichier : fix_multi_org_user_id_15fev2026.sql
-- Description : Permettre à un user_id d'être lié à plusieurs prospects (un par org)

-- Étape 1 : Retirer contrainte UNIQUE globale
ALTER TABLE public.prospects 
DROP CONSTRAINT IF EXISTS prospects_user_id_key;

-- Étape 2 : Ajouter contrainte composite (user_id peut apparaître N fois, mais 1 seule fois par org)
ALTER TABLE public.prospects
ADD CONSTRAINT unique_user_per_org UNIQUE (user_id, organization_id);

-- Étape 3 : Index pour optimiser les requêtes (user_id + organization_id)
CREATE INDEX IF NOT EXISTS idx_prospects_user_org 
ON public.prospects(user_id, organization_id) 
WHERE user_id IS NOT NULL;

-- Commentaire explicatif
COMMENT ON CONSTRAINT unique_user_per_org ON public.prospects IS 
'Permet à un même user_id (email) d''être client de plusieurs organisations.
Exemple : tony.fabio@gmail.com peut être client chez Org A ET Org B.
Chaque couple (user_id, organization_id) reste unique.';
```

**Temps d'exécution** : < 1 seconde (table prospects ~100-500 lignes)  
**Impact production** : ✅ Aucun (ajout de flexibilité, pas de suppression de données)

---

## 📝 Tests recommandés après migration

```javascript
// Test 1 : Inscription Tony chez Org A
await supabase.rpc('create_affiliated_prospect', {
  p_email: 'tony.fabio@gmail.com',
  p_name: 'Tony Fabio',
  p_host: 'rosca.evatime.fr'  // → org_id = Rosca
});

// Test 2 : Liaison user_id chez Org A
await supabase.rpc('link_user_to_prospect_in_org', {
  p_user_id: 'xxx-auth-uid',
  p_email: 'tony.fabio@gmail.com',
  p_organization_id: 'rosca-org-id'
});
// ✅ Doit réussir

// Test 3 : Inscription Tony chez Org B (MÊME EMAIL)
await supabase.rpc('create_affiliated_prospect', {
  p_email: 'tony.fabio@gmail.com',
  p_name: 'Tony Fabio',
  p_host: 'locasun.evatime.fr'  // → org_id = Locasun
});

// Test 4 : Liaison MÊME user_id chez Org B
await supabase.rpc('link_user_to_prospect_in_org', {
  p_user_id: 'xxx-auth-uid',  // MÊME user_id
  p_email: 'tony.fabio@gmail.com',
  p_organization_id: 'locasun-org-id'
});
// ✅ Doit réussir (avant fix : ERREUR UNIQUE CONSTRAINT)
```

---

**Prochaine étape** : Valider avec Jack si migration SQL à appliquer maintenant ou plus tard.
