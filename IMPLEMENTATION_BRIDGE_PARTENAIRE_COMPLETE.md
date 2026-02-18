# ✅ IMPLÉMENTATION BRIDGE PARTENAIRE - Documentation

**Date**: 2026-02-18  
**Fichiers modifiés**:
- `src/hooks/useWorkflowExecutor.js` (export fonction)
- `src/lib/executeActionOrderV2.js` (ajout case PARTENAIRE)

---

## 📝 MODIFICATIONS APPLIQUÉES

### 1️⃣ Export de `executePartnerTaskAction`

**Fichier**: `src/hooks/useWorkflowExecutor.js`  
**Ligne**: 372

```diff
- async function executePartnerTaskAction({ action, prospectId, projectType }) {
+ export async function executePartnerTaskAction({ action, prospectId, projectType }) {
```

**Justification**: Permet à `executeActionOrderV2.js` d'importer la fonction.

---

### 2️⃣ Import dans `executeActionOrderV2.js`

**Fichier**: `src/lib/executeActionOrderV2.js`  
**Ligne**: 29 (après les autres imports)

```javascript
import { executePartnerTaskAction } from '@/hooks/useWorkflowExecutor';
```

---

### 3️⃣ Logique PARTENAIRE avec Query Supabase

**Fichier**: `src/lib/executeActionOrderV2.js`  
**Ligne**: 133 (avant le switch actionType)

#### Architecture du code ajouté

```
1. Check order.target === 'PARTENAIRE'
     ↓
2. SELECT prospects.organization_id WHERE id = order.prospectId
     ↓
3. SELECT workflow_module_templates.config 
   WHERE organization_id + project_type + module_id
     ↓
4. Extraire config.actionConfig.partnerId / instructions / isBlocking
     ↓
5. Validation partnerId présent
     ↓
6. Appel executePartnerTaskAction() [V1]
     ↓
7. Return ExecutionResult
```

#### Requêtes Supabase Exactes

**Query 1: Récupérer organization_id du prospect**

```javascript
const { data: prospectData, error: prospectError } = await supabase
  .from('prospects')
  .select('organization_id')
  .eq('id', order.prospectId)
  .single();
```

**Query 2: Récupérer config du module**

```javascript
const { data: templateData, error: templateError } = await supabase
  .from('workflow_module_templates')
  .select('config')
  .eq('organization_id', prospectData.organization_id)
  .eq('project_type', order.projectType)
  .eq('module_id', order.moduleId)
  .single();
```

**Extraction de actionConfig**

```javascript
const actionConfig = templateData.config?.actionConfig || {};
// Champs attendus:
// - partnerId: UUID
// - instructions: string
// - isBlocking: boolean
```

---

## 🧪 TESTS MANUELS

### ✅ Test 1: V1 Inchangé (Régression Check)

**Objectif**: Vérifier que workflows V1 fonctionnent toujours

```bash
# 1. Ouvrir ProspectDetailsAdmin.jsx
# 2. Onglet "Workflows Charly" (V1)
# 3. Créer action "Associée au partenaire"
# 4. Déclencher workflow
# 5. Vérifier mission créée en DB

# Query vérification:
SELECT * FROM missions 
WHERE prospect_id = '<prospect_id>' 
ORDER BY created_at DESC LIMIT 1;

# ✅ Attendu:
# - Mission créée avec partner_id
# - status = 'pending'
# - is_blocking = true/false selon config
```

### ✅ Test 2: V2 Config Manquante (Error Handling)

**Objectif**: Vérifier toast d'erreur si module non configuré

```javascript
// Simuler ActionOrder avec target='PARTENAIRE' mais module non config
const order = {
  id: 'test-123',
  version: 'v2.0',
  target: 'PARTENAIRE',
  actionType: 'FORM',
  prospectId: '<prospect_id_valide>',
  projectType: 'ACC',
  moduleId: 'module_non_existant', // ← Module jamais configuré
  _meta: { isSimulation: false },
};

// Exécuter
import { executeActionOrder } from '@/lib/executeActionOrderV2';
const result = await executeActionOrder(order, { organizationId: 'xxx' });

// ✅ Attendu:
// - Toast "Configuration manquante"
// - result.success = false
// - result.status = 'error'
// - result.message = 'Configuration module introuvable'
// - Aucune mission créée en DB
```

### ✅ Test 3: V2 partnerId Manquant (Validation)

**Objectif**: Vérifier validation partnerId

**Prérequis**: Créer config sans partnerId

```sql
-- Insérer config SANS partnerId
INSERT INTO workflow_module_templates (organization_id, project_type, module_id, config)
VALUES (
  '<org_id>',
  'ACC',
  'module_test_partenaire',
  '{
    "objective": "Test",
    "instructions": "Test",
    "actionConfig": {
      "targetAudience": "PARTENAIRE",
      "actionType": "FORM"
    }
  }'::jsonb
);
```

```javascript
// Exécuter ActionOrder sur ce module
const order = {
  target: 'PARTENAIRE',
  prospectId: '<prospect_id>',
  projectType: 'ACC',
  moduleId: 'module_test_partenaire',
  _meta: { isSimulation: false },
};

const result = await executeActionOrder(order, {});

// ✅ Attendu:
// - Toast "Configuration incomplète"
// - result.success = false
// - result.message = 'partnerId manquant dans actionConfig'
// - Aucune mission créée
```

### ✅ Test 4: V2 Bridge Fonctionnel (Happy Path)

**Objectif**: Vérifier création mission via V2

**Prérequis**: Config complète avec partnerId

```sql
-- 1. Créer partenaire actif
INSERT INTO partners (id, organization_id, company_name, contact_email, is_active)
VALUES (
  'partner-test-uuid',
  '<org_id>',
  'Partenaire Test',
  'test@partner.com',
  true
);

-- 2. Créer config module avec partnerId
INSERT INTO workflow_module_templates (organization_id, project_type, module_id, config)
VALUES (
  '<org_id>',
  'ACC',
  'module_visite_technique',
  '{
    "objective": "Organiser visite technique",
    "instructions": "Envoyer partenaire sur site",
    "actionConfig": {
      "targetAudience": "PARTENAIRE",
      "actionType": "FORM",
      "partnerId": "partner-test-uuid",
      "instructions": "Effectuer visite complète et remplir rapport",
      "isBlocking": true
    }
  }'::jsonb
);
```

```javascript
// Exécuter ActionOrder
const order = {
  id: 'order-456',
  target: 'PARTENAIRE',
  prospectId: '<prospect_id>',
  projectType: 'ACC',
  moduleId: 'module_visite_technique',
  _meta: { isSimulation: false },
};

const result = await executeActionOrder(order, { organizationId: '<org_id>' });

// ✅ Attendu:
// - result.success = true
// - result.status = 'executed'
// - result.message = 'Mission partenaire créée avec succès'
// - result.data.partnerId = 'partner-test-uuid'
// - result.data.isBlocking = true
```

**Vérification DB**:

```sql
SELECT 
  m.id,
  m.partner_id,
  m.prospect_id,
  m.project_type,
  m.description,
  m.status,
  m.is_blocking,
  p.company_name
FROM missions m
JOIN partners p ON p.id = m.partner_id
WHERE m.prospect_id = '<prospect_id>'
  AND m.project_type = 'ACC'
ORDER BY m.created_at DESC
LIMIT 1;

-- ✅ Attendu:
-- partner_id: 'partner-test-uuid'
-- description: 'Effectuer visite complète et remplir rapport'
-- status: 'pending'
-- is_blocking: true
-- company_name: 'Partenaire Test'
```

---

## 🔄 ROLLBACK COMPLET

Si problème détecté après déploiement :

### Étape 1: Identifier les modifications

```bash
cd "/Users/jackluc/Desktop/LOCASUN  SUPABASE"
git diff HEAD src/hooks/useWorkflowExecutor.js
git diff HEAD src/lib/executeActionOrderV2.js
```

### Étape 2: Rollback via Git

```bash
# Option A: Rollback des 2 fichiers
git checkout HEAD~1 -- src/hooks/useWorkflowExecutor.js
git checkout HEAD~1 -- src/lib/executeActionOrderV2.js

# Option B: Rollback commit entier
git revert HEAD --no-commit
git commit -m "Rollback: Bridge PARTENAIRE (détection bug)"
```

### Étape 3: Rollback manuel (si Git indisponible)

**Fichier 1**: `src/hooks/useWorkflowExecutor.js` ligne 372

```diff
- export async function executePartnerTaskAction({ action, prospectId, projectType }) {
+ async function executePartnerTaskAction({ action, prospectId, projectType }) {
```

**Fichier 2**: `src/lib/executeActionOrderV2.js`

```diff
# Ligne 29: Supprimer import
- import { executePartnerTaskAction } from '@/hooks/useWorkflowExecutor';

# Lignes 133-255: Supprimer bloc PARTENAIRE complet
- if (order.target === 'PARTENAIRE') {
-   // ... (tout le bloc)
- }
```

### Étape 4: Vérifier rollback

```bash
npm run dev
# Tester V1 workflows fonctionnent
# Tester V2 ne crash pas (ignore PARTENAIRE)
```

---

## 📊 LOGS DEBUG

Logs générés par l'implémentation (visible en console) :

```javascript
// Entrée PARTENAIRE
logV2('🤝 executeActionOrder PARTENAIRE - Récupération config', { 
  orderId, moduleId, projectType, prospectId 
});

// Erreur prospect
logV2('❌ executeActionOrder PARTENAIRE - Prospect non trouvé', { 
  error, prospectId 
});

// Erreur config
logV2('⚠️ executeActionOrder PARTENAIRE - Config module non trouvée', { 
  error, organizationId, projectType, moduleId 
});

// Erreur partnerId
logV2('⚠️ executeActionOrder PARTENAIRE - partnerId manquant', { 
  orderId, moduleId, actionConfig 
});

// Succès
logV2('✅ executeActionOrder PARTENAIRE - Mission créée', { 
  orderId, moduleId, partnerId, isBlocking 
});
```

**Activation logs V2**:

```javascript
// src/lib/workflowV2Config.js
export const ENABLE_V2_LOGS = true; // ← Activer pour debug
```

---

## 🔐 SÉCURITÉ

### RLS Vérifications

1. **Query prospects**: Filtrée automatiquement par RLS (user ne voit que son org)
2. **Query workflow_module_templates**: Filtrée par `organization_id` (multi-tenant safe)
3. **Insert missions**: RLS vérifie `organization_id` match avec user

### Validation des entrées

- ✅ `order.prospectId` validé (UUID format vérifié par Supabase)
- ✅ `order.projectType` extrait de l'order (pas user input direct)
- ✅ `order.moduleId` extrait de l'order (pas user input direct)
- ✅ `actionConfig.partnerId` extrait de config DB (pas user input)

---

## 📈 IMPACT PERFORMANCE

**Queries additionnelles par exécution PARTENAIRE**:

1. `SELECT prospects` → ~5ms (indexed sur `id`)
2. `SELECT workflow_module_templates` → ~10ms (indexed sur unique constraint)
3. `executePartnerTaskAction` → ~50ms (INSERT + checks existants)

**Total**: ~65ms overhead par action PARTENAIRE

**Cache futur** (si optimisation nécessaire):
- Cacher `workflow_module_templates.config` en mémoire par `(org_id, project_type, module_id)`
- TTL: 5 minutes
- Invalidation: Sur update config via WorkflowV2ConfigPage

---

## ✅ CHECKLIST POST-DÉPLOIEMENT

- [ ] Tests manuels 1-4 passés
- [ ] Logs V2 visibles en console (pas d'erreur)
- [ ] V1 workflows partenaire fonctionnent
- [ ] Toast d'erreur s'affichent correctement
- [ ] Missions créées avec `is_blocking` correct
- [ ] RLS bloque bien cross-tenant (tester avec 2 orgs)
- [ ] Performance acceptable (<100ms par action)
- [ ] Documentation à jour (ce fichier)
- [ ] Rollback plan validé et testé

---

## 📚 RÉFÉRENCES

- `PROMPT_2_BRIDGE_V2_PARTENAIRE_CORRIGE.md` — Spécifications initiales
- `ANALYSE_STRUCTURE_ACTION_ORDER_PARTENAIRE.md` — Analyse structure
- `MIGRATION_PARTENAIRES_V1_TO_V2_ANALYSE.md` — Plan migration complet
- `supabase/schema.sql` — Structure tables (missions, workflow_module_templates)
- `src/lib/workflowV2Config.js` — Feature flags V2
