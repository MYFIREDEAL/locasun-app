# 🔧 Guide Multi-Tenant Isolation - EVATIME

## 📋 Contexte

EVATIME est une plateforme SaaS multi-tenant où chaque organisation (Rosca Finance, GorillaFinal, etc.) doit voir **uniquement ses propres données**.

---

## ✅ Ce qui a été fait (21 janvier 2026)

### Tables isolées par `organization_id` :
- `prospects`, `users`
- `project_templates`, `global_pipeline_steps`
- `forms`, `prompts`, `contract_templates`
- `project_files`, `project_history`, `project_notes`, `project_steps_status`
- `client_form_panels`, `organization_settings`

### Hooks modifiés :
- ✅ `useSupabaseProjectTemplates` - Filtre + INSERT avec org
- ✅ `useSupabaseGlobalPipeline` - Filtre + INSERT avec org
- ✅ `useSupabaseForms` - Filtre + INSERT avec org

### Hooks à modifier :
- ⏳ `useSupabaseContractTemplates` - Templates de contrats
- ⏳ `useSupabasePrompts` - Workflows Charly AI

---

## 🔧 Méthode pour isoler une nouvelle table

### Étape 1 : Ajouter la colonne `organization_id`

```sql
ALTER TABLE ma_table 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
```

### Étape 2 : Assigner les données existantes à EVATIME

```sql
UPDATE ma_table
SET organization_id = '06bb4924-7eaa-47bc-a671-2f283d58cdc0'
WHERE organization_id IS NULL;
```

### Étape 3 : Créer les RLS policies strictes

```sql
-- Supprimer les anciennes policies permissives
DROP POLICY IF EXISTS "ancienne_policy" ON ma_table;

-- Nouvelles policies STRICTES (pas de fallback NULL)
CREATE POLICY "ma_table_select_same_org" ON ma_table
  FOR SELECT TO authenticated
  USING (organization_id = get_my_organization_id());

CREATE POLICY "ma_table_insert_same_org" ON ma_table
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_my_organization_id());

CREATE POLICY "ma_table_update_same_org" ON ma_table
  FOR UPDATE TO authenticated
  USING (organization_id = get_my_organization_id());

CREATE POLICY "ma_table_delete_same_org" ON ma_table
  FOR DELETE TO authenticated
  USING (organization_id = get_my_organization_id());
```

### Étape 4 : Modifier le hook frontend

```javascript
// src/hooks/useSupabaseXxx.js

// 1. Accepter organizationId en paramètre
export function useSupabaseXxx(organizationId = null) {
  
  // 2. Ne rien charger si pas d'org
  useEffect(() => {
    if (!organizationId) {
      setData([]);
      setLoading(false);
      return;
    }
    fetchData();
  }, [organizationId]);

  // 3. Filtrer les SELECT
  const fetchData = async () => {
    const { data } = await supabase
      .from('ma_table')
      .select('*')
      .eq('organization_id', organizationId);  // 🔥 Filtrer !
  };

  // 4. Inclure organization_id dans les INSERT
  const addItem = async (itemData) => {
    if (!organizationId) {
      throw new Error('organization_id requis');
    }
    
    const dataWithOrg = {
      ...itemData,
      organization_id: organizationId  // 🔥 Forcé !
    };
    
    const { data } = await supabase
      .from('ma_table')
      .insert([dataWithOrg])
      .select()
      .single();
  };
}
```

### Étape 5 : Passer `organizationId` depuis les pages

```javascript
// src/pages/admin/MaPage.jsx
import { useOrganization } from '@/contexts/OrganizationContext';

const MaPage = () => {
  const { organizationId } = useOrganization();
  
  const { data, addItem } = useSupabaseXxx(organizationId);
  
  // ...
};
```

---

## 🔍 Commandes SQL utiles

### Vérifier les données NULL (non assignées)
```sql
SELECT 'project_templates' as table_name, COUNT(*) as null_count 
FROM project_templates WHERE organization_id IS NULL
UNION ALL
SELECT 'forms', COUNT(*) FROM forms WHERE organization_id IS NULL
UNION ALL
SELECT 'prompts', COUNT(*) FROM prompts WHERE organization_id IS NULL
UNION ALL
SELECT 'contract_templates', COUNT(*) FROM contract_templates WHERE organization_id IS NULL
UNION ALL
SELECT 'global_pipeline_steps', COUNT(*) FROM global_pipeline_steps WHERE organization_id IS NULL;
```

### Voir les policies RLS d'une table
```sql
SELECT policyname, cmd, qual::text as using_expr
FROM pg_policies 
WHERE tablename = 'ma_table';
```

### Vérifier si une table a `organization_id`
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'ma_table' AND column_name = 'organization_id';
```

### Tester `get_my_organization_id()`
```sql
SELECT get_my_organization_id();
```

---

## 🐛 Problème courant : Logo qui change / Flash de branding

### Symptôme
Le logo passe de "Rosca Finance Pro" à "Admin Pro" lors de la navigation.

### Cause
Le contexte `organizationId` passe par 3 états :
1. `null` / `null` → Initial
2. `null` / `userId` → User connecté mais org pas encore résolue
3. `orgId` / `userId` → Finalement correct

Pendant l'état 2, les hooks chargent sans filtre org.

### Solution
Bloquer le render de `AdminLayout` tant que `organizationId` n'est pas prêt :

```javascript
// src/layouts/AdminLayout.jsx
const { organizationId, organizationLoading } = useOrganization();

if (!adminReady || organizationLoading || !organizationId) {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
    </div>
  );
}
```

---

## 📁 Fichiers clés

| Fichier | Rôle |
|---------|------|
| `src/contexts/OrganizationContext.jsx` | Résout `organizationId` depuis l'user connecté |
| `src/hooks/useBranding.js` | Charge logo/nom depuis `organization_settings` |
| `src/layouts/AdminLayout.jsx` | Layout admin, attend `organizationId` |
| `src/hooks/useSupabaseXxx.js` | Hooks CRUD, doivent filtrer par org |

---

## 🏢 Organisations de test

| Nom | organization_id |
|-----|-----------------|
| EVATIME (plateforme) | `06bb4924-7eaa-47bc-a671-2f283d58cdc0` |
| Rosca Finance | `adbf7624-9e6c-4960-b9dd-52696d94bfe2` |
| GorillaFinal | `c64985b6-322b-4a0c-ac23-3b25325a49f8` |

---

## ✅ Checklist avant de considérer une table "isolée"

- [ ] Colonne `organization_id` ajoutée
- [ ] Données NULL assignées à EVATIME
- [ ] RLS policies strictes (SELECT/INSERT/UPDATE/DELETE)
- [ ] Hook modifié pour accepter `organizationId`
- [ ] Hook filtre les SELECT par org
- [ ] Hook inclut org dans les INSERT
- [ ] Pages passent `organizationId` au hook
- [ ] Testé avec 2 orgs différentes

---

*Dernière mise à jour : 21 janvier 2026 - 01h30*
