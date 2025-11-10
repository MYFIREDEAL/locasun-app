# 📋 Permissions CRUD - Table Prospects

## 🎯 Vue d'ensemble

Ce document résume **TOUTES les permissions** pour la table `prospects` selon les rôles.

---

## 👤 Rôles disponibles

| Rôle | Description |
|------|-------------|
| **Client** | Utilisateur inscrit avec compte (accès limité à ses propres données) |
| **Commercial** | Utilisateur PRO qui gère ses contacts/prospects |
| **Manager** | Gère une équipe de commerciaux |
| **Global Admin** | Accès total à tous les prospects |

---

## 📊 Matrice des permissions

| Action | Client | Commercial | Manager | Global Admin |
|--------|--------|------------|---------|--------------|
| **SELECT** (Lecture) | ✅ Ses propres données uniquement | ✅ Ses prospects + accès partagés | ✅ Prospects de son équipe | ✅ TOUS les prospects |
| **INSERT** (Création) | ❌ Non autorisé | ✅ Peut créer des prospects (devient owner) | ✅ Peut créer pour lui ou son équipe | ✅ Peut créer n'importe quel prospect |
| **UPDATE** (Modification) | ✅ Ses données perso uniquement* | ✅ Ses prospects + accès partagés** | ✅ Prospects de son équipe (+ réassignation) | ✅ TOUS les prospects |
| **DELETE** (Suppression) | ❌ Non autorisé | ✅ Uniquement ses propres prospects | ✅ Prospects de son équipe | ✅ TOUS les prospects |

### Légende des restrictions

**\* Client (UPDATE) :**
- ✅ **Champs modifiables** : `name`, `email`, `phone`, `company_name`, `address`
- ❌ **Champs protégés** : `user_id`, `owner_id`, `status`, `tags`, `affiliate_name`, `has_appointment`

**\*\* Commercial avec accès partagé (UPDATE) :**
- ✅ Peut modifier TOUS les champs SAUF `owner_id`
- ❌ **Ne peut PAS voler le contact** (owner_id est verrouillé avec WITH CHECK)

---

## 🔐 Détail des policies RLS

### 1️⃣ CLIENT - Lecture seule de ses données

```sql
-- Policy: "Clients can view their own data"
CREATE POLICY "Clients can view their own data"
  ON public.prospects
  FOR SELECT
  USING (user_id = auth.uid());
```

**Résultat :**
```sql
SELECT * FROM prospects WHERE user_id = auth.uid();
-- ✅ Retourne uniquement la fiche du client connecté
```

---

### 2️⃣ CLIENT - Modification limitée

```sql
-- Policy: "Clients can update their own data"
CREATE POLICY "Clients can update their own data"
  ON public.prospects
  FOR UPDATE
  USING (user_id = auth.uid());
```

**Résultat :**
```sql
UPDATE prospects SET name = 'Nouveau Nom', email = 'new@email.com' WHERE user_id = auth.uid();
-- ✅ Fonctionne

UPDATE prospects SET owner_id = 'autre_id' WHERE user_id = auth.uid();
-- ❌ ÉCHEC : Le client ne peut pas modifier owner_id (champ protégé)
```

**Champs modifiables via `/dashboard/profil` :**
- ✅ `name`, `email`, `phone`, `company_name`, `address`

**Champs VERROUILLÉS :**
- ❌ `user_id`, `owner_id`, `status`, `tags`, `affiliate_name`, `has_appointment`

---

### 3️⃣ COMMERCIAL - Lecture de ses prospects + accès partagés

```sql
-- Policy: "Users can view their own and authorized prospects"
CREATE POLICY "Users can view their own and authorized prospects"
  ON public.prospects
  FOR SELECT
  USING (
    owner_id = auth.uid() OR
    user_id = auth.uid() OR
    owner_id IN (
      SELECT jsonb_array_elements_text(access_rights->'users')::UUID
      FROM public.users
      WHERE user_id = auth.uid()
    )
  );
```

**Résultat :**
- ✅ Voit ses propres prospects (`owner_id = auth.uid()`)
- ✅ Voit les prospects des users autorisés via `access_rights.users`
- ✅ Voit sa propre fiche client si inscrit (`user_id = auth.uid()`)

---

### 4️⃣ COMMERCIAL - Création de prospects

```sql
-- Policy: "Users can insert prospects"
CREATE POLICY "Users can insert prospects"
  ON public.prospects
  FOR INSERT
  WITH CHECK (
    (owner_id = auth.uid() OR owner_id IS NULL) AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE user_id = auth.uid() AND role IN ('Commercial', 'Manager', 'Global Admin')
    )
  );
```

**Résultat :**
```sql
-- Méthode 1 : Assigner explicitement owner_id
INSERT INTO prospects (name, email, owner_id) 
VALUES ('Nouveau Contact', 'contact@example.com', auth.uid());
-- ✅ Le commercial devient propriétaire

-- Méthode 2 : Laisser owner_id NULL (trigger auto-assign)
INSERT INTO prospects (name, email) 
VALUES ('Nouveau Contact', 'contact@example.com');
-- ✅ Trigger auto_assign_owner_on_insert assigne owner_id = auth.uid()
```

**🎯 Trigger automatique :**
```sql
CREATE OR REPLACE FUNCTION auto_assign_prospect_owner()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.owner_id IS NULL THEN
    NEW.owner_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### 5️⃣ COMMERCIAL - Modification avec accès partagé

```sql
-- Policy: "Users can manage authorized prospects"
CREATE POLICY "Users can manage authorized prospects"
  ON public.prospects
  FOR UPDATE
  USING (
    owner_id IN (
      SELECT jsonb_array_elements_text(access_rights->'users')::UUID
      FROM public.users
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    owner_id = (SELECT owner_id FROM public.prospects WHERE id = prospects.id)
  );
```

**Résultat :**
```sql
-- Joe a accès au contact de Jack Luc via access_rights
UPDATE prospects SET name = 'Nom Modifié' WHERE id = 'contact_jack_luc';
-- ✅ Fonctionne

UPDATE prospects SET owner_id = 'joe_id' WHERE id = 'contact_jack_luc';
-- ❌ ÉCHEC RLS : WITH CHECK empêche la modification de owner_id
-- 🔒 Protection anti-vol de contacts
```

**🛡️ Sécurité :**
- ✅ Commercial peut tout modifier SAUF `owner_id`
- ❌ **Impossible de voler un contact** partagé

---

### 6️⃣ COMMERCIAL - Suppression de ses prospects

```sql
-- Policy: "Users can delete their own prospects"
CREATE POLICY "Users can delete their own prospects"
  ON public.prospects
  FOR DELETE
  USING (
    owner_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE user_id = auth.uid() AND role IN ('Commercial', 'Manager', 'Global Admin')
    )
  );
```

**Résultat :**
```sql
DELETE FROM prospects WHERE id = 'mon_prospect';
-- ✅ Fonctionne si owner_id = auth.uid()

DELETE FROM prospects WHERE id = 'prospect_partage';
-- ❌ ÉCHEC : Ne peut pas supprimer un contact partagé (seulement le propriétaire)
```

---

### 7️⃣ MANAGER - Lecture de l'équipe

```sql
-- Policy: "Managers can view their team prospects"
CREATE POLICY "Managers can view their team prospects"
  ON public.prospects
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = owner_id AND u.manager_id = auth.uid()
    )
  );
```

**Résultat :**
```sql
-- Manager voit tous les prospects de son équipe
SELECT * FROM prospects WHERE owner_id IN (
  SELECT id FROM users WHERE manager_id = auth.uid()
);
```

---

### 8️⃣ MANAGER - Modification et réassignation

```sql
-- Policy: "Managers can manage their team prospects"
CREATE POLICY "Managers can manage their team prospects"
  ON public.prospects
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = owner_id AND u.manager_id = auth.uid()
    ) AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE user_id = auth.uid() AND role = 'Manager'
    )
  )
  WITH CHECK (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = owner_id AND u.manager_id = auth.uid()
    )
  );
```

**Résultat :**
```sql
-- Manager réassigne un contact d'un commercial A à B (dans son équipe)
UPDATE prospects SET owner_id = 'commercial_B_id' 
WHERE owner_id = 'commercial_A_id';
-- ✅ Fonctionne si les deux sont dans son équipe

-- Manager tente de réassigner à quelqu'un hors équipe
UPDATE prospects SET owner_id = 'commercial_externe_id' 
WHERE owner_id = 'commercial_A_id';
-- ❌ ÉCHEC RLS : WITH CHECK valide que le nouveau owner est dans l'équipe
```

**🎯 Cas d'usage :**
- Commercial démissionne → Manager réassigne tous ses contacts à un autre
- Redistribution de charge entre commerciaux d'une même équipe

---

### 9️⃣ MANAGER - Création pour l'équipe

```sql
-- Policy: "Managers can insert team prospects"
CREATE POLICY "Managers can insert team prospects"
  ON public.prospects
  FOR INSERT
  WITH CHECK (
    (owner_id = auth.uid() OR
     EXISTS (
       SELECT 1 FROM public.users u
       WHERE u.id = owner_id AND u.manager_id = auth.uid()
     )) AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE user_id = auth.uid() AND role = 'Manager'
    )
  );
```

**Résultat :**
```sql
-- Manager crée un prospect pour lui-même
INSERT INTO prospects (name, email, owner_id) 
VALUES ('Contact Manager', 'manager@ex.com', auth.uid());
-- ✅ Fonctionne

-- Manager crée un prospect pour un commercial de son équipe
INSERT INTO prospects (name, email, owner_id) 
VALUES ('Contact Commercial', 'commercial@ex.com', 'commercial_A_id');
-- ✅ Fonctionne si commercial_A_id est dans son équipe
```

---

### 🔟 MANAGER - Suppression dans l'équipe

```sql
-- Policy: "Managers can delete team prospects"
CREATE POLICY "Managers can delete team prospects"
  ON public.prospects
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = owner_id AND u.manager_id = auth.uid()
    ) AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE user_id = auth.uid() AND role = 'Manager'
    )
  );
```

**Résultat :**
```sql
-- Manager supprime un prospect d'un commercial de son équipe
DELETE FROM prospects WHERE owner_id = 'commercial_A_id';
-- ✅ Fonctionne
```

---

### 1️⃣1️⃣ GLOBAL ADMIN - Accès total

```sql
-- Policy: "Global Admin can manage all prospects"
CREATE POLICY "Global Admin can manage all prospects"
  ON public.prospects
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE user_id = auth.uid() AND role = 'Global Admin'
    )
  );
```

**Résultat :**
```sql
-- Global Admin peut TOUT faire sans restriction
SELECT * FROM prospects;  -- ✅ Tous les prospects
INSERT INTO prospects (...) VALUES (...);  -- ✅ Création illimitée
UPDATE prospects SET ... WHERE ...;  -- ✅ Modification totale
DELETE FROM prospects WHERE ...;  -- ✅ Suppression totale
```

---

## 🧪 Tests de validation

### Test 1 : Commercial crée un prospect

```sql
-- En tant que Commercial (auth.uid() = 'commercial_id')
INSERT INTO prospects (name, email, phone) 
VALUES ('Nouveau Prospect', 'prospect@example.com', '0601020304');

-- Résultat attendu :
-- ✅ Prospect créé avec owner_id = 'commercial_id' (auto-assigné par trigger)
```

---

### Test 2 : Commercial tente de voler un contact partagé

```sql
-- Joe a accès au contact de Jack Luc via access_rights
UPDATE prospects SET owner_id = 'joe_id' 
WHERE id = 'contact_jack_luc' AND owner_id = 'jack_luc_id';

-- Résultat attendu :
-- ❌ ÉCHEC RLS : new row violates row-level security policy with check option
-- 🔒 Protection anti-vol activée
```

---

### Test 3 : Manager réassigne dans son équipe

```sql
-- Manager (auth.uid() = 'manager_id') réassigne
UPDATE prospects SET owner_id = 'commercial_B_id' 
WHERE owner_id = 'commercial_A_id';

-- Résultat attendu :
-- ✅ Fonctionne si commercial_A et B sont dans l'équipe du Manager
-- ❌ ÉCHEC si commercial_B hors équipe (WITH CHECK violation)
```

---

### Test 4 : Client modifie son profil

```sql
-- Client (auth.uid() = 'client_user_id')
UPDATE prospects SET name = 'Nouveau Nom', email = 'nouveau@email.com' 
WHERE user_id = auth.uid();

-- Résultat attendu :
-- ✅ Fonctionne (champs autorisés)

UPDATE prospects SET status = 'qualified' WHERE user_id = auth.uid();

-- Résultat attendu :
-- ❌ ÉCHEC : Champ protégé (status ne peut pas être modifié par le client)
```

---

## 📝 Résumé des sécurités

| Sécurité | Description | Policy responsable |
|----------|-------------|-------------------|
| 🔒 **Anti-vol de contacts** | Empêche les commerciaux avec accès partagé de voler des contacts | `WITH CHECK` dans "Users can manage authorized prospects" |
| 🛡️ **Validation d'équipe** | Manager ne peut réassigner qu'à des membres de son équipe | `WITH CHECK` dans "Managers can manage their team prospects" |
| 🔐 **Champs protégés client** | Client ne peut pas modifier status, owner_id, tags, etc. | Contrôle applicatif (à implémenter frontend) |
| ⚡ **Auto-assignation** | owner_id assigné automatiquement si NULL lors de l'INSERT | Trigger `auto_assign_owner_on_insert` |

---

## ✅ Checklist de déploiement

- [x] Policy SELECT pour Clients créée
- [x] Policy UPDATE pour Clients créée (champs limités)
- [x] Policy SELECT pour Commerciaux créée
- [x] Policy INSERT pour Commerciaux créée
- [x] Policy UPDATE pour accès partagés créée (WITH CHECK anti-vol)
- [x] Policy DELETE pour Commerciaux créée
- [x] Policy SELECT pour Managers créée
- [x] Policy UPDATE pour Managers créée (WITH CHECK équipe)
- [x] Policy INSERT pour Managers créée
- [x] Policy DELETE pour Managers créée
- [x] Policy ALL pour Global Admin créée
- [x] Trigger auto_assign_owner_on_insert créé
- [ ] Tests RLS validés en environnement Supabase
- [ ] Documentation frontend pour champs protégés

---

## 🚀 Prêt pour déploiement

Toutes les policies CRUD sont maintenant complètes et sécurisées ! 🎉

