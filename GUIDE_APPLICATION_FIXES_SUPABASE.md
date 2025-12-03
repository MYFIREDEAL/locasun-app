# 🚀 GUIDE D'APPLICATION DES FIXES SUPABASE

**Date :** 3 décembre 2025  
**Durée estimée :** 5 minutes  

---

## 📋 PROBLÈMES À CORRIGER

### 🔴 Problème 1: Tags disparaissent après modification profil client
**Symptôme :** Client modifie son téléphone → tous ses projets (tags) disparaissent  
**Fichier SQL :** `fix_tags_coalesce_bug.sql`

### 🔴 Problème 2: Yann Barberis n'apparaît pas dans le pipeline
**Symptôme :** Prospect existe en DB mais invisible dans interface (colonne "Intéressé" obsolète)  
**Fichier SQL :** `migrate_old_status_to_pipeline_steps.sql`

---

## 🎯 PROCÉDURE D'APPLICATION

### Étape 1 : Ouvrir Supabase SQL Editor

1. Aller sur https://supabase.com/dashboard/project/vvzxvtiyybilkswslqfn
2. Cliquer sur **SQL Editor** dans le menu gauche (icône </> )
3. Cliquer sur **New query** (ou bouton **+**)

---

### Étape 2 : FIX 1 - Corriger le bug tags qui disparaissent

**Copier/coller le contenu du fichier `fix_tags_coalesce_bug.sql` :**

```sql
DROP FUNCTION IF EXISTS public.update_own_prospect_profile(jsonb);

CREATE OR REPLACE FUNCTION public.update_own_prospect_profile(
  _data JSONB
)
RETURNS SETOF public.prospects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_user_id UUID;
  v_prospect RECORD;
BEGIN
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_prospect
  FROM public.prospects
  WHERE user_id = v_current_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prospect profile not found for this user';
  END IF;

  RETURN QUERY
  UPDATE public.prospects
  SET
    name = COALESCE((_data->>'name'), name),
    email = COALESCE((_data->>'email'), email),
    phone = COALESCE((_data->>'phone'), phone),
    company_name = COALESCE((_data->>'company_name'), company_name),
    address = COALESCE((_data->>'address'), address),
    form_data = COALESCE((_data->'form_data')::JSONB, form_data),
    tags = CASE 
      WHEN _data ? 'tags' THEN ARRAY(SELECT jsonb_array_elements_text(_data->'tags'))
      ELSE tags
    END,
    updated_at = NOW()
  WHERE user_id = v_current_user_id
  RETURNING *;

END;
$$;

GRANT EXECUTE ON FUNCTION public.update_own_prospect_profile(JSONB) TO authenticated;
```

**Cliquer sur le bouton ▶️ RUN en bas à droite**

**Résultat attendu :** ✅ `Success. No rows returned`

---

### Étape 3 : FIX 2 - Migrer les anciens status vers pipeline

**Créer une NOUVELLE query (bouton + ou New query)**

**Copier/coller le contenu du fichier `migrate_old_status_to_pipeline_steps.sql` :**

```sql
-- Voir Yann Barberis AVANT migration
SELECT 
  name, email, status
FROM public.prospects
WHERE LOWER(name) LIKE '%yann%' AND LOWER(name) LIKE '%barberis%';

-- Migration automatique
DO $$
DECLARE
  v_market_step_id TEXT;
  v_etude_step_id TEXT;
  v_offre_step_id TEXT;
BEGIN
  -- Récupérer les colonnes pipeline
  SELECT step_id INTO v_market_step_id 
  FROM public.global_pipeline_steps 
  WHERE position = 0;
  
  SELECT step_id INTO v_etude_step_id 
  FROM public.global_pipeline_steps 
  WHERE position = 1;
  
  SELECT step_id INTO v_offre_step_id 
  FROM public.global_pipeline_steps 
  WHERE position = 2;
  
  RAISE NOTICE 'MARKET (pos 0): %', v_market_step_id;
  RAISE NOTICE 'ETUDE (pos 1): %', v_etude_step_id;
  RAISE NOTICE 'OFFRE (pos 2): %', v_offre_step_id;
  
  -- Migrer "Intéressé" → MARKET
  UPDATE public.prospects
  SET status = v_market_step_id
  WHERE status = 'Intéressé';
  
  RAISE NOTICE 'Migrés vers MARKET: %', (SELECT COUNT(*) FROM public.prospects WHERE status = v_market_step_id);
  
  -- Migrer "Qualifié" → ETUDE
  UPDATE public.prospects
  SET status = v_etude_step_id
  WHERE status IN ('Qualification', 'Qualifié', 'En cours');
  
  -- Migrer "Proposition" → OFFRE
  UPDATE public.prospects
  SET status = v_offre_step_id
  WHERE status IN ('Proposition', 'Négociation', 'Devis envoyé');
  
  -- Invalides → MARKET
  UPDATE public.prospects
  SET status = v_market_step_id
  WHERE status NOT IN (SELECT step_id FROM public.global_pipeline_steps);
  
END $$;

-- Voir Yann Barberis APRÈS migration
SELECT 
  p.name, 
  p.email, 
  p.status,
  gps.label as colonne_pipeline
FROM public.prospects p
LEFT JOIN public.global_pipeline_steps gps ON p.status = gps.step_id
WHERE LOWER(p.name) LIKE '%yann%' AND LOWER(p.name) LIKE '%barberis%';
```

**Cliquer sur ▶️ RUN**

**Résultat attendu :**
```
NOTICE: MARKET (pos 0): default-global-pipeline-step-0
NOTICE: ETUDE (pos 1): default-global-pipeline-step-1
NOTICE: OFFRE (pos 2): default-global-pipeline-step-2
NOTICE: Migrés vers MARKET: X

name          | email              | status                             | colonne_pipeline
--------------|--------------------|------------------------------------|------------------
Yann Barberis | yann@example.com   | default-global-pipeline-step-0     | MARKET
```

---

## ✅ VÉRIFICATION

### Test 1 : Tags préservés
1. Se connecter en tant que **client** : https://locasun-app.vercel.app/dashboard
2. Aller dans **Profil**
3. Modifier le téléphone
4. Cliquer sur **Enregistrer**
5. **Vérifier que les projets sont toujours là** ✅

### Test 2 : Yann Barberis visible
1. Se connecter en tant que **admin** : https://locasun-app.vercel.app/admin
2. Aller dans **Pipeline**
3. **Yann Barberis doit apparaître dans la colonne MARKET** ✅

---

## 🐛 EN CAS DE PROBLÈME

### Si les prospects restent invisibles après migration

**Vérifier les step_id réels :**
```sql
SELECT step_id, label, position 
FROM public.global_pipeline_steps 
ORDER BY position;
```

**Vérifier les status des prospects :**
```sql
SELECT DISTINCT p.status, gps.label
FROM public.prospects p
LEFT JOIN public.global_pipeline_steps gps ON p.status = gps.step_id;
```

**Si des prospects ont `status = NULL` dans la colonne `label` :**  
→ Leurs status ne correspondent à aucun step_id du pipeline  
→ Relancer le script de migration

---

## 📊 IMPACT ATTENDU

**Avant :**
- ❌ Client perd ses projets en modifiant son profil
- ❌ Yann Barberis invisible (status "Intéressé" obsolète)
- ❌ Mélange d'anciens et nouveaux status en DB

**Après :**
- ✅ Client peut modifier son profil sans perdre ses projets
- ✅ Yann Barberis visible dans colonne MARKET
- ✅ Tous les prospects ont un status valide du pipeline Supabase
- ✅ Plus d'anciens status localStorage

---

**Durée totale :** ~5 minutes  
**Status :** ⏳ EN ATTENTE D'EXÉCUTION MANUELLE SUR SUPABASE
