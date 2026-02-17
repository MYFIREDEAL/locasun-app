# 🔍 VS MANQUEMENTS NOUVELLE ORG (Galvatest & autres)

**Date** : 17 février 2026  
**Contexte** : Comparaison entre ce qui est créé automatiquement vs ce qui manque lors de la création d'une nouvelle organisation (ex: galvatest.evatime.fr)  
**Objectif** : Identifier TOUS les manques pour garantir une expérience complète dès le jour 1

---

## 🎯 RÉSUMÉ EXÉCUTIF

### ❌ Problèmes identifiés
1. **Notifications** : Aucune config par défaut → clients ne reçoivent pas de notifications
2. **RDV/Rappels** : Tâches/Appointments créés par Workflow V2 sans owner valide → invisible dans agenda
3. **Project Templates** : Templates partagés (sans org_id) vs templates privés mal gérés
4. **Forms** : Aucun formulaire par défaut → admins doivent tout créer from scratch
5. **Workflow V2 Modules** : Aucune config pré-remplie → workflow vide
6. **Pipeline Steps** : Seulement 3 colonnes par défaut (MARKET, ETUDE, OFFRE) alors que modèles standards en ont 5+
7. **Landing Page** : Config générique uniquement (aucune personnalisation métier)
8. **Prompts Charly** : Table vide → aucune automatisation IA disponible
9. **Contract Templates** : Aucun template de contrat par défaut
10. **Global Pipeline Steps** : Seulement 3 étapes alors que standards en ont 5+

---

## 📊 COMPARAISON DÉTAILLÉE

### 1️⃣ TABLES SYSTÈME (CRITIQUES)

#### ✅ Ce qui EST créé automatiquement

| Table | Créé par | Contenu |
|-------|----------|---------|
| `organizations` | Edge Function `platform_create_organization` | ✅ 1 ligne : `{name, slug}` |
| `organization_domains` | Edge Function | ✅ 1 ligne : `{slug}.evatime.fr` (primary) |
| `organization_settings` | Edge Function | ✅ 1 ligne : `{display_name, logo_url: null, colors: défaut, form_contact_config: 5 champs}` |
| `users` | Edge Function | ✅ 1 ligne : Admin avec role "Global Admin" |
| `auth.users` | Supabase Auth | ✅ 1 user invité |

**Source** : `supabase/functions/platform_create_organization/index.ts` ligne 90-150

---

#### ❌ Ce qui MANQUE (tables vides ou incomplètes)

| Table | État actuel | Impact | Priorité |
|-------|-------------|--------|----------|
| `project_templates` | ⚠️ **VIDE pour cette org** | Aucun projet disponible côté client (ACC, Centrale, etc.) | 🔴 CRITIQUE |
| `global_pipeline_steps` | ⚠️ **3 colonnes génériques** | Pipeline incomplet (manque CONTRAT, CLIENT, etc.) | 🔴 CRITIQUE |
| `forms` | ❌ **VIDE** | Admin doit créer tous les formulaires manuellement | 🟠 IMPORTANT |
| `prompts` | ❌ **VIDE** | Aucune automatisation Charly IA | 🟠 IMPORTANT |
| `workflow_module_templates` | ❌ **VIDE** | Aucun module Workflow V2 configuré | 🟠 IMPORTANT |
| `contract_templates` | ❌ **VIDE** | Aucun modèle de contrat (PDF/signature) | 🟡 MOYEN |
| `partners` | ❌ **VIDE** | Aucun partenaire configuré | 🟢 FAIBLE |
| `missions` | ❌ **VIDE** | Aucune mission type définie | 🟢 FAIBLE |

---

### 2️⃣ DONNÉES PAR DÉFAUT (SEED DATA)

#### ✅ Ce qui existe dans `schema.sql` (INSERT par défaut)

```sql
-- Ligne 1496-1510 de schema.sql
INSERT INTO public.project_templates (type, title, client_title, icon, color, steps, is_public)
VALUES
  ('ACC', 'Autoconsommation Collective', 'Mon Projet ACC', '🌞', 'gradient-blue', '[...]', TRUE),
  ('Autonomie', 'Autonomie', 'Mon Projet Autonomie', '🔋', 'gradient-green', '[...]', TRUE),
  ('Centrale', 'Centrale (3-500 kWc)', 'Ma Centrale Solaire', '☀️', 'gradient-orange', '[...]', TRUE),
  ('Investissement', 'Investissement', 'Mon Investissement Solaire', '💎', 'gradient-purple', '[...]', TRUE),
  ('ProducteurPro', 'Producteur Pro', 'Mon Espace Producteur', '⚡', 'gradient-yellow', '[...]', FALSE);

-- Ligne 1512-1516
INSERT INTO public.global_pipeline_steps (step_id, label, color, position)
VALUES
  ('default-global-pipeline-step-0', 'MARKET', 'bg-blue-100', 0),
  ('default-global-pipeline-step-1', 'ETUDE', 'bg-yellow-100', 1),
  ('default-global-pipeline-step-2', 'OFFRE', 'bg-green-100', 2);
```

**⚠️ PROBLÈME** : Ces INSERT **N'ONT PAS de organization_id** → Données partagées entre TOUTES les orgs.

---

#### ❌ Ce qui manque (données spécifiques par org)

1. **project_templates avec organization_id = galvatest_uuid**
   - Actuellement : Les 5 projets existent SANS org_id (partagés globalement)
   - Problème : Galvatest ne peut pas modifier les templates sans impacter les autres orgs
   - Solution requise : Copier les 5 templates avec `organization_id = galvatest` lors de la création

2. **global_pipeline_steps complètes**
   - Actuellement : Seulement 3 colonnes (MARKET, ETUDE, OFFRE)
   - Standard industrie : 5-7 colonnes (MARKET, ETUDE, OFFRE, CONTRAT, CLIENT, TRAVAUX, EXPLOITATION)
   - Impact : Pipeline tronqué → admins doivent ajouter manuellement

3. **forms pré-configurés**
   ```json
   Formulaires manquants :
   - "Informations Bancaires" (RIB)
   - "Informations Propriétaire"
   - "Déclaration Travaux"
   - "Questionnaire Technique"
   - "Satisfaction Client"
   ```

4. **prompts de base**
   ```json
   Prompts manquants :
   - "Relance formulaire RIB"
   - "Confirmation RDV"
   - "Suivi projet mensuel"
   - "Workflow ACC - Documents"
   ```

5. **contract_templates standards**
   ```
   Templates manquants :
   - "Contrat ACC Standard"
   - "Contrat Centrale 3-100 kWc"
   - "Avenant Modification Puissance"
   - "Annexe Technique"
   ```

6. **workflow_module_templates par projet**
   ```
   Config V2 manquante pour :
   - ACC : inscription, connexion-centrale, facturation
   - Centrale : etude, offre, contrat, travaux, exploitation
   - Autonomie : audit, devis, installation, mise-en-service
   ```

---

### 3️⃣ NOTIFICATIONS & AUTOMATISATIONS

#### ❌ Problème #1 : Notifications clients absentes

**État actuel** :
```javascript
// organization_settings créé avec :
{
  organization_id: galvatest_uuid,
  display_name: "Galvatest",
  logo_url: null,
  primary_color: "#3b82f6",
  secondary_color: "#1e40af",
  form_contact_config: [...] // ✅ OK
  // ❌ MANQUE : client_notification_config
}
```

**Impact** :
- Clients ne reçoivent AUCUNE notification (nouveau message, formulaire envoyé, signature requise)
- `useSupabaseClientNotifications` retourne config vide → feature désactivée

**Solution requise** :
```sql
-- Ajouter dans platform_create_organization/index.ts
const { error: settingsError } = await supabaseAdmin
  .from('organization_settings')
  .insert({
    organization_id: organizationId,
    display_name: companyName,
    logo_url: null,
    primary_color: '#3b82f6',
    secondary_color: '#1e40af',
    form_contact_config: [...],
    
    -- 🔥 NOUVEAU : Config notifications client par défaut
    client_notification_config: [
      { type: 'new_message', enabled: true, label: 'Nouveau message' },
      { type: 'form_sent', enabled: true, label: 'Formulaire envoyé' },
      { type: 'signature_required', enabled: true, label: 'Signature requise' },
      { type: 'document_uploaded', enabled: true, label: 'Nouveau document' },
      { type: 'project_update', enabled: true, label: 'Mise à jour projet' }
    ]
  })
```

---

#### ❌ Problème #2 : RDV/Tâches créés par Workflow V2 sans owner valide

**Scénario** :
1. Admin configure Workflow V2 avec relances automatiques (J+3 → créer tâche)
2. Cron `auto-form-reminders` détecte formulaire en retard
3. Crée tâche avec `assigned_user_id = prospect.owner_id`
4. **PROBLÈME** : `owner_id` peut être NULL ou UUID invalide

**Code source problématique** :
```typescript
// supabase/functions/auto-form-reminders/index.ts ligne 130-140
const task = {
  prospect_id: prospectId,
  project_type: projectType,
  title: `Relancer ${prospect.name} - Formulaire non complété`,
  assigned_user_id: ownerId, // ❌ Peut être NULL
  status: 'pending',
  due_date: scheduledAt,
  source: 'auto_reminder'
}
```

**Impact** :
- Tâches créées mais invisibles dans l'agenda (filtrées par assigned_user_id)
- Admins ne voient jamais les relances automatiques
- System paraît "cassé" alors qu'il fonctionne techniquement

**Solution requise** :
```typescript
// Guard: Si owner_id invalide, assigner au premier Global Admin de l'org
let validOwnerId = ownerId;

if (!validOwnerId) {
  const { data: fallbackAdmin } = await supabase
    .from('users')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('role', 'Global Admin')
    .limit(1)
    .single();
  
  validOwnerId = fallbackAdmin?.id || null;
}

if (!validOwnerId) {
  throw new Error('Aucun admin disponible pour assigner la tâche');
}
```

---

### 4️⃣ WORKFLOW V2 (MODULE TEMPLATES)

#### ❌ État actuel : Table `workflow_module_templates` vide

**Impact** :
1. Admin ouvre Workflow V2 Config → Aucun module configuré
2. Doit configurer MANUELLEMENT chaque module pour chaque projet :
   - ACC : 3 modules (inscription, connexion-centrale, facturation)
   - Centrale : 5 modules (etude, offre, contrat, travaux, exploitation)
   - Autonomie : 4 modules
   - Investissement : 6 modules
   
   **= 18 modules à configurer from scratch !**

3. Pour CHAQUE module :
   - Objectif IA (textarea)
   - Instructions IA (textarea)
   - Actions autorisées (select multiple)
   - ActionConfig V2 :
     - Target audience (CLIENT/ADMIN)
     - Action type (FORM/SIGNATURE/NONE)
     - Formulaires autorisés (select multiple)
     - Templates autorisés (select multiple)
     - Management mode (AI/HUMAN)
     - Verification mode (AI/HUMAN)
     - Champs requis (si FORM)
     - Config relances (si FORM + CLIENT) : enabled, delayDays, maxRemindersBeforeTask

**Temps estimé par org** : 3-4 heures de configuration manuelle

---

#### ✅ Solution : Seeds Workflow V2 par défaut

**Fichier à créer** : `supabase/seeds/workflow_module_templates_defaults.sql`

```sql
-- Exemple pour ACC - Module "inscription"
INSERT INTO public.workflow_module_templates (
  org_id,
  project_type,
  module_id,
  config_json
)
SELECT 
  o.id as org_id,
  'ACC' as project_type,
  'inscription' as module_id,
  '{
    "objective": "Collecter les informations initiales du client pour démarrer le projet ACC",
    "instructions": "Sois chaleureux et rassurant. Explique les étapes du projet ACC de manière simple.",
    "buttonLabels": {
      "proceedLabel": "Valider et continuer",
      "needDataLabel": "J''ai besoin d''aide"
    },
    "allowedActions": ["answer_question", "show_form", "show_documents"],
    "actionConfig": {
      "targetAudience": "CLIENT",
      "actionType": "FORM",
      "allowedFormIds": ["form-inscription-acc"],
      "managementMode": "HUMAN",
      "verificationMode": "HUMAN",
      "requiredFields": ["nom", "email", "adresse"],
      "reminderConfig": {
        "enabled": true,
        "delayDays": 2,
        "maxRemindersBeforeTask": 3
      }
    }
  }'::jsonb
FROM public.organizations o
WHERE o.id = :organization_id;

-- Répéter pour les 18 modules standards...
```

**Alternative immédiate (Phase 1)** :
- Ajouter bouton "🎯 Copier config depuis org de référence" dans Workflow V2 Config
- Permet de cloner les configs de l'org LOCASUN (org principale) vers Galvatest
- Plus rapide à implémenter qu'un seed complexe

---

### 5️⃣ LANDING PAGE & BRANDING

#### ✅ Ce qui est créé

```javascript
// organization_settings
{
  display_name: "Galvatest",
  logo_url: null,
  primary_color: "#3b82f6",
  secondary_color: "#1e40af"
}
```

#### ❌ Ce qui manque

1. **landing_page_config vide** → Landing page très générique
   ```json
   {
     "hero_title": "", // Vide = fallback "Bienvenue chez Galvatest"
     "hero_subtitle": "Suivez l'avancement de votre projet en temps réel",
     "hero_cta_text": "Je démarre mon projet",
     "hero_cta_link": "/inscription",
     "show_how_it_works": true,
     "how_it_works_title": "Comment ça marche ?",
     "blocks": [
       {"id": 1, "icon": "1", "title": "Étude", "description": "..."},
       {"id": 2, "icon": "2", "title": "Installation", "description": "..."},
       {"id": 3, "icon": "3", "title": "Suivi", "description": "..."}
     ]
   }
   ```

2. **Aucune personnalisation métier**
   - Si Galvatest fait piscines → Landing page parle de "projet" générique
   - Devrait avoir "Construction de votre piscine sur-mesure"
   - Blocs adaptés : "Étude terrain", "Choix modèle", "Démarches administratives", "Construction", "Mise en eau"

---

### 6️⃣ FORMS & CONTRACT TEMPLATES

#### ❌ Tables vides → Aucune donnée exploitable

**Impact** :
1. Admin ne peut pas utiliser Workflow V2 (aucun formulaire à envoyer)
2. Admin ne peut pas lancer de signature (aucun template de contrat)
3. Doit créer manuellement :
   - **Formulaires** : Via FormsManagementPage (editor JSON complexe)
   - **Templates contrats** : Via ContractTemplatesPage (editor Markdown/variables)

**Temps estimé** : 2-3 heures de création manuelle

---

#### ✅ Solution : Bibliothèque de templates réutilisables

**Option A (court terme)** : Export/Import
```javascript
// Bouton "Exporter mes formulaires" dans FormsManagementPage
// → Génère JSON téléchargeable
// → Admin de nouvelle org importe ce JSON

// Structure export
{
  "forms": [
    {
      "form_id": "form-rib",
      "name": "Informations Bancaires",
      "fields": [...],
      "project_ids": ["ACC", "Centrale"],
      "audience": "client"
    }
  ],
  "templates": [
    {
      "id": "template-acc",
      "name": "Contrat ACC Standard",
      "type": "pdf",
      "content": "...",
      "variables": [...]
    }
  ]
}
```

**Option B (moyen terme)** : Marketplace interne
- Table `template_library` (globale, sans org_id)
- Bouton "📚 Ajouter depuis la bibliothèque" dans FormsManagementPage
- Copie le template dans l'org courante avec `organization_id`

---

### 7️⃣ PIPELINE STEPS (COLONNES MANQUANTES)

#### ⚠️ Situation actuelle

**Créées par défaut** (3 colonnes) :
```sql
INSERT INTO public.global_pipeline_steps (step_id, label, color, position)
VALUES
  ('default-global-pipeline-step-0', 'MARKET', 'bg-blue-100', 0),
  ('default-global-pipeline-step-1', 'ETUDE', 'bg-yellow-100', 1),
  ('default-global-pipeline-step-2', 'OFFRE', 'bg-green-100', 2);
```

**Standards industrie** (7 colonnes) :
1. MARKET (prospection)
2. ETUDE (qualification)
3. OFFRE (devis)
4. **CONTRAT** (signature) ← Manque
5. **CLIENT** (actif) ← Manque
6. **TRAVAUX** (en cours) ← Manque
7. **EXPLOITATION** (terminé) ← Manque

**Impact** :
- Pipeline tronqué visuellement
- Admin doit ajouter manuellement les colonnes manquantes
- Risque d'incohérence entre orgs (noms différents)

---

#### ✅ Solution : Ajouter colonnes complètes par défaut

**Modifier** : `supabase/functions/platform_create_organization/index.ts`

```typescript
// Après création organization_settings, insérer global_pipeline_steps

const defaultPipelineSteps = [
  { label: 'MARKET', color: 'bg-blue-100', position: 0 },
  { label: 'ETUDE', color: 'bg-yellow-100', position: 1 },
  { label: 'OFFRE', color: 'bg-green-100', position: 2 },
  { label: 'CONTRAT', color: 'bg-purple-100', position: 3 },
  { label: 'CLIENT', color: 'bg-teal-100', position: 4 },
  { label: 'TRAVAUX', color: 'bg-orange-100', position: 5 },
  { label: 'EXPLOITATION', color: 'bg-gray-100', position: 6 }
];

for (const step of defaultPipelineSteps) {
  await supabaseAdmin.from('global_pipeline_steps').insert({
    organization_id: organizationId,
    step_id: `org-${organizationId}-step-${step.position}`,
    label: step.label,
    color: step.color,
    position: step.position
  });
}
```

---

### 8️⃣ PROJECT TEMPLATES (GESTION MULTI-ORG)

#### ⚠️ Problème architectural

**État actuel** :
```sql
-- schema.sql ligne 1496
INSERT INTO public.project_templates (type, title, ..., is_public)
VALUES
  ('ACC', 'Autoconsommation Collective', ..., TRUE);
  -- ❌ PAS de organization_id → Template partagé globalement
```

**Conséquences** :
1. Tous les project_templates sont partagés entre orgs
2. Si Galvatest modifie "Centrale" → Impact sur toutes les autres orgs
3. Impossible d'avoir des templates personnalisés par org

**Architecture cible** :
```
project_templates :
├── Templates globaux (organization_id = NULL, is_template_library = TRUE)
│   └── Modèles de base réutilisables (ACC, Centrale, etc.)
│
└── Templates privés (organization_id = galvatest_uuid)
    └── Copies modifiables par l'org
```

---

#### ✅ Solution : Copie automatique lors de la création org

**Modifier** : `supabase/functions/platform_create_organization/index.ts`

```typescript
// Après création organization_settings

// 6️⃣ COPIER LES PROJECT TEMPLATES STANDARDS
const { data: globalTemplates } = await supabaseAdmin
  .from('project_templates')
  .select('*')
  .is('organization_id', null) // Templates globaux
  .eq('is_public', true);

for (const template of globalTemplates) {
  // Créer une copie pour cette org
  await supabaseAdmin.from('project_templates').insert({
    type: `${template.type}-${organizationId.slice(0, 8)}`, // Type unique
    title: template.title,
    client_title: template.client_title,
    icon: template.icon,
    color: template.color,
    image_url: template.image_url,
    client_description: template.client_description,
    cta_text: template.cta_text,
    is_public: true,
    steps: template.steps, // Copie profonde du JSONB
    organization_id: organizationId // 🔥 CLOISONNEMENT
  });
}
```

---

## 🎯 PLAN D'ACTION PRIORISÉ

### 🔴 PHASE 1 — CRITIQUE (Bloquants jour 1)

| Action | Fichier à modifier | Temps |
|--------|-------------------|-------|
| 1. Ajouter `client_notification_config` par défaut | `platform_create_organization/index.ts` | 30 min |
| 2. Copier les 5 `project_templates` avec org_id | `platform_create_organization/index.ts` | 1h |
| 3. Créer 7 `global_pipeline_steps` complètes | `platform_create_organization/index.ts` | 30 min |
| 4. Guard tâches auto : owner_id valide | `auto-form-reminders/index.ts` | 45 min |

**Total Phase 1** : 2h45

---

### 🟠 PHASE 2 — IMPORTANT (Utilisabilité J1-J7)

| Action | Solution | Temps |
|--------|----------|-------|
| 5. Copie config Workflow V2 depuis org référence | Bouton UI "Cloner config" | 2h |
| 6. 5 formulaires standards (RIB, Proprio, etc.) | Seeds SQL ou export/import JSON | 3h |
| 7. 3 templates contrats (ACC, Centrale, Avenant) | Seeds SQL | 2h |
| 8. 5 prompts Charly par défaut | Seeds SQL | 1h |

**Total Phase 2** : 8h

---

### 🟡 PHASE 3 — CONFORT (J7-J30)

| Action | Solution | Temps |
|--------|----------|-------|
| 9. Landing page personnalisée par métier | Assistant IA génération config | 4h |
| 10. Marketplace templates forms/contrats | Table `template_library` + UI | 8h |
| 11. Wizard onboarding nouvelle org | Tunnel guidé 5 étapes | 6h |

**Total Phase 3** : 18h

---

## 📋 CHECKLIST VALIDATION NOUVELLE ORG

### ✅ À vérifier manuellement après création

- [ ] **organization_settings** : `client_notification_config` présent et non-NULL
- [ ] **project_templates** : 5 templates copiés avec `organization_id = nouvelle_org_uuid`
- [ ] **global_pipeline_steps** : 7 colonnes créées (MARKET → EXPLOITATION)
- [ ] **forms** : Au moins 5 formulaires standards copiés
- [ ] **prompts** : Au moins 3 prompts de base copiés
- [ ] **workflow_module_templates** : Au moins 10 modules configurés
- [ ] **contract_templates** : Au moins 3 templates PDF copiés
- [ ] **users** : Admin principal avec `role = "Global Admin"` et `organization_id` valide
- [ ] **Test notification client** : Créer prospect → Envoyer message → Vérifier notification reçue
- [ ] **Test tâche auto** : Envoyer formulaire avec relances → Attendre J+X → Vérifier tâche créée dans agenda admin

---

## 🔗 FICHIERS CONCERNÉS

### Backend (Edge Functions)
- `supabase/functions/platform_create_organization/index.ts` (150 lignes à modifier)
- `supabase/functions/auto-form-reminders/index.ts` (10 lignes à modifier)

### Migrations SQL
- `supabase/seeds/project_templates_defaults.sql` (nouveau)
- `supabase/seeds/forms_defaults.sql` (nouveau)
- `supabase/seeds/workflow_module_templates_defaults.sql` (nouveau)
- `supabase/seeds/prompts_defaults.sql` (nouveau)
- `supabase/seeds/contract_templates_defaults.sql` (nouveau)

### Frontend
- `src/pages/platform/OrganizationsListPage.jsx` (afficher warning si config incomplète)
- `src/pages/admin/WorkflowV2ConfigPage.jsx` (bouton "Cloner depuis org référence")
- `src/pages/admin/FormsManagementPage.jsx` (bouton "Importer depuis bibliothèque")

---

## 💡 RECOMMANDATIONS ARCHITECTURALES

### 1. Environnement de test dédié

**Problème actuel** : Créer Galvatest en prod → Risque d'oublier des configs

**Solution** :
```bash
# Environnement staging
https://staging.evatime.fr

# Script de test automatisé
supabase/tests/test_new_org_creation.sh
→ Crée org test
→ Vérifie checklist 10 points
→ Supprime org test
→ Rapport JSON résultat
```

---

### 2. Table `organization_setup_status`

**Suivre la complétude de l'onboarding** :

```sql
CREATE TABLE public.organization_setup_status (
  organization_id UUID PRIMARY KEY REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Étapes complétées
  has_project_templates BOOLEAN DEFAULT FALSE,
  has_pipeline_steps BOOLEAN DEFAULT FALSE,
  has_forms BOOLEAN DEFAULT FALSE,
  has_workflow_configs BOOLEAN DEFAULT FALSE,
  has_notification_config BOOLEAN DEFAULT FALSE,
  has_landing_page_config BOOLEAN DEFAULT FALSE,
  
  -- Métadonnées
  setup_completed_at TIMESTAMPTZ,
  onboarding_wizard_seen BOOLEAN DEFAULT FALSE,
  
  -- Score de complétude (0-100)
  completeness_score INTEGER DEFAULT 0
);
```

**Utilisation** :
- Dashboard platform admin : indicateur "🟢 Setup complet" ou "🟠 À finaliser"
- Trigger notification au Global Admin : "Il reste 3 étapes à configurer"

---

### 3. Logs de création org

**Traçabilité des problèmes** :

```sql
CREATE TABLE public.organization_creation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Détail de ce qui a été créé
  created_tables JSONB, -- { "organization_settings": true, "project_templates": false }
  errors JSONB, -- { "workflow_module_templates": "Query timeout" }
  
  -- Contexte
  creator_email TEXT,
  creation_duration_ms INTEGER,
  supabase_function_version TEXT
);
```

**Utilité** :
- Débogage : "Pourquoi Galvatest n'a pas de notifications ?"
- Statistiques : "Taux de succès création org = 94%"

---

## 🚀 QUICK WIN (30 minutes)

**Action immédiate la plus impactante** :

### Ajouter `client_notification_config` par défaut

**Fichier** : `supabase/functions/platform_create_organization/index.ts`

**Ligne 106** — Modifier :
```typescript
// 🔥 AVANT
await supabaseAdmin.from("organization_settings").insert({
  organization_id: organizationId,
  display_name: companyName,
  logo_url: null,
  primary_color: "#3b82f6",
  secondary_color: "#1e40af",
  form_contact_config: [...]
})

// ✅ APRÈS
await supabaseAdmin.from("organization_settings").insert({
  organization_id: organizationId,
  display_name: companyName,
  logo_url: null,
  primary_color: "#3b82f6",
  secondary_color: "#1e40af",
  form_contact_config: [...],
  
  // 🔥 NOUVEAU : Notifications clients activées par défaut
  client_notification_config: [
    { type: 'new_message', enabled: true, label: 'Nouveau message', icon: '💬' },
    { type: 'form_sent', enabled: true, label: 'Formulaire à remplir', icon: '📝' },
    { type: 'signature_required', enabled: true, label: 'Signature requise', icon: '✍️' },
    { type: 'document_uploaded', enabled: true, label: 'Nouveau document', icon: '📄' },
    { type: 'project_update', enabled: true, label: 'Mise à jour projet', icon: '🔄' },
    { type: 'appointment_scheduled', enabled: true, label: 'Nouveau RDV', icon: '📅' }
  ]
})
```

**Déploiement** :
```bash
cd supabase/functions
supabase functions deploy platform_create_organization
```

**Validation** :
1. Créer org test "TestNotif"
2. Vérifier dans Supabase Dashboard : `organization_settings.client_notification_config` non-NULL
3. Créer prospect dans cette org
4. Envoyer message → Vérifier notification reçue

---

## 📚 RÉFÉRENCES

- `INVENTAIRE_MULTI_TENANT_EXISTANT.md` — Architecture multi-org complète
- `AUTO_REMINDERS_OVERVIEW.md` — Système de relances automatiques
- `supabase/functions/platform_create_organization/index.ts` — Code source création org
- `supabase/schema.sql` ligne 1496-1520 — Seeds par défaut
- `.github/copilot-instructions.md` ligne 120-160 — Workflow V2 architecture

---

**FIN DU VS MANQUEMENTS NOUVELLE ORG**
