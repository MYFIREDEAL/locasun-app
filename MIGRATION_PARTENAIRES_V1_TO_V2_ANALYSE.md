# 🎯 MIGRATION PARTENAIRES + MISSIONS V1→V2 — ANALYSE COMPLÈTE

**Date**: 18 février 2026  
**Auteur**: Claude (Exécuteur Cadré)  
**Statut**: PHASE 0 — Analyse + Plan d'action + Mini-prompts SAFE

---

## 📋 TABLE DES MATIÈRES

1. [Contexte & Objectif](#1-contexte--objectif)
2. [Comportement V1 (Spec Fonctionnelle)](#2-comportement-v1-spec-fonctionnelle)
3. [Inventaire Technique V1](#3-inventaire-technique-v1)
4. [Inventaire Technique V2](#4-inventaire-technique-v2)
5. [Gap Analysis (Ce qui manque)](#5-gap-analysis-ce-qui-manque)
6. [Plan d'Action Étape par Étape](#6-plan-daction-étape-par-étape)
7. [Mini-Prompts SAFE (Copier-Coller)](#7-mini-prompts-safe-copier-coller)
8. [Inputs Manquants (Optionnels)](#8-inputs-manquants-optionnels)
9. [Résumé Exécutif](#9-résumé-exécutif)

---

## 1️⃣ CONTEXTE & OBJECTIF

### Projet
**EVATIME** (ex-Locasun) — Moteur de workflow pour gestion projets clients (solaire, finance, dossiers admin)

### Mission
Migrer ("déplacer") le module **PARTENAIRES + MISSIONS** de V1 vers V2 pour obtenir **EXACTEMENT** le même comportement qu'en V1.

**❌ INTERDICTIONS**:
- Aucune amélioration
- Aucun refactor (sauf extraction DRY optionnelle)
- Aucun changement de naming
- Aucune nouvelle abstraction si V1 a déjà un modèle

**✅ OBJECTIF**:
Workflow V2 → Action "Associée au partenaire" → Création mission → Partenaire voit mission mobile → Validation → Workflow reprend

### Architecture Dual-User EVATIME

| Type | Accès | Rôle |
|------|-------|------|
| **Admin** (Global Admin, Manager, Commercial) | Web `/admin/*` | Pipeline, CRM, Config workflows |
| **Client** | Web+Mobile `/dashboard/*` | Suivi projet uniquement |
| **Partenaire** | Mobile `/partner/*` | Missions terrain uniquement (ZÉRO accès CRM/Pipeline) |

**⚠️ RÈGLE ABSOLUE PARTENAIRES**:
- ❌ Pas d'accès au pipeline
- ❌ Pas d'accès au CRM
- ❌ Pas d'accès aux autres partenaires
- ✅ Voit uniquement SES missions assignées
- ✅ Mobile-first strict
- ✅ Multi-tenant strict (`organization_id`)

---

## 2️⃣ COMPORTEMENT V1 (SPEC FONCTIONNELLE)

### Flow 1: Inviter/Activer un partenaire ✅ FONCTIONNE

```
ADMIN → /admin/partners → Bouton "Inviter partenaire"
  ├─ Modal: 5 champs (companyName, email, contactFirstName, contactLastName, phone)
  ├─ Validation: email + companyName obligatoires
  ├─ Backend:
  │   ├─ 1. Créer compte auth.users (email + password auto-généré)
  │   ├─ 2. INSERT public.partners (user_id, organization_id, name, email, phone, active=true)
  │   └─ 3. Envoyer magic link email (Supabase Auth)
  └─ Résultat: Partenaire reçoit email → Peut se connecter mobile

**État actuel**: ✅ Fonctionnel V1
**Fichiers**: 
- `src/pages/admin/PartnersListPage.jsx` (lignes 90-180)
- `supabase/create_partners_table.sql`
```

---

### Flow 2: Créer mission partenaire (workflow) ⚠️ PARTIELLEMENT CASSÉ

```
ADMIN → /admin/workflow-v2-config → Config module
  ├─ Section "À qui s'adresse l'action ?"
  ├─ Sélection: "Partenaire" (target = PARTENAIRE)
  ├─ Dropdown: Sélectionner partenaire (liste partenaires actifs)
  ├─ Textarea: Instructions pour le partenaire
  ├─ Toggle: "Action bloquante" (isBlocking = true/false)
  └─ Sauvegarde → workflow_module_templates.config.actionConfig

ROBOT WORKFLOW → Exécution étape N (action partenaire configurée)
  ├─ V1: useWorkflowExecutor.executePartnerTaskAction()
  │   ├─ 1. SELECT prospects WHERE id = prospectId
  │   ├─ 2. Anti-duplication: SELECT missions WHERE prospect_id + partner_id + project_type
  │   ├─ 3. INSERT missions:
  │   │     - organization_id (du prospect)
  │   │     - partner_id (configuré)
  │   │     - prospect_id
  │   │     - project_type (ACC, Centrale, etc.)
  │   │     - title = "Mission pour {prospect.name}"
  │   │     - description = partnerInstructions
  │   │     - status = 'pending'
  │   │     - is_blocking = isBlocking (⚠️ COLONNE MANQUANTE EN DB)
  │   └─ 4. Toast "Mission partenaire créée"
  └─ V2: executeActionOrderV2.js → ❌ CASE PARTENAIRE MANQUANT

**État actuel**: 
- ✅ V1 fonctionnel (useWorkflowExecutor) SAUF colonne `is_blocking` manquante
- ❌ V2 bridge absent (executeActionOrderV2.js)

**Fichiers**:
- `src/hooks/useWorkflowExecutor.js` (lignes 370-460)
- `src/lib/catalogueV2.js` (ligne 138-144)
- `src/lib/executeActionOrderV2.js` (⚠️ case PARTENAIRE absent)
```

---

### Flow 3: Partenaire consulte missions (mobile) ✅ FONCTIONNE

```
PARTENAIRE → /partner/login
  ├─ Saisie: email + password
  ├─ Supabase Auth: signInWithPassword()
  ├─ Vérification:
  │   ├─ SELECT partners WHERE user_id = auth.uid() → single()
  │   ├─ Si NOT FOUND → Force logout + redirect login
  │   └─ Si active = false → Force logout + toast "Compte désactivé"
  └─ Redirection → /partner/missions

/partner/missions
  ├─ SELECT missions WHERE partner_id = partner.id ORDER BY created_at DESC
  ├─ Affichage liste (cards):
  │   ├─ Title (nom client)
  │   ├─ Description (instructions)
  │   ├─ Badge status (pending/in_progress/completed/blocked/cancelled)
  │   └─ Badge "Bloquante" si is_blocking = true (⚠️ COLONNE MANQUANTE)
  └─ Tap card → /partner/missions/:missionId

**État actuel**: ✅ Fonctionnel V1 SAUF lecture `is_blocking` (colonne manquante)

**Fichiers**:
- `src/pages/partner/PartnerMissionsPage.jsx`
- `src/pages/partner/PartnerLoginPage.jsx`
```

---

### Flow 4: Partenaire complète mission ✅ FONCTIONNE

```
/partner/missions/:missionId
  ├─ SELECT mission WHERE id = :missionId (RLS filtre automatique partner_id)
  ├─ Vérification sécurité: mission.partner_id === partner.id (double check)
  ├─ SELECT prospects (nom, adresse, phone) — Infos limitées client
  ├─ Affichage:
  │   ├─ Titre mission
  │   ├─ Description/instructions
  │   ├─ Infos client (nom, adresse, phone)
  │   └─ Zone notes partenaire (partner_notes)
  ├─ Actions:
  │   ├─ Bouton "Commencer" → UPDATE status = 'in_progress'
  │   ├─ Textarea notes → UPDATE partner_notes
  │   ├─ Bouton "Terminé" → UPDATE status = 'completed', completed_at = NOW()
  │   └─ Bouton "Problème" → UPDATE status = 'blocked'
  └─ Retour → /partner/missions

**État actuel**: ✅ Fonctionnel V1

**Fichiers**:
- `src/pages/partner/PartnerMissionDetailPage.jsx`
```

---

### Flow 5: Effet mission sur workflow ❌ NON IMPLÉMENTÉ

```
LOGIQUE MÉTIER ATTENDUE (pas codée en V1):

SI mission.is_blocking = true ET status IN ('pending', 'in_progress', 'blocked')
  → Workflow BLOQUÉ (pause automatique)
  → Toast admin: "En attente mission partenaire: {title}"
  
SI mission.is_blocking = true ET status = 'completed'
  → Workflow REPREND (next step)

SI mission.is_blocking = false
  → Workflow continue sans attendre (mission optionnelle)

**État actuel**: ❌ PAS IMPLÉMENTÉ
- Code insert `is_blocking` mais aucune logique de vérification
- Workflow ne check jamais les missions bloquantes

**Impact**: 
- `isBlocking` toggle existe en config UI
- Valeur sauvegardée dans actionConfig
- Mais ZÉRO effet sur l'exécution workflow

**Besoin**:
1. Helper: `checkMissionBlockingStatus(prospectId, projectType)`
2. Intégration dans `executeWorkflowStep()` AVANT exécution actions
```

---

## 3️⃣ INVENTAIRE TECHNIQUE V1

### 📊 Tables Database

#### Table `partners`

```sql
CREATE TABLE public.partners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  specialty TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Colonnes clés**:
- `user_id`: Lien vers `auth.users` (authentication Supabase)
- `organization_id`: Multi-tenant strict (pas de FK, isolation RLS)
- `active`: Partenaire actif/désactivé (si FALSE → pas de nouvelles missions)
- `specialty`: Type compétence (ex: "Installation solaire", "Électricien")

**Relations**:
- FK → `auth.users(id)` ON DELETE CASCADE
- Soft reference → `organizations(id)` (pas de FK explicite)

**Indexes**:
```sql
CREATE INDEX idx_partners_user_id ON partners(user_id);
CREATE INDEX idx_partners_organization_id ON partners(organization_id);
CREATE INDEX idx_partners_active ON partners(active);
```

**Trigger**:
```sql
CREATE TRIGGER update_partners_updated_at
  BEFORE UPDATE ON partners
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Fichier DDL**: `supabase/create_partners_table.sql`

---

#### Table `missions`

```sql
CREATE TABLE public.missions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL,
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  project_type TEXT NOT NULL,
  step_name TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked', 'cancelled')),
  source TEXT DEFAULT 'workflow' CHECK (source IN ('workflow', 'ai', 'manual')),
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  partner_notes TEXT,
  admin_notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
  -- ⚠️ COLONNE MANQUANTE: is_blocking BOOLEAN DEFAULT FALSE
);
```

**⚠️ BUG CRITIQUE**: Colonne `is_blocking` utilisée par code V1 mais **absente du DDL**

**Colonnes clés**:
- `organization_id`: Multi-tenant strict
- `partner_id`: Partenaire assigné (RLS filtre automatique)
- `prospect_id`: Client concerné
- `project_type`: Type projet (ACC, Centrale, Investissement, etc.)
- `status`: État mission (pending → in_progress → completed)
- `source`: Origine (workflow, ai, manual)
- `partner_notes`: Notes terrain (modifiable par partenaire)
- `admin_notes`: Commentaires admin (modifiable par commerciaux)

**Relations**:
- FK → `partners(id)` ON DELETE CASCADE
- FK → `prospects(id)` ON DELETE CASCADE
- FK → `users(id)` ON DELETE SET NULL (created_by)

**Indexes**:
```sql
CREATE INDEX idx_missions_partner_id ON missions(partner_id);
CREATE INDEX idx_missions_prospect_id ON missions(prospect_id);
CREATE INDEX idx_missions_organization_id ON missions(organization_id);
CREATE INDEX idx_missions_status ON missions(status);
CREATE INDEX idx_missions_source ON missions(source);
CREATE INDEX idx_missions_project_type ON missions(project_type);
CREATE INDEX idx_missions_due_date ON missions(due_date);
```

**Fichier DDL**: `supabase/create_missions_table.sql`

---

### 🔐 RLS Policies

#### Policies `partners` (6 policies) ✅ BONNES

| # | Policy Name | Rôle | Op | Condition |
|---|-------------|------|----|-----------| 
| 1 | Partners can view own profile | Partner | SELECT | `auth.uid() = user_id` |
| 2 | Partners can update own profile | Partner | UPDATE | `auth.uid() = user_id` |
| 3 | Admins can view partners in their own org only | Admin | SELECT | `users.organization_id = partners.organization_id` |
| 4 | Admins can insert partners in their own org only | Admin | INSERT | `users.organization_id = partners.organization_id` |
| 5 | Admins can update all partners in their org | Admin | UPDATE | `users.organization_id = partners.organization_id` |
| 6 | Admins can delete partners | Admin | DELETE | `users.organization_id = partners.organization_id` |

**✅ Multi-tenant strict**: Policies admin filtrent par `organization_id` (fixé le 23/01/2026)

**Fichier**: `supabase/fix_rls_partners_missions_multitenant.sql`

---

#### Policies `missions` (6 policies) ⚠️ BUG RLS ADMIN

| # | Policy Name | Rôle | Op | Condition | Bug |
|---|-------------|------|----|-----------|----|
| 1 | Partners can view their own missions | Partner | SELECT | `partners.user_id = auth.uid() AND partners.id = missions.partner_id` | ✅ |
| 2 | Partners can update their missions status and notes | Partner | UPDATE | `partners.user_id = auth.uid() AND partners.id = missions.partner_id` | ✅ |
| 3 | Admins can view all missions in their org | Admin | SELECT | `users.role IN ('Global Admin', 'Manager', 'Commercial')` | ⚠️ PAS DE FILTRE `organization_id` |
| 4 | Admins can insert missions | Admin | INSERT | `users.role IN ('Global Admin', 'Manager', 'Commercial')` | ⚠️ PAS DE FILTRE `organization_id` |
| 5 | Admins can update all missions | Admin | UPDATE | `users.role IN ('Global Admin', 'Manager', 'Commercial')` | ⚠️ PAS DE FILTRE `organization_id` |
| 6 | Admins can delete missions | Admin | DELETE | `users.role IN ('Global Admin', 'Manager', 'Commercial')` | ⚠️ PAS DE FILTRE `organization_id` |

**🔴 BUG CRITIQUE**: Policies admin 3-6 ne filtrent **PAS** par `organization_id`  
→ Risque cross-tenant leak (admin org1 peut voir missions org2)

**Comparaison**:
- ✅ Policies `partners` admin: Filtrent par `users.organization_id = partners.organization_id`
- ❌ Policies `missions` admin: Filtrent seulement par `role` (pas d'isolation tenant)

**Fichier**: `supabase/create_missions_table.sql` (policies 3-6 à refaire)

---

### 📂 Hooks Frontend

#### `useSupabasePartners.js` ✅ EXISTE

```javascript
export const useSupabasePartners = (organizationId, enabled = true) => {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Méthodes:
  // - fetchPartners() // SELECT partners + COUNT missions
  // - togglePartnerActive(partnerId, active) // UPDATE active
  // - getPartnerWithMissions(partnerId) // JOIN missions
  
  // Real-time:
  // - Channel: partners-${organizationId}
  // - Event: INSERT/UPDATE/DELETE → refetch
  
  return { partners, loading, error, refetch, togglePartnerActive, getPartnerWithMissions };
}
```

**Transformation snake_case → camelCase**:
```javascript
{
  id: p.id,
  userId: p.user_id,
  organizationId: p.organization_id,
  name: p.company_name,
  email: p.email,
  phone: p.phone,
  avatarUrl: p.avatar_url,
  specialty: p.specialty,
  active: p.active,
  isActive: p.active, // Alias pour compatibilité workflow
  missionsCount: missionsByPartner[p.id] || 0,
}
```

**Fichier**: `src/hooks/useSupabasePartners.js`

---

#### `useSupabaseMissions.js` ❌ N'EXISTE PAS

Requêtes missions actuellement **dupliquées** dans:
- `src/pages/admin/PartnersListPage.jsx`
- `src/pages/admin/PartnerDetailPage.jsx`
- `src/pages/partner/PartnerMissionsPage.jsx`
- `src/pages/partner/PartnerMissionDetailPage.jsx`

**Pattern à suivre**: Copier structure `useSupabasePartners.js`

---

### 🔧 Moteur Workflow V1

#### `useWorkflowExecutor.js` → `executePartnerTaskAction()` ✅ FONCTIONNE

```javascript
async function executePartnerTaskAction({ action, prospectId, projectType }) {
  // 1. Validation partnerId présent
  if (!action.partnerId) {
    toast({ title: "⚠️ Configuration manquante", variant: "destructive" });
    return;
  }

  // 2. Récupérer prospect (nom, organization_id)
  const { data: prospectData } = await supabase
    .from('prospects')
    .select('name, organization_id')
    .eq('id', prospectId)
    .single();

  // 3. Anti-duplication
  const { data: existingMission } = await supabase
    .from('missions')
    .select('id')
    .eq('prospect_id', prospectId)
    .eq('partner_id', action.partnerId)
    .eq('project_type', projectType)
    .maybeSingle();

  if (existingMission) return; // Déjà existante

  // 4. Créer mission
  const { data: mission, error } = await supabase
    .from('missions')
    .insert({
      organization_id: prospectData.organization_id,
      partner_id: action.partnerId,
      prospect_id: prospectId,
      project_type: projectType,
      title: `Mission pour ${prospectData.name}`,
      description: action.partnerInstructions || null,
      status: 'pending',
      is_blocking: action.isBlocking !== false, // ⚠️ COLONNE MANQUANTE EN DB
    })
    .select()
    .single();

  // 5. Toast succès
  toast({ title: "✅ Mission partenaire créée" });
}
```

**État**: ✅ Fonctionnel SAUF insert `is_blocking` (colonne DB manquante)

**Fichier**: `src/hooks/useWorkflowExecutor.js` (lignes 370-460)

---

## 4️⃣ INVENTAIRE TECHNIQUE V2

### 🎨 Config Workflow V2

#### `catalogueV2.js` — Target PARTENAIRE ✅ EXISTE

```javascript
export const TARGETS = {
  CLIENT: {
    id: 'CLIENT',
    v1Value: true, // hasClientAction = true
    label: 'Client',
    icon: '👤',
  },
  COMMERCIAL: {
    id: 'COMMERCIAL',
    v1Value: false, // hasClientAction = false
    label: 'Commercial',
    icon: '💼',
  },
  PARTENAIRE: {
    id: 'PARTENAIRE',
    v1Value: null, // hasClientAction = null (type = partner_task)
    label: 'Partenaire',
    icon: '🤝',
    description: 'Action destinée au partenaire',
  },
};

// Helpers
export function v2TargetToV1HasClientAction(v2Target) {
  // 'CLIENT' → true
  // 'COMMERCIAL' → false
  // 'PARTENAIRE' → null
}

export function v1HasClientActionToV2Target(hasClientAction) {
  // true → 'CLIENT'
  // false → 'COMMERCIAL'
  // null → 'PARTENAIRE'
}
```

**Fichier**: `src/lib/catalogueV2.js` (lignes 138-144)

---

#### `moduleAIConfig.js` — Config IA par module ✅ EXISTE

```javascript
// Structure config par module
{
  objective: "Texte libre objectif module",
  instructions: "Instructions IA pour analyse",
  actionConfig: {
    type: "partner_task", // ou "form", "signature"
    target: "PARTENAIRE", // ou "CLIENT", "COMMERCIAL"
    partnerId: "uuid-partenaire", // SELECT partners WHERE active = true
    partnerInstructions: "Texte libre instructions terrain",
    isBlocking: true, // Toggle "Action bloquante"
    mode: null, // Pas de mode pour partenaire
    verification: null, // Pas de vérification pour partenaire
  }
}
```

**Fichier**: `src/lib/moduleAIConfig.js`

---

#### `workflow_module_templates` table ✅ EXISTE

```sql
CREATE TABLE workflow_module_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL,
  project_type TEXT NOT NULL, -- 'ACC', 'Centrale', etc.
  module_id TEXT NOT NULL, -- 'module_1', 'module_2', etc.
  config JSONB NOT NULL, -- { objective, instructions, actionConfig }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (organization_id, project_type, module_id)
);
```

**Exemple data**:
```json
{
  "objective": "Réaliser visite technique chez le client",
  "instructions": "Vérifier faisabilité installation panneaux",
  "actionConfig": {
    "type": "partner_task",
    "target": "PARTENAIRE",
    "partnerId": "abc-123-def",
    "partnerInstructions": "Prendre photos toiture + mesures",
    "isBlocking": true
  }
}
```

**Fichier DDL**: `supabase/migrations/create_workflow_module_templates.sql`

---

### 🌉 Bridge V2 → V1

#### `executeActionOrderV2.js` ❌ CASE PARTENAIRE MANQUANT

```javascript
// Ligne ~143-165 (switch case)
switch (actionType) {
  case 'FORM':
    // ✅ Existe - Crée client_form_panels
    await executeFormAction(...);
    break;

  case 'SIGNATURE':
    // ✅ Existe - Crée signature_procedures
    await executeSignatureAction(...);
    break;

  case 'PARTENAIRE':
    // ❌ N'EXISTE PAS
    // BESOIN: Appeler useWorkflowExecutor.executePartnerTaskAction()
    break;

  default:
    logger.warn('[executeActionOrderV2] Type action inconnu', { actionType });
}
```

**🔴 GAP CRITIQUE**: Case `PARTENAIRE` absent → Workflow V2 ne peut **PAS** créer missions

**Fichier**: `src/lib/executeActionOrderV2.js`

---

### 🚀 Page Config V2

#### `WorkflowV2ConfigPage.jsx` ✅ UI PARTENAIRE EXISTE

```jsx
// Section "À qui s'adresse l'action ?"
<Select value={target} onValueChange={setTarget}>
  <SelectItem value="CLIENT">👤 Client</SelectItem>
  <SelectItem value="COMMERCIAL">💼 Commercial</SelectItem>
  <SelectItem value="PARTENAIRE">🤝 Partenaire</SelectItem>
</Select>

// Si target === 'PARTENAIRE':
{target === 'PARTENAIRE' && (
  <>
    {/* Dropdown partenaires actifs */}
    <Select value={partnerId} onValueChange={setPartnerId}>
      {partners.filter(p => p.active).map(p => (
        <SelectItem key={p.id} value={p.id}>
          {p.name} — {p.specialty}
        </SelectItem>
      ))}
    </Select>

    {/* Textarea instructions */}
    <Textarea 
      placeholder="Instructions pour le partenaire..."
      value={partnerInstructions}
      onChange={e => setPartnerInstructions(e.target.value)}
    />

    {/* Toggle bloquante */}
    <div className="flex items-center gap-2">
      <Switch checked={isBlocking} onCheckedChange={setIsBlocking} />
      <Label>Action bloquante (workflow attend complétion)</Label>
    </div>
  </>
)}
```

**État**: ✅ UI complète et fonctionnelle

**Fichier**: `src/pages/admin/WorkflowV2ConfigPage.jsx`

---

## 5️⃣ GAP ANALYSIS (CE QUI MANQUE)

### 🔴 GAPS CRITIQUES (Bloquants)

#### G1: Colonne `missions.is_blocking` manquante en DB

**Symptôme**:
```javascript
// Code V1 (useWorkflowExecutor.js ligne 430)
.insert({
  is_blocking: action.isBlocking !== false, // ❌ ERREUR SQL
})

// Erreur Supabase:
// column "is_blocking" of relation "missions" does not exist
```

**Impact**: 
- ❌ Création mission via workflow V1 → CRASH
- ❌ Lecture `is_blocking` dans UI partenaire → NULL (colonne absente)
- ❌ Logique blocage workflow impossible

**Fichiers impactés**:
- `supabase/create_missions_table.sql` (DDL incomplet)
- `src/hooks/useWorkflowExecutor.js` (insert fail)
- `src/pages/partner/PartnerMissionsPage.jsx` (lecture `m.is_blocking`)

**Solution**: Step 1 du plan

---

#### G2: RLS missions admin ne filtre pas `organization_id`

**Symptôme**:
```sql
-- Admin org1 peut voir missions org2
SELECT * FROM missions; -- Retourne TOUTES les missions (cross-tenant leak)
```

**Preuve**:
```sql
-- Policy actuelle (create_missions_table.sql ligne 120)
CREATE POLICY "Admins can view all missions in their org"
  ON missions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()
      AND users.role IN ('Global Admin', 'Manager', 'Commercial')
      -- ⚠️ MANQUE: AND users.organization_id = missions.organization_id
    )
  );
```

**Comparaison partners (CORRECT)**:
```sql
-- fix_rls_partners_missions_multitenant.sql ligne 28
CREATE POLICY "Admins can view partners in their own org only"
  ON partners FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()
      AND users.role IN ('Global Admin', 'Manager')
      AND users.organization_id = partners.organization_id -- ✅ FILTRE PRÉSENT
    )
  );
```

**Impact**:
- 🔴 Security: Admin org1 voit/modifie missions org2
- 🔴 RGPD: Violation isolation données
- 🔴 Multi-tenant: Système cassé

**Solution**: Step 2 du plan

---

#### G3: Bridge V2→V1 PARTENAIRE absent

**Symptôme**:
```javascript
// executeActionOrderV2.js ligne ~165
switch (actionType) {
  case 'FORM': /* ... */ break;
  case 'SIGNATURE': /* ... */ break;
  // ❌ MANQUE case 'PARTENAIRE'
  default:
    logger.warn('Type action inconnu', { actionType }); // Log si target=PARTENAIRE
}
```

**Impact**:
- ❌ Workflow V2 config action PARTENAIRE → Sauvegardé OK
- ❌ Robot V2 exécute → Case default → RIEN NE SE PASSE
- ❌ Mission jamais créée

**Test reproductible**:
1. Config Workflow V2 → Action PARTENAIRE
2. Simuler ActionOrder → JSON généré correct
3. Exécuter → Log warning "Type action inconnu"
4. SELECT missions → 0 row

**Solution**: Step 3 du plan

---

#### G4: Logique blocage workflow manquante

**Symptôme**:
```javascript
// useWorkflowExecutor.js executeWorkflowStep()
// ❌ AUCUNE vérification missions bloquantes avant exécution

async function executeWorkflowStep(...) {
  // [MANQUE] checkMissionBlockingStatus()
  
  for (const action of step.actions) {
    // Exécute TOUTES les actions sans vérifier missions en cours
    await executeAction(action);
  }
}
```

**Impact**:
- ⚠️ Toggle "Action bloquante" UI → AUCUN EFFET
- ⚠️ Workflow continue même si mission `is_blocking=true, status='pending'`
- ⚠️ Logique métier incohérente (config vs comportement)

**Comportement attendu**:
```
Workflow étape 3 → Action partenaire (bloquante)
  └─ Mission créée (status='pending')

Workflow étape 4 → AVANT d'exécuter
  ├─ Check: Existe mission is_blocking=true status!='completed' ?
  ├─ SI OUI → STOP + Toast "En attente mission partenaire"
  └─ SI NON → Continuer étape 4
```

**Solution**: Steps 4-5 du plan

---

### 🟡 GAPS MINEURS (Non-bloquants, Refactor qualité)

#### G5: Hook `useSupabaseMissions.js` n'existe pas

**Impact**: Duplication code requêtes missions dans 4 fichiers

**Fichiers dupliqués**:
- `src/pages/admin/PartnersListPage.jsx` (lignes ~120-140)
- `src/pages/admin/PartnerDetailPage.jsx` (lignes ~80-110)
- `src/pages/partner/PartnerMissionsPage.jsx` (lignes ~50-75)
- `src/pages/partner/PartnerMissionDetailPage.jsx` (lignes ~60-90)

**Solution**: Step 6 du plan (optionnel)

---

#### G6: Composant `MissionCard.jsx` n'existe pas

**Impact**: Duplication UI card mission (badge, status, etc.)

**Solution**: Step 7 du plan (optionnel)

---

#### G7: Enums `MISSION_STATUS` et `MISSION_SOURCE` pas en constantes

**Impact**: Magic strings 'pending', 'workflow' dispersés partout

**Exemples**:
```javascript
// useWorkflowExecutor.js ligne 430
status: 'pending', // ❌ Magic string

// PartnerMissionsPage.jsx ligne 95
if (m.status === 'completed') // ❌ Magic string

// Devrait être:
status: MISSION_STATUS.PENDING,
if (m.status === MISSION_STATUS.COMPLETED)
```

**Solution**: Steps 8-9 du plan (optionnel)

---

## 6️⃣ PLAN D'ACTION ÉTAPE PAR ÉTAPE

### ✅ PHASE 1: FIX DB + RLS (CRITIQUES) — 15 min

#### Step 1: Ajouter colonne `is_blocking` à `missions`

**Objectif**: Permettre insert/read `is_blocking` sans erreur SQL

**Fichier**: `add_is_blocking_to_missions.sql` (nouveau)

**SQL**:
```sql
-- =====================================================
-- MIGRATION: Ajouter colonne is_blocking à missions
-- =====================================================
-- Date: 18 février 2026
-- Objectif: Fix code V1 qui insert is_blocking (colonne manquante)
-- Impact: Table missions seulement
-- Rollback: ALTER TABLE missions DROP COLUMN is_blocking;
-- =====================================================

-- Ajouter colonne
ALTER TABLE public.missions 
ADD COLUMN is_blocking BOOLEAN DEFAULT FALSE;

-- Documenter colonne
COMMENT ON COLUMN public.missions.is_blocking IS 
  'Mission bloquante : si TRUE, le workflow doit attendre complétion avant de continuer.
   
   LOGIQUE MÉTIER:
   - is_blocking = TRUE + status IN (''pending'', ''in_progress'', ''blocked'') → Workflow PAUSE
   - is_blocking = TRUE + status = ''completed'' → Workflow REPREND
   - is_blocking = FALSE → Workflow continue sans attendre (mission optionnelle)
   
   Utilisé pour synchroniser workflow automatique et exécution terrain partenaire.';

-- Vérification post-migration
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'missions' AND column_name = 'is_blocking'
  ) THEN
    RAISE EXCEPTION '❌ Colonne is_blocking pas créée !';
  END IF;
  RAISE NOTICE '✅ Colonne is_blocking ajoutée avec succès';
END $$;
```

**Test**:
```sql
-- Test 1: Insert avec is_blocking
INSERT INTO missions (
  organization_id, partner_id, prospect_id, project_type, 
  title, is_blocking
)
VALUES (
  (SELECT organization_id FROM users WHERE user_id = auth.uid() LIMIT 1),
  (SELECT id FROM partners WHERE active = true LIMIT 1),
  (SELECT id FROM prospects LIMIT 1),
  'ACC',
  'Test mission bloquante',
  true
)
RETURNING id, is_blocking;

-- Attendu: 1 row, is_blocking = true

-- Test 2: Valeur par défaut
INSERT INTO missions (
  organization_id, partner_id, prospect_id, project_type, title
)
VALUES (
  (SELECT organization_id FROM users WHERE user_id = auth.uid() LIMIT 1),
  (SELECT id FROM partners WHERE active = true LIMIT 1),
  (SELECT id FROM prospects LIMIT 1),
  'ACC',
  'Test mission normale'
)
RETURNING id, is_blocking;

-- Attendu: 1 row, is_blocking = false (DEFAULT)

-- Cleanup
DELETE FROM missions WHERE title LIKE 'Test mission%';
```

**Rollback**:
```sql
ALTER TABLE public.missions DROP COLUMN is_blocking;
```

**Validation**:
- ✅ Build frontend passe
- ✅ useWorkflowExecutor.executePartnerTaskAction() insert OK
- ✅ PartnerMissionsPage affiche badge "Bloquante"

---

#### Step 2: Fix RLS missions - Filtrage multi-tenant admin

**Objectif**: Empêcher cross-tenant leak (admin voit seulement son org)

**Fichier**: `fix_rls_missions_multitenant_strict.sql` (nouveau)

**SQL**:
```sql
-- =====================================================
-- MIGRATION: Fix RLS missions multi-tenant strict
-- =====================================================
-- Date: 18 février 2026
-- Objectif: Isoler missions par organization_id (sécurité multi-tenant)
-- Impact: Policies admin missions (3-6), policies partner (1-2) inchangées
-- Rollback: Réappliquer create_missions_table.sql policies originales
-- =====================================================

-- ÉTAPE 1: Supprimer policies admin existantes (cassées)
DROP POLICY IF EXISTS "Admins can view all missions in their org" ON public.missions;
DROP POLICY IF EXISTS "Admins can insert missions" ON public.missions;
DROP POLICY IF EXISTS "Admins can update all missions" ON public.missions;
DROP POLICY IF EXISTS "Admins can delete missions" ON public.missions;

-- ÉTAPE 2: Recréer policies avec filtre organization_id

-- Policy 3: SELECT (lecture) - Admins voient seulement missions de LEUR org
CREATE POLICY "Admins can view missions in their own org only"
  ON public.missions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
      AND users.role IN ('Global Admin', 'Manager', 'Commercial')
      AND users.organization_id = missions.organization_id
    )
  );

-- Policy 4: INSERT (création) - Admins créent missions dans LEUR org seulement
CREATE POLICY "Admins can insert missions in their own org only"
  ON public.missions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
      AND users.role IN ('Global Admin', 'Manager', 'Commercial')
      AND users.organization_id = missions.organization_id
    )
  );

-- Policy 5: UPDATE (modification) - Admins modifient missions de LEUR org seulement
CREATE POLICY "Admins can update missions in their own org only"
  ON public.missions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
      AND users.role IN ('Global Admin', 'Manager', 'Commercial')
      AND users.organization_id = missions.organization_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
      AND users.role IN ('Global Admin', 'Manager', 'Commercial')
      AND users.organization_id = missions.organization_id
    )
  );

-- Policy 6: DELETE (suppression) - Admins suppriment missions de LEUR org seulement
CREATE POLICY "Admins can delete missions in their own org only"
  ON public.missions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
      AND users.role IN ('Global Admin', 'Manager', 'Commercial')
      AND users.organization_id = missions.organization_id
    )
  );

-- Vérification post-migration
DO $$
DECLARE
  policy_count INT;
BEGIN
  -- Compter policies missions
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'missions';
  
  IF policy_count <> 6 THEN
    RAISE EXCEPTION '❌ Nombre policies incorrect: % (attendu: 6)', policy_count;
  END IF;
  
  -- Vérifier policy SELECT contient organization_id
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'missions'
    AND policyname = 'Admins can view missions in their own org only'
    AND qual LIKE '%organization_id%'
  ) THEN
    RAISE EXCEPTION '❌ Policy SELECT ne filtre pas organization_id !';
  END IF;
  
  RAISE NOTICE '✅ RLS missions multi-tenant strict activé';
END $$;
```

**Test multi-tenant**:
```sql
-- Setup: 2 organisations, 2 admins, 2 missions
-- (Script test complet dans PARTNERS_TODO.md)

-- Test 1: Admin org1 voit seulement missions org1
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims.sub = 'admin-org1-uuid';

SELECT id, organization_id FROM missions;
-- Attendu: Seulement missions WHERE organization_id = 'org1'

-- Test 2: Admin org2 voit seulement missions org2
SET LOCAL request.jwt.claims.sub = 'admin-org2-uuid';

SELECT id, organization_id FROM missions;
-- Attendu: Seulement missions WHERE organization_id = 'org2'

-- Test 3: Admin org1 ne peut PAS modifier mission org2
UPDATE missions 
SET status = 'completed' 
WHERE organization_id = 'org2';
-- Attendu: 0 rows affected (RLS bloque)

-- Cleanup
RESET role;
```

**Rollback**:
```sql
-- Réappliquer policies originales
-- (copier depuis supabase/create_missions_table.sql lignes 95-150)
```

**Validation**:
- ✅ Admin org1 voit seulement missions org1
- ✅ Admin org2 voit seulement missions org2
- ✅ Aucun cross-tenant leak
- ✅ Partenaires toujours isolés (policies 1-2 inchangées)

---

### ✅ PHASE 2: BRIDGE V2 → V1 — 15 min

#### Step 3: Ajouter case PARTENAIRE dans executeActionOrderV2.js

**Objectif**: Permettre Workflow V2 de créer missions partenaire

**Fichier**: `src/lib/executeActionOrderV2.js`

**Modification**:
```javascript
// AVANT (ligne ~143-165)
switch (actionType) {
  case 'FORM':
    await executeFormAction({ actionConfig, prospectId, projectType });
    break;

  case 'SIGNATURE':
    await executeSignatureAction({ actionConfig, prospectId, projectType });
    break;

  default:
    logger.warn('[executeActionOrderV2] Type action inconnu', { actionType });
}

// APRÈS (ajouter case PARTENAIRE)
switch (actionType) {
  case 'FORM':
    await executeFormAction({ actionConfig, prospectId, projectType });
    break;

  case 'SIGNATURE':
    await executeSignatureAction({ actionConfig, prospectId, projectType });
    break;

  case 'PARTENAIRE':
    // Validation partnerId présent
    if (!actionConfig.partnerId) {
      logger.warn('[executeActionOrderV2] PARTENAIRE sans partnerId', { 
        moduleId, 
        prospectId, 
        projectType 
      });
      toast({
        title: "⚠️ Configuration incomplète",
        description: "Aucun partenaire sélectionné pour cette action",
        variant: "destructive",
      });
      break;
    }

    // Bridge V2 → V1: Appeler moteur existant
    // Import au top du fichier: import { executePartnerTaskAction } from '@/hooks/useWorkflowExecutor';
    await executePartnerTaskAction({
      action: {
        type: 'partner_task',
        partnerId: actionConfig.partnerId,
        partnerInstructions: actionConfig.instructions || '',
        isBlocking: actionConfig.isBlocking !== false,
      },
      prospectId,
      projectType,
    });

    logger.debug('[executeActionOrderV2] Mission partenaire créée via V2', { 
      moduleId, 
      partnerId: actionConfig.partnerId,
      isBlocking: actionConfig.isBlocking,
    });
    break;

  default:
    logger.warn('[executeActionOrderV2] Type action inconnu', { actionType });
}
```

**⚠️ PROBLÈME IMPORT**: `executePartnerTaskAction` est une fonction interne de `useWorkflowExecutor.js` (pas exportée)

**Solution**: Exporter la fonction

```javascript
// src/hooks/useWorkflowExecutor.js
// AVANT (ligne ~370)
async function executePartnerTaskAction({ action, prospectId, projectType }) {
  // ...
}

// APRÈS
export async function executePartnerTaskAction({ action, prospectId, projectType }) {
  // ... (code inchangé)
}
```

**Puis dans executeActionOrderV2.js**:
```javascript
// Top du fichier
import { executePartnerTaskAction } from '@/hooks/useWorkflowExecutor';
```

**Test**:
```javascript
// Test manuel:
// 1. Config Workflow V2 → Module X → Action PARTENAIRE
// 2. Sélectionner partenaire actif
// 3. Instructions: "Test bridge V2"
// 4. Toggle bloquante: ON
// 5. Sauvegarder

// 6. Page prospect → Simuler ActionOrder
// Attendu: JSON généré avec actionType='PARTENAIRE'

// 7. Exécuter ActionOrder
// Attendu: 
// - SELECT missions → 1 nouvelle row
// - title = "Mission pour {prospect.name}"
// - description = "Test bridge V2"
// - is_blocking = true
// - status = 'pending'
// - Toast "Mission partenaire créée"
```

**Rollback**:
```javascript
// Supprimer case 'PARTENAIRE'
// Supprimer import executePartnerTaskAction
// Supprimer export dans useWorkflowExecutor.js
```

**Validation**:
- ✅ Build passe
- ✅ Workflow V2 config PARTENAIRE → Mission créée
- ✅ Log debug contient moduleId + partnerId
- ✅ Toast succès affiché

---

### ✅ PHASE 3: LOGIQUE BLOCAGE WORKFLOW — 25 min

#### Step 4: Ajouter helper `checkMissionBlockingStatus()`

**Objectif**: Vérifier si mission bloquante empêche progression workflow

**Fichier**: `src/hooks/useWorkflowExecutor.js`

**Code à ajouter** (avant executeWorkflowStep):
```javascript
/**
 * Vérifie si une mission bloquante empêche la progression du workflow
 * 
 * @param {string} prospectId - UUID prospect
 * @param {string} projectType - Type projet (ACC, Centrale, etc.)
 * @returns {Promise<{blocked: boolean, missionId: string|null, title: string|null}>}
 * 
 * LOGIQUE:
 * - Recherche missions: prospect_id + project_type + is_blocking=true
 * - Exclusion status: 'completed', 'cancelled'
 * - Si trouvée → blocked=true (workflow STOP)
 * - Sinon → blocked=false (workflow OK)
 */
export async function checkMissionBlockingStatus(prospectId, projectType) {
  try {
    const { data, error } = await supabase
      .from('missions')
      .select('id, status, title')
      .eq('prospect_id', prospectId)
      .eq('project_type', projectType)
      .eq('is_blocking', true)
      .not('status', 'in', '(completed,cancelled)')
      .maybeSingle();

    if (error) {
      logger.error('[checkMissionBlockingStatus] Erreur requête', { 
        error: error.message,
        prospectId,
        projectType,
      });
      // En cas d'erreur: ne pas bloquer workflow (fail-safe)
      return { blocked: false, missionId: null, title: null };
    }

    if (data) {
      logger.info('[checkMissionBlockingStatus] Mission bloquante détectée', {
        missionId: data.id,
        status: data.status,
        title: data.title,
        prospectId,
        projectType,
      });
      return { 
        blocked: true, 
        missionId: data.id,
        title: data.title,
        status: data.status,
      };
    }

    // Aucune mission bloquante
    return { blocked: false, missionId: null, title: null };

  } catch (error) {
    logger.error('[checkMissionBlockingStatus] Exception', { 
      error: error.message,
      prospectId,
      projectType,
    });
    // Fail-safe: ne pas bloquer en cas d'exception
    return { blocked: false, missionId: null, title: null };
  }
}
```

**Test unitaire** (à ajouter dans un fichier test):
```javascript
// Test 1: Mission bloquante status='pending' → blocked=true
await supabase.from('missions').insert({
  prospect_id: 'test-prospect',
  project_type: 'ACC',
  is_blocking: true,
  status: 'pending',
  title: 'Mission test',
  // ... autres champs
});

const result1 = await checkMissionBlockingStatus('test-prospect', 'ACC');
expect(result1.blocked).toBe(true);
expect(result1.title).toBe('Mission test');

// Test 2: Mission bloquante status='completed' → blocked=false
await supabase.from('missions').update({ status: 'completed' })
  .eq('prospect_id', 'test-prospect');

const result2 = await checkMissionBlockingStatus('test-prospect', 'ACC');
expect(result2.blocked).toBe(false);

// Test 3: Aucune mission bloquante → blocked=false
await supabase.from('missions').delete()
  .eq('prospect_id', 'test-prospect');

const result3 = await checkMissionBlockingStatus('test-prospect', 'ACC');
expect(result3.blocked).toBe(false);
```

**Rollback**:
```javascript
// Supprimer la fonction checkMissionBlockingStatus
// (aucune dépendance, safe à supprimer)
```

**Validation**:
- ✅ Export function visible dans useWorkflowExecutor
- ✅ Build passe
- ✅ Tests unitaires passent

---

#### Step 5: Intégrer blocage dans executeWorkflowStep()

**Objectif**: Bloquer workflow si mission bloquante en cours

**Fichier**: `src/hooks/useWorkflowExecutor.js` (fonction `executeWorkflowStep`)

**Modification**:
```javascript
// AVANT (ligne ~200-250)
async function executeWorkflowStep({ 
  prompt, 
  stepIndex, 
  prospectId, 
  projectType 
}) {
  const step = prompt.steps_config[stepIndex];
  if (!step?.actions?.length) return;

  logger.debug('Exécution étape workflow', { stepIndex, actions: step.actions.length });

  // Boucle actions
  for (const action of step.actions) {
    await executeAction(action);
  }
}

// APRÈS (ajouter vérification AU DÉBUT de la fonction)
async function executeWorkflowStep({ 
  prompt, 
  stepIndex, 
  prospectId, 
  projectType 
}) {
  const step = prompt.steps_config[stepIndex];
  if (!step?.actions?.length) return;

  // ✅ NOUVEAU: Vérifier missions bloquantes AVANT d'exécuter actions
  const blockingCheck = await checkMissionBlockingStatus(prospectId, projectType);

  if (blockingCheck.blocked) {
    logger.warn('[executeWorkflowStep] Workflow bloqué par mission partenaire', { 
      prospectId, 
      projectType,
      stepIndex,
      missionId: blockingCheck.missionId,
      missionStatus: blockingCheck.status,
      missionTitle: blockingCheck.title,
    });

    // Afficher toast utilisateur
    toast({
      title: "⏸️ Workflow en attente",
      description: `Mission partenaire "${blockingCheck.title}" (status: ${blockingCheck.status}) doit être complétée avant de continuer.`,
      variant: "default",
      duration: 8000, // 8 secondes (plus long pour lire)
    });

    // STOP workflow (return avant boucle actions)
    return;
  }

  // ✅ Aucune mission bloquante: continuer normalement
  logger.debug('Exécution étape workflow', { stepIndex, actions: step.actions.length });

  // Boucle actions
  for (const action of step.actions) {
    await executeAction(action);
  }
}
```

**Test E2E**:
```javascript
// Scénario 1: Mission bloquante pending → Workflow STOP

// 1. Créer prospect + projet ACC
const prospectId = 'test-123';

// 2. Créer mission bloquante status='pending'
await supabase.from('missions').insert({
  prospect_id: prospectId,
  project_type: 'ACC',
  partner_id: 'partner-123',
  title: 'Visite technique terrain',
  is_blocking: true,
  status: 'pending',
});

// 3. Déclencher workflow étape 4
await executeWorkflowStep({
  prompt: workflowACC,
  stepIndex: 4,
  prospectId,
  projectType: 'ACC',
});

// Attendu:
// - Log warn "Workflow bloqué par mission partenaire"
// - Toast affiché: "⏸️ Workflow en attente: Visite technique terrain"
// - Aucune action de l'étape 4 exécutée
// - Étape reste à 4 (pas de progression)

// 4. Partenaire complète mission
await supabase.from('missions')
  .update({ status: 'completed', completed_at: new Date().toISOString() })
  .eq('prospect_id', prospectId);

// 5. Re-déclencher workflow étape 4
await executeWorkflowStep({
  prompt: workflowACC,
  stepIndex: 4,
  prospectId,
  projectType: 'ACC',
});

// Attendu:
// - Log debug "Exécution étape workflow"
// - Actions étape 4 exécutées
// - Progression workflow OK
```

**Rollback**:
```javascript
// Supprimer le bloc checkMissionBlockingStatus + if (blocked) return
// Restaurer code original (exécution directe sans vérification)
```

**Validation**:
- ✅ Mission pending → Workflow bloqué
- ✅ Mission completed → Workflow reprend
- ✅ Mission is_blocking=false → Workflow ignore
- ✅ Toast clair pour utilisateur

---

### ✅ PHASE 4: HOOKS & UI (OPTIONNEL) — 70 min

#### Step 6: Créer `useSupabaseMissions.js`

**Objectif**: Centraliser requêtes missions (DRY principle)

**Fichier**: `src/hooks/useSupabaseMissions.js` (nouveau)

**Code complet** (inspiré de useSupabasePartners.js):
```javascript
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

/**
 * Hook pour gérer les missions partenaires
 * 
 * UTILISATEURS:
 * - Admin: Voit toutes missions de son organisation
 * - Partenaire: Voit uniquement ses missions (RLS filtre)
 * 
 * SÉCURITÉ:
 * - RLS filtre automatiquement par organization_id (admin)
 * - RLS filtre automatiquement par partner_id (partenaire)
 * 
 * @param {object} options - Options de filtrage
 * @param {string} options.organizationId - UUID organisation (admin)
 * @param {string} options.partnerId - UUID partenaire (partenaire)
 * @param {string} options.prospectId - UUID prospect (optionnel)
 * @param {string} options.projectType - Type projet (optionnel)
 * @param {string} options.status - Status filter (optionnel)
 * @param {boolean} options.enabled - Activer hook (default: true)
 */
export const useSupabaseMissions = (options = {}) => {
  const {
    organizationId,
    partnerId,
    prospectId,
    projectType,
    status,
    enabled = true,
  } = options;

  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Charger missions
  const fetchMissions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('missions')
        .select(`
          id,
          organization_id,
          partner_id,
          prospect_id,
          project_type,
          step_name,
          title,
          description,
          status,
          source,
          is_blocking,
          due_date,
          completed_at,
          partner_notes,
          admin_notes,
          created_by,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false });

      // Filtres optionnels
      if (partnerId) query = query.eq('partner_id', partnerId);
      if (prospectId) query = query.eq('prospect_id', prospectId);
      if (projectType) query = query.eq('project_type', projectType);
      if (status) query = query.eq('status', status);

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Transformation snake_case → camelCase
      const transformed = (data || []).map(m => ({
        id: m.id,
        organizationId: m.organization_id,
        partnerId: m.partner_id,
        prospectId: m.prospect_id,
        projectType: m.project_type,
        stepName: m.step_name,
        title: m.title,
        description: m.description,
        status: m.status,
        source: m.source,
        isBlocking: m.is_blocking,
        dueDate: m.due_date,
        completedAt: m.completed_at,
        partnerNotes: m.partner_notes,
        adminNotes: m.admin_notes,
        createdBy: m.created_by,
        createdAt: m.created_at,
        updatedAt: m.updated_at,
      }));

      setMissions(transformed);
    } catch (err) {
      logger.error('[useSupabaseMissions] Erreur fetch', { error: err.message });
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [partnerId, prospectId, projectType, status]);

  // Créer mission
  const createMission = useCallback(async (missionData) => {
    try {
      const { data, error } = await supabase
        .from('missions')
        .insert({
          organization_id: missionData.organizationId,
          partner_id: missionData.partnerId,
          prospect_id: missionData.prospectId,
          project_type: missionData.projectType,
          step_name: missionData.stepName || null,
          title: missionData.title,
          description: missionData.description || null,
          status: missionData.status || 'pending',
          source: missionData.source || 'manual',
          is_blocking: missionData.isBlocking !== false,
          due_date: missionData.dueDate || null,
          created_by: missionData.createdBy || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Mise à jour optimiste locale
      await fetchMissions();

      return { success: true, data };
    } catch (err) {
      logger.error('[useSupabaseMissions] Erreur create', { error: err.message });
      return { success: false, error: err.message };
    }
  }, [fetchMissions]);

  // Modifier mission
  const updateMission = useCallback(async (missionId, updates) => {
    try {
      // Transformation camelCase → snake_case
      const dbUpdates = {};
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.isBlocking !== undefined) dbUpdates.is_blocking = updates.isBlocking;
      if (updates.partnerNotes !== undefined) dbUpdates.partner_notes = updates.partnerNotes;
      if (updates.adminNotes !== undefined) dbUpdates.admin_notes = updates.adminNotes;
      if (updates.completedAt !== undefined) dbUpdates.completed_at = updates.completedAt;

      dbUpdates.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('missions')
        .update(dbUpdates)
        .eq('id', missionId);

      if (error) throw error;

      // Mise à jour optimiste locale
      setMissions(prev => prev.map(m => 
        m.id === missionId ? { ...m, ...updates } : m
      ));

      return { success: true };
    } catch (err) {
      logger.error('[useSupabaseMissions] Erreur update', { error: err.message });
      return { success: false, error: err.message };
    }
  }, []);

  // Supprimer mission
  const deleteMission = useCallback(async (missionId) => {
    try {
      const { error } = await supabase
        .from('missions')
        .delete()
        .eq('id', missionId);

      if (error) throw error;

      // Mise à jour optimiste locale
      setMissions(prev => prev.filter(m => m.id !== missionId));

      return { success: true };
    } catch (err) {
      logger.error('[useSupabaseMissions] Erreur delete', { error: err.message });
      return { success: false, error: err.message };
    }
  }, []);

  // Real-time subscription
  useEffect(() => {
    if (!enabled) return;

    fetchMissions();

    // Channel unique par tenant
    const channelName = organizationId 
      ? `missions-org-${organizationId}`
      : partnerId
      ? `missions-partner-${partnerId}`
      : 'missions-global';

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'missions',
        }, 
        (payload) => {
          logger.debug('[useSupabaseMissions] Real-time event', { 
            event: payload.eventType,
            missionId: payload.new?.id || payload.old?.id,
          });
          fetchMissions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMissions, enabled, organizationId, partnerId]);

  return {
    missions,
    loading,
    error,
    refetch: fetchMissions,
    createMission,
    updateMission,
    deleteMission,
  };
};
```

**Test**:
```javascript
// Test admin
const { missions } = useSupabaseMissions({ organizationId: 'org-123' });

// Test partenaire
const { missions } = useSupabaseMissions({ partnerId: 'partner-456' });

// Test avec filtres
const { missions } = useSupabaseMissions({ 
  prospectId: 'prospect-789',
  projectType: 'ACC',
  status: 'pending',
});
```

**Rollback**:
```bash
rm src/hooks/useSupabaseMissions.js
```

---

#### Step 7: Utiliser useSupabaseMissions dans pages admin

**Objectif**: Remplacer requêtes inline par hook centralisé

**Fichiers impactés**:
- `src/pages/admin/PartnersListPage.jsx`
- `src/pages/admin/PartnerDetailPage.jsx`

**Exemple modification PartnersListPage.jsx**:
```javascript
// AVANT (lignes ~120-140)
const [missionsCount, setMissionsCount] = useState({});

useEffect(() => {
  async function fetchMissions() {
    const { data } = await supabase
      .from('missions')
      .select('partner_id');
    
    const counts = data.reduce((acc, m) => {
      acc[m.partner_id] = (acc[m.partner_id] || 0) + 1;
      return acc;
    }, {});
    
    setMissionsCount(counts);
  }
  fetchMissions();
}, []);

// APRÈS
import { useSupabaseMissions } from '@/hooks/useSupabaseMissions';

const { missions } = useSupabaseMissions({ organizationId });

const missionsCountByPartner = useMemo(() => {
  return missions.reduce((acc, m) => {
    acc[m.partnerId] = (acc[m.partnerId] || 0) + 1;
    return acc;
  }, {});
}, [missions]);
```

**Rollback**: Git revert

---

#### Step 8: Extraire enums MISSION_STATUS et SOURCE

**Objectif**: Éliminer magic strings

**Fichier**: `src/lib/constants.js`

**Code à ajouter**:
```javascript
// =====================================================
// ENUMS - MISSIONS
// =====================================================

/**
 * Status possibles d'une mission partenaire
 * Correspond à CHECK constraint DB: status IN (...)
 */
export const MISSION_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  BLOCKED: 'blocked',
  CANCELLED: 'cancelled',
};

/**
 * Labels UI pour affichage status
 */
export const MISSION_STATUS_LABELS = {
  [MISSION_STATUS.PENDING]: 'En attente',
  [MISSION_STATUS.IN_PROGRESS]: 'En cours',
  [MISSION_STATUS.COMPLETED]: 'Terminée',
  [MISSION_STATUS.BLOCKED]: 'Bloquée',
  [MISSION_STATUS.CANCELLED]: 'Annulée',
};

/**
 * Couleurs badges par status
 */
export const MISSION_STATUS_COLORS = {
  [MISSION_STATUS.PENDING]: 'bg-gray-50 text-gray-700 border-gray-100',
  [MISSION_STATUS.IN_PROGRESS]: 'bg-blue-50 text-blue-700 border-blue-100',
  [MISSION_STATUS.COMPLETED]: 'bg-green-50 text-green-700 border-green-100',
  [MISSION_STATUS.BLOCKED]: 'bg-red-50 text-red-700 border-red-100',
  [MISSION_STATUS.CANCELLED]: 'bg-gray-50 text-gray-500 border-gray-100',
};

/**
 * Source de création de la mission
 * Correspond à CHECK constraint DB: source IN (...)
 */
export const MISSION_SOURCE = {
  WORKFLOW: 'workflow',
  AI: 'ai',
  MANUAL: 'manual',
};

/**
 * Labels UI pour affichage source
 */
export const MISSION_SOURCE_LABELS = {
  [MISSION_SOURCE.WORKFLOW]: 'Workflow automatique',
  [MISSION_SOURCE.AI]: 'Créée par IA (Charly)',
  [MISSION_SOURCE.MANUAL]: 'Créée manuellement',
};
```

**Rollback**: Supprimer les exports

---

#### Step 9: Remplacer magic strings par enums

**Objectif**: Utiliser constantes partout

**Fichiers à modifier**:
- `src/hooks/useWorkflowExecutor.js`
- `src/pages/partner/PartnerMissionsPage.jsx`
- `src/pages/partner/PartnerMissionDetailPage.jsx`
- `src/hooks/useSupabaseMissions.js`

**Exemple**:
```javascript
// AVANT
status: 'pending',
if (m.status === 'completed') { ... }

// APRÈS
import { MISSION_STATUS } from '@/lib/constants';

status: MISSION_STATUS.PENDING,
if (m.status === MISSION_STATUS.COMPLETED) { ... }
```

**Rollback**: Git revert

---

### ✅ PHASE 5: VALIDATION & DOC — 90 min

#### Step 10: Tests E2E complets

**Fichier**: `PARTNERS_MIGRATION_TESTS.md` (nouveau)

**Checklist 10 tests manuels**:

```markdown
# Tests Migration Partenaires V1→V2

## Setup
- Environnement: localhost:5173 + Supabase dev
- 2 organisations: org1, org2
- 2 admins: admin1 (org1), admin2 (org2)
- 2 partenaires: partner1 (org1), partner2 (org2)
- 2 prospects: prospect1 (org1), prospect2 (org2)

---

## Test 1: Admin invite partenaire ✅/❌
1. Login admin1
2. /admin/partners → "Inviter partenaire"
3. Remplir: Entreprise X, email@test.fr, Jean, Dupont, 0612345678
4. Valider
5. Vérifier:
   - SELECT auth.users → 1 row email@test.fr
   - SELECT partners → 1 row organization_id=org1
   - Email reçu avec magic link

---

## Test 2: Admin config workflow V2 action PARTENAIRE ✅/❌
1. /admin/workflow-v2-config
2. Module X → Section "À qui s'adresse l'action ?"
3. Sélectionner "Partenaire"
4. Dropdown → Sélectionner partner1
5. Instructions: "Faire visite technique"
6. Toggle bloquante: ON
7. Sauvegarder
8. Vérifier:
   - SELECT workflow_module_templates → config.actionConfig.type='partner_task'
   - config.actionConfig.partnerId = partner1.id
   - config.actionConfig.isBlocking = true

---

## Test 3: Robot exécute → mission créée ✅/❌
1. Page prospect1 → Déclencher module X
2. Attendre exécution robot
3. Vérifier:
   - Toast "Mission partenaire créée"
   - SELECT missions → 1 row
   - prospect_id = prospect1.id
   - partner_id = partner1.id
   - is_blocking = true
   - status = 'pending'

---

## Test 4: Partenaire login → voit mission ✅/❌
1. Logout admin
2. /partner/login → Login partner1
3. Vérifier redirection /partner/missions
4. Vérifier liste:
   - 1 mission affichée
   - Title = "Mission pour {prospect1.name}"
   - Badge "Bloquante" visible
   - Badge status "En attente"

---

## Test 5: Partenaire complète → status updated ✅/❌
1. Tap mission
2. Bouton "Commencer" → Vérifier status 'in_progress'
3. Textarea notes → Saisir "RAS, faisable"
4. Bouton "Terminé"
5. Vérifier:
   - Toast "Mission complétée"
   - SELECT missions → status='completed', completed_at NOT NULL
   - partner_notes = "RAS, faisable"

---

## Test 6: Workflow bloqué par mission pending ✅/❌
1. Login admin1
2. Créer mission bloquante status='pending' (SQL direct)
3. Page prospect1 → Déclencher étape suivante workflow
4. Vérifier:
   - Toast "⏸️ Workflow en attente: {mission.title}"
   - Aucune action étape exécutée
   - Log warn dans console

---

## Test 7: Mission completed → workflow reprend ✅/❌
1. Mission du Test 6 → UPDATE status='completed'
2. Re-déclencher étape workflow
3. Vérifier:
   - Pas de toast blocage
   - Actions étape exécutées
   - Workflow progresse

---

## Test 8: Multi-tenant missions - Admin isolation ✅/❌
1. Login admin1
2. /admin/partners → Fiche partner1
3. Compter missions visibles
4. Logout → Login admin2
5. /admin/partners → Fiche partner2
6. Vérifier:
   - Admin1 voit SEULEMENT missions org1
   - Admin2 voit SEULEMENT missions org2
   - Aucun cross-tenant leak

---

## Test 9: Multi-tenant missions - Partner isolation ✅/❌
1. Login partner1
2. /partner/missions → Noter count
3. Logout → Login partner2
4. /partner/missions → Noter count
5. Vérifier:
   - Partner1 voit SEULEMENT ses missions (partner_id=partner1.id)
   - Partner2 voit SEULEMENT ses missions (partner_id=partner2.id)
   - RLS fonctionne

---

## Test 10: is_blocking=false → workflow ne bloque pas ✅/❌
1. Config workflow V2 → Action PARTENAIRE
2. Toggle bloquante: OFF
3. Sauvegarder → Déclencher robot
4. Créer mission (is_blocking=false, status='pending')
5. Déclencher étape suivante workflow
6. Vérifier:
   - PAS de toast blocage
   - Workflow continue normalement
   - is_blocking=false ignoré
```

**Rollback**: N/A (tests read-only)

---

#### Step 11: Mise à jour documentation

**Fichiers à modifier**:

1. **PARTNERS_TODO.md** — Cocher items "À faire"
```markdown
## ✅ Fait
- [x] Modèle partenaire (table)
- [x] Modèle mission (table)
- [x] Colonne is_blocking ajoutée (18 fév 2026)
- [x] RLS multi-tenant missions strict (18 fév 2026)
- [x] Bridge V2→V1 PARTENAIRE (18 fév 2026)
- [x] Logique blocage workflow (18 fév 2026)
- [x] Hook useSupabaseMissions centralisé (18 fév 2026)
- [x] Enums MISSION_STATUS et SOURCE (18 fév 2026)

## ⏳ À faire
- [ ] Notifications partenaires (push mobile)
- [ ] Intégration IA → mission (source = ai)
```

2. **supabase/schema.sql** — Ajouter colonne is_blocking dans commentaires
```sql
COMMENT ON COLUMN public.missions.is_blocking IS 
  'Mission bloquante : si TRUE, le workflow doit attendre complétion avant de continuer.
   Workflow vérifie automatiquement via checkMissionBlockingStatus().
   Ajouté le 18 février 2026.';
```

3. **supabase/AUDIT_SCHEMA.md** — Mettre à jour section missions
```markdown
### XX. `missions` ✅ BON (mis à jour 18 fév 2026)

| Aspect | Statut | Notes |
|--------|--------|-------|
| Structure | ✅ | Colonne `is_blocking` ajoutée |
| Relations | ✅ | FK → partners, prospects, users |
| RLS Policies | ✅ | 6 policies multi-tenant strict |
| Index | ✅ | 7 indexes (partner_id, prospect_id, organization_id, status, source, project_type, due_date) |

**Correctifs appliqués (18 fév 2026)**:
- ✅ Colonne `is_blocking BOOLEAN DEFAULT FALSE`
- ✅ Policies admin filtrent par `organization_id` (cross-tenant leak fixé)
```

4. **Créer docs/PARTNERS_MIGRATION_V1_TO_V2.md** — Récap complet
```markdown
# Migration Partenaires V1→V2 — Récapitulatif

**Date**: 18 février 2026  
**Durée**: ~3 heures (setup + tests)  
**Impact**: Module partenaires 100% fonctionnel en V2

## Modifications DB
- ✅ Colonne `missions.is_blocking BOOLEAN DEFAULT FALSE`
- ✅ RLS policies missions admin multi-tenant strict

## Modifications Code
- ✅ `executeActionOrderV2.js` → case 'PARTENAIRE'
- ✅ `useWorkflowExecutor.js` → checkMissionBlockingStatus()
- ✅ `useWorkflowExecutor.js` → executeWorkflowStep() blocage
- ✅ `useSupabaseMissions.js` → hook centralisé (optionnel)
- ✅ `constants.js` → enums MISSION_STATUS/SOURCE (optionnel)

## Tests
- ✅ 10/10 tests E2E passés

## Rollback
Chaque step a son rollback documenté (SQL + code)
```

**Rollback**: Git revert (documentation uniquement)

---

## 7️⃣ MINI-PROMPTS SAFE (COPIER-COLLER)

### 🟢 Prompt 1: Ajouter colonne is_blocking

```
CONTEXTE: Table missions manque colonne is_blocking utilisée par code V1
FICHIER: Créer add_is_blocking_to_missions.sql
INTERDICTIONS: Ne touche qu'à la table missions, aucun autre changement
INPUTS REQUIS: Aucun
SORTIE ATTENDUE: 
- Script SQL avec ALTER TABLE ADD COLUMN
- COMMENT ON COLUMN
- Test INSERT avec is_blocking=true
- Rollback ALTER TABLE DROP COLUMN
GUARDRAILS:
- DEFAULT FALSE (pas NULL)
- Type BOOLEAN strict
- Ne modifie aucune policy RLS existante
- Vérification post-migration (DO $$)
```

---

### 🟢 Prompt 2: Fix RLS missions multi-tenant

```
CONTEXTE: Policies admin missions ne filtrent pas organization_id (risque cross-tenant)
FICHIER: Créer fix_rls_missions_multitenant_strict.sql
INTERDICTIONS: Ne touche qu'aux 4 policies admin missions, pas aux policies partner
INPUTS REQUIS: Aucun
SORTIE ATTENDUE:
- DROP 4 policies admin existantes
- CREATE 4 nouvelles policies avec filtre users.organization_id = missions.organization_id
- Test multi-tenant (2 admins, 2 orgs, isolation vérifiée)
- Rollback: restaurer ancien DDL
GUARDRAILS:
- Garde les policies partner (1, 2) intactes
- Ne change aucun nom de policy
- Utilise EXISTS + JOIN users
- Vérifie post-migration que policies contiennent organization_id
```

---

### 🟢 Prompt 3: Bridge V2→V1 PARTENAIRE

```
CONTEXTE: executeActionOrderV2.js manque case PARTENAIRE pour créer missions
FICHIER: src/lib/executeActionOrderV2.js + src/hooks/useWorkflowExecutor.js
INTERDICTIONS: Ne touche qu'au switch case + export fonction, pas au reste
INPUTS REQUIS: Structure actionConfig { partnerId, instructions, isBlocking }
SORTIE ATTENDUE:
- Exporter executePartnerTaskAction() dans useWorkflowExecutor.js
- Importer dans executeActionOrderV2.js
- Ajouter case 'PARTENAIRE': dans switch (ligne ~150)
- Appeler executePartnerTaskAction()
- Logger debug mission créée
- Test: config V2 → simuler → vérifier DB insert
GUARDRAILS:
- Réutilise 100% code V1 existant (executePartnerTaskAction)
- Aucune duplication logique
- Garde compatibilité V1 intacte
- Validation partnerId présent + toast si manquant
```

---

### 🟢 Prompt 4: Helper checkMissionBlockingStatus

```
CONTEXTE: Logique blocage workflow manquante (is_blocking n'a aucun effet)
FICHIER: src/hooks/useWorkflowExecutor.js
INTERDICTIONS: Crée uniquement la fonction helper, ne modifie pas executeWorkflowStep encore
INPUTS REQUIS: prospectId, projectType
SORTIE ATTENDUE:
- Fonction async checkMissionBlockingStatus()
- Export function
- Requête: SELECT missions WHERE prospect_id + project_type + is_blocking=true + status NOT IN ('completed', 'cancelled')
- Return: {blocked: boolean, missionId: string|null, title: string, status: string}
- Gestion erreur: return blocked=false en cas d'erreur (fail-safe)
- Logger info si mission bloquante détectée
GUARDRAILS:
- Aucun side-effect (pure query + return)
- Fail-safe: erreur Supabase → ne bloque pas workflow
- maybeSingle() pas single() (peut être 0 row)
```

---

### 🟢 Prompt 5: Intégrer blocage dans workflow

```
CONTEXTE: executeWorkflowStep() doit vérifier missions bloquantes avant exécution
FICHIER: src/hooks/useWorkflowExecutor.js (fonction executeWorkflowStep)
INTERDICTIONS: Ne touche qu'au début de executeWorkflowStep, pas aux actions
INPUTS REQUIS: checkMissionBlockingStatus() déjà créée (Prompt 4)
SORTIE ATTENDUE:
- Appeler checkMissionBlockingStatus(prospectId, projectType) AVANT boucle actions
- Si blocked=true → Toast + Logger warn + return (stop workflow)
- Si blocked=false → Continuer normalement
- Toast: Titre "⏸️ Workflow en attente", Description avec nom mission + status
- Duration 8000ms (plus long pour lire)
GUARDRAILS:
- Placement: PREMIÈRE instruction après validation step
- Toast clair pour l'utilisateur (affiche titre mission + status)
- Logger warn avec context complet (prospectId, projectType, missionId, status, title)
- Ne modifie pas la boucle actions existante
```

---

### 🟢 Prompt 6: Créer useSupabaseMissions hook

```
CONTEXTE: Requêtes missions dupliquées dans plusieurs pages
FICHIER: src/hooks/useSupabaseMissions.js (nouveau)
INTERDICTIONS: Ne modifie aucune page existante encore, crée seulement le hook
INPUTS REQUIS: Structure table missions (colonnes DB)
SORTIE ATTENDUE:
- Hook useSupabaseMissions(options)
- Options: { organizationId, partnerId, prospectId, projectType, status, enabled }
- Méthodes: fetchMissions, createMission, updateMission, deleteMission
- Transformation snake_case → camelCase (is_blocking → isBlocking, etc.)
- Real-time subscription sur table missions
- Export { missions, loading, error, refetch, createMission, updateMission, deleteMission }
GUARDRAILS:
- Copier pattern useSupabasePartners.js (même style/structure)
- RLS fait le filtrage (pas de WHERE organization_id manuel dans requêtes)
- Cleanup subscription on unmount
- Logger toutes les erreurs avec context
```

---

### 🟢 Prompt 7: Utiliser useSupabaseMissions dans pages admin

```
CONTEXTE: Remplacer requêtes inline par hook centralisé
FICHIERS: src/pages/admin/PartnersListPage.jsx, src/pages/admin/PartnerDetailPage.jsx
INTERDICTIONS: Ne change que les requêtes missions, pas le reste de l'UI
INPUTS REQUIS: useSupabaseMissions hook créé (Prompt 6)
SORTIE ATTENDUE:
- Import { useSupabaseMissions } from '@/hooks/useSupabaseMissions'
- Remplacer supabase.from('missions').select() par hook
- Utiliser { missions, loading, error } du hook
- Test: liste missions affichée identique à avant
GUARDRAILS:
- Pas de refacto UI (seulement data layer)
- Pas de changement de logique métier
- Juste remplacement des fetch inline
- Garder même comportement UX
```

---

### 🟢 Prompt 8: Extraire enums MISSION_STATUS et SOURCE

```
CONTEXTE: Magic strings 'pending', 'workflow', etc. dispersés partout
FICHIER: src/lib/constants.js
INTERDICTIONS: Crée seulement les enums, ne modifie aucun fichier utilisant les strings
INPUTS REQUIS: Valeurs CHECK constraint DB (status, source)
SORTIE ATTENDUE:
- Export const MISSION_STATUS = { PENDING: 'pending', IN_PROGRESS: 'in_progress', COMPLETED: 'completed', BLOCKED: 'blocked', CANCELLED: 'cancelled' }
- Export const MISSION_SOURCE = { WORKFLOW: 'workflow', AI: 'ai', MANUAL: 'manual' }
- Export const MISSION_STATUS_LABELS = { pending: 'En attente', ... } (pour UI)
- Export const MISSION_STATUS_COLORS = { pending: 'bg-gray-50...', ... } (classes Tailwind)
- Pas de modification des fichiers existants encore
GUARDRAILS:
- Valeurs exactes = contraintes CHECK DB (pas d'invention)
- Export named (pas default)
- Documenter chaque enum avec JSDoc
```

---

### 🟢 Prompt 9: Remplacer magic strings par enums

```
CONTEXTE: Utiliser MISSION_STATUS et MISSION_SOURCE partout
FICHIERS: useWorkflowExecutor.js, PartnerMissionsPage.jsx, PartnerMissionDetailPage.jsx, useSupabaseMissions.js
INTERDICTIONS: Ne change que les strings, pas la logique
INPUTS REQUIS: Enums créés (Prompt 8)
SORTIE ATTENDUE:
- Import { MISSION_STATUS, MISSION_SOURCE, MISSION_STATUS_LABELS, MISSION_STATUS_COLORS } from '@/lib/constants'
- Remplacer 'pending' → MISSION_STATUS.PENDING
- Remplacer 'workflow' → MISSION_SOURCE.WORKFLOW
- Remplacer "En attente" → MISSION_STATUS_LABELS[status]
- Remplacer classes Tailwind → MISSION_STATUS_COLORS[status]
- Test: comportement identique (strings remplacées par constantes)
GUARDRAILS:
- Remplacement mécanique 1:1
- Aucun changement logique métier
- Build doit passer sans erreur TypeScript/ESLint
- Même output visuel (labels, couleurs)
```

---

### 🟢 Prompt 10: Test end-to-end complet

```
CONTEXTE: Valider tous les flows après migration
FICHIER: Créer PARTNERS_MIGRATION_TESTS.md
INTERDICTIONS: Teste uniquement, ne modifie aucun code
INPUTS REQUIS: Steps 1-9 complétés
SORTIE ATTENDUE:
- Checklist 10 tests manuels:
  1. Admin invite partenaire → compte créé
  2. Admin config workflow V2 action PARTENAIRE → sauvegardé
  3. Robot exécute → mission créée en DB
  4. Partenaire login → voit mission
  5. Partenaire complète → status updated
  6. Workflow bloqué par mission pending → toast affiché
  7. Mission completed → workflow reprend
  8. Multi-tenant: Admin org1 ne voit pas missions org2
  9. Partenaire org1 ne voit pas missions partenaire org2
  10. is_blocking=false → workflow ne bloque pas
- Résultat: ✅/❌ par test
- Setup: 2 orgs, 2 admins, 2 partenaires, 2 prospects
GUARDRAILS:
- Tests manuels (pas automated encore)
- Environnement: dev local + Supabase dev
- Rollback possible si ❌ (scripts fournis)
- Documenter EXACT steps reproductibles
```

---

### 🟢 Prompt 11: Mise à jour documentation

```
CONTEXTE: Documenter la migration complétée
FICHIERS: PARTNERS_TODO.md, supabase/schema.sql, supabase/AUDIT_SCHEMA.md, docs/PARTNERS_MIGRATION_V1_TO_V2.md (nouveau)
INTERDICTIONS: Ne modifie que la documentation, aucun code
INPUTS REQUIS: Migration complétée (Steps 1-10 validés ✅)
SORTIE ATTENDUE:
- PARTNERS_TODO.md: Cocher items "À faire" → "✅ Fait" + date
- supabase/schema.sql: Ajouter COMMENT ON COLUMN is_blocking
- supabase/AUDIT_SCHEMA.md: Section missions mise à jour (nouvelle colonne, policies fixes)
- Créer docs/PARTNERS_MIGRATION_V1_TO_V2.md avec:
  * Modifications DB (scripts SQL appliqués)
  * Modifications Code (fichiers + lignes modifiées)
  * Tests (résultats 10/10 ✅)
  * Rollback (procédure complète)
GUARDRAILS:
- Documenter ce qui A ÉTÉ fait, pas ce qui devrait
- Markdown propre avec tables/listes
- Liens vers fichiers modifiés (chemins absolus)
- Dates précises (18 février 2026)
```

---

## 8️⃣ INPUTS MANQUANTS (OPTIONNELS)

### ✅ Inputs fournis
- [x] DDL V1 partners/missions
- [x] RLS policies V1 (complètes)
- [x] Code frontend V1 (hooks, pages admin/partner)
- [x] Code workflow V1 (useWorkflowExecutor)
- [x] Config V2 (catalogueV2.js, moduleAIConfig.js)
- [x] UI V2 (WorkflowV2ConfigPage)

### ❓ Inputs manquants (pour affiner, non-bloquants)

#### 1. Mobile app partenaire
**Question**: Repository séparé ou intégré ?
- Si séparé → URL repo GitHub pour vérifier API compatibility
- Si intégré → Stack (React Native ? Flutter ? Capacitor ?)

**Impact si séparé**:
- Besoin vérifier endpoints API (`/partner/*` routes)
- Besoin vérifier auth flow (Supabase Auth mobile SDK)

---

#### 2. Edge functions Supabase
**Question**: Existe-t-il des fonctions serverless liées aux missions ?
- Path: `supabase/functions/`
- Exemple: `auto-assign-partner`, `mission-notifications`

**Impact si existe**:
- Besoin vérifier compatibilité avec colonne `is_blocking`
- Besoin vérifier RLS policies dans fonctions

---

#### 3. Notifications partenaires
**Question**: Système de push notifications prévu ?
- Firebase Cloud Messaging (FCM) ?
- Supabase Realtime uniquement ?
- Webhooks tiers (Twilio, OneSignal) ?

**Impact si existe**:
- Besoin trigger DB `AFTER INSERT ON missions` ?
- Besoin edge function `notify-partner` ?

---

#### 4. Tests automatisés
**Question**: Framework de test existant ?
- Unit: Jest/Vitest pour hooks ?
- Integration: Testing Library pour composants ?
- E2E: Playwright/Cypress ?

**Impact si existe**:
- Besoin ajouter tests `useSupabaseMissions.test.js`
- Besoin ajouter tests `checkMissionBlockingStatus.test.js`
- Besoin ajouter E2E `partner-mission-flow.spec.js`

---

## 9️⃣ RÉSUMÉ EXÉCUTIF

### 🎯 Objectif Mission
Migrer module PARTENAIRES + MISSIONS de V1 vers V2 avec **comportement identique** (pas d'amélioration, pas de refactor).

### 🔴 Problèmes Critiques Détectés

| # | Problème | Impact | Priorité |
|---|----------|--------|----------|
| 1 | Colonne `missions.is_blocking` manquante | ❌ Code V1 crash à l'insert | P0 |
| 2 | RLS missions admin sans filtre `organization_id` | 🔴 Cross-tenant leak | P0 |
| 3 | Bridge V2→V1 case PARTENAIRE absent | ❌ Workflow V2 ne crée pas missions | P0 |
| 4 | Logique blocage workflow pas implémentée | ⚠️ Toggle `isBlocking` sans effet | P1 |

### ✅ Solution Proposée

#### PHASE 1: FIX DB + RLS (15 min) — CRITIQUE
- Step 1: Ajouter colonne `is_blocking BOOLEAN DEFAULT FALSE`
- Step 2: Fix RLS missions multi-tenant strict (4 policies admin)

#### PHASE 2: BRIDGE V2→V1 (15 min) — CRITIQUE
- Step 3: Ajouter case PARTENAIRE dans `executeActionOrderV2.js`

#### PHASE 3: LOGIQUE BLOCAGE (25 min) — IMPORTANT
- Step 4: Helper `checkMissionBlockingStatus()`
- Step 5: Intégrer dans `executeWorkflowStep()`

#### PHASE 4: REFACTOR (70 min) — OPTIONNEL
- Step 6: Hook `useSupabaseMissions.js`
- Step 7: Utiliser hook dans pages admin
- Step 8-9: Enums `MISSION_STATUS`, `MISSION_SOURCE`

#### PHASE 5: VALIDATION (90 min) — QUALITÉ
- Step 10: Tests E2E (10 scénarios)
- Step 11: Documentation (4 fichiers)

### ⏱️ Effort Total

| Phase | Temps | Priorité | Bloquant |
|-------|-------|----------|----------|
| PHASE 1-3 | **55 min** | P0-P1 | ✅ OUI |
| PHASE 4 | 70 min | P2 | ❌ NON |
| PHASE 5 | 90 min | P2 | ❌ NON |
| **TOTAL** | **215 min** (3h35) | — | — |

### 🚀 Recommandation Finale

**Exécuter UNIQUEMENT Steps 1-5 IMMÉDIATEMENT** (55 min) pour débloquer Workflow V2 → missions partenaire.

Steps 6-11 peuvent être faits en **itération suivante** (refactor qualité code, non-bloquant).

---

## 📌 PROCHAINES ÉTAPES

### Pour l'opérateur humain
1. Lire ce fichier en entier
2. Copier Prompt 1 → Donner à ChatGPT
3. Exécuter script SQL généré
4. Tester → Valider
5. Copier Prompt 2 → Répéter
6. Etc. jusqu'à Step 5 minimum

### Pour ChatGPT (architecte)
1. Recevoir prompt mini
2. Produire **UN SEUL** livrable (SQL ou code)
3. Fournir test + rollback
4. Attendre validation humain
5. Passer au prompt suivant

---

**FIN DU DOCUMENT** ✅

Ce fichier est prêt à être copié-collé à ChatGPT pour exécution guidée step-by-step.
