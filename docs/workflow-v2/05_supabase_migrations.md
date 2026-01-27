# Migrations Supabase - Workflow V2

## Vue d'ensemble

Ce document décrit les migrations DB nécessaires pour le Workflow V2, avec priorité aux solutions sans DB quand possible.

---

## 1. Base d'info par module (Mémoire IA)

### Besoin

Stocker des informations de référence par module pour que l'IA puisse répondre aux questions NEED_DATA avec du contexte pertinent. Permet d'enrichir la base au fil du temps.

### Option A : Sans DB (Phase 1 actuelle) ✅

**Fichier:** `src/lib/moduleInfoBase.js`

- Données hardcodées en JSON
- Modification = déploiement code
- Pas de persistence des enrichissements

**Avantages:**
- Zero migration
- Fonctionne immédiatement
- Pas de latence réseau

**Inconvénients:**
- Pas d'enrichissement dynamique
- Modification = nouveau déploiement
- Pas de versioning des données

### Option B : Avec DB (Phase 2+) — RECOMMANDÉ pour mémoire IA

**Table:** `module_info_base`

**Avantages:**
- Enrichissement dynamique par l'IA
- Versioning des données
- Audit trail des modifications
- Multi-tenant ready (par organization_id)

---

### Migration SQL : `module_info_base`

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION: Créer table module_info_base
-- Workflow V2 - Mémoire IA par module
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- Exécution: Supabase Dashboard > SQL Editor
-- Date: À exécuter quand prêt pour Phase 2
-- 
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Créer la table principale
CREATE TABLE IF NOT EXISTS module_info_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identifiant du module (ex: 'appel-offre', 'pdb', 'raccordement')
  module_id TEXT NOT NULL,
  
  -- Organisation (multi-tenant)
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Contenu structuré
  title TEXT NOT NULL,
  description TEXT,
  
  -- Données JSON flexibles
  checklist JSONB DEFAULT '[]'::jsonb,           -- ["étape 1", "étape 2", ...]
  faq JSONB DEFAULT '[]'::jsonb,                 -- [{"question": "...", "answer": "..."}]
  required_documents JSONB DEFAULT '[]'::jsonb,  -- ["doc 1", "doc 2", ...]
  tips JSONB DEFAULT '[]'::jsonb,                -- ["💡 conseil 1", ...]
  contacts JSONB DEFAULT '[]'::jsonb,            -- [{"role": "...", "info": "..."}]
  
  -- Mémoire IA enrichie
  ai_memory JSONB DEFAULT '{}'::jsonb,           -- Données apprises par l'IA
  ai_embeddings VECTOR(1536),                    -- Embeddings pour recherche sémantique (optionnel)
  
  -- Métadonnées
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  
  -- Contrainte unique: un module par organisation
  UNIQUE(module_id, organization_id)
);

-- 2. Index pour performances
CREATE INDEX IF NOT EXISTS idx_module_info_base_module_id 
  ON module_info_base(module_id);

CREATE INDEX IF NOT EXISTS idx_module_info_base_org_id 
  ON module_info_base(organization_id);

CREATE INDEX IF NOT EXISTS idx_module_info_base_active 
  ON module_info_base(is_active) WHERE is_active = true;

-- 3. Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_module_info_base_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_module_info_base_updated_at
  BEFORE UPDATE ON module_info_base
  FOR EACH ROW
  EXECUTE FUNCTION update_module_info_base_updated_at();

-- 4. RLS Policies
ALTER TABLE module_info_base ENABLE ROW LEVEL SECURITY;

-- Lecture: Admins de l'organisation
CREATE POLICY "module_info_base_select_policy" ON module_info_base
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE user_id = auth.uid()
    )
    OR organization_id IS NULL  -- Données globales
  );

-- Insert/Update: Admins seulement
CREATE POLICY "module_info_base_insert_policy" ON module_info_base
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE user_id = auth.uid() 
      AND role IN ('Global Admin', 'Manager')
      AND organization_id = module_info_base.organization_id
    )
  );

CREATE POLICY "module_info_base_update_policy" ON module_info_base
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE user_id = auth.uid() 
      AND role IN ('Global Admin', 'Manager')
      AND organization_id = module_info_base.organization_id
    )
  );

-- 5. Commentaires
COMMENT ON TABLE module_info_base IS 'Base de connaissances par module pour IA Workflow V2';
COMMENT ON COLUMN module_info_base.ai_memory IS 'Données apprises dynamiquement par l''IA';
COMMENT ON COLUMN module_info_base.ai_embeddings IS 'Vecteurs pour recherche sémantique (pgvector)';
```

---

### Rollback SQL

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- ROLLBACK: Supprimer table module_info_base
-- ⚠️ ATTENTION: Perte de données irréversible
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Supprimer les policies
DROP POLICY IF EXISTS "module_info_base_select_policy" ON module_info_base;
DROP POLICY IF EXISTS "module_info_base_insert_policy" ON module_info_base;
DROP POLICY IF EXISTS "module_info_base_update_policy" ON module_info_base;

-- 2. Supprimer le trigger
DROP TRIGGER IF EXISTS trigger_module_info_base_updated_at ON module_info_base;
DROP FUNCTION IF EXISTS update_module_info_base_updated_at();

-- 3. Supprimer la table
DROP TABLE IF EXISTS module_info_base;
```

---

### Seed Data (optionnel)

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- SEED: Données initiales pour module_info_base
-- Copie des données de src/lib/moduleInfoBase.js
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO module_info_base (module_id, organization_id, title, description, checklist, faq, required_documents, tips, contacts)
VALUES 
  (
    'appel-offre',
    NULL, -- Global (toutes organisations)
    'Appel d''offre',
    'Étape de soumission à un appel d''offre pour un projet photovoltaïque.',
    '["Vérifier l''éligibilité du site", "Préparer le dossier technique", "Calculer le tarif de vente", "Soumettre avant la date limite", "Attendre la notification"]'::jsonb,
    '[{"question": "Quel est le délai moyen de réponse ?", "answer": "2 à 3 mois après la clôture."}]'::jsonb,
    '["Plan de masse", "Étude de faisabilité", "Justificatif de propriété", "Attestation d''assurance", "K-bis"]'::jsonb,
    '["💡 Soumettez 48h avant la deadline", "💡 Un tarif trop bas peut être disqualifiant"]'::jsonb,
    '[{"role": "Responsable AO", "info": "ao@locasun.fr"}]'::jsonb
  ),
  (
    'pdb',
    NULL,
    'PDB - Promesse de Bail',
    'Signature de la promesse de bail avec le propriétaire.',
    '["Vérifier les informations du propriétaire", "Valider la durée du bail", "Confirmer le loyer", "Faire relire par le juridique", "Envoyer pour signature", "Archiver"]'::jsonb,
    '[{"question": "Quelle durée standard ?", "answer": "20 à 30 ans."}, {"question": "Le propriétaire peut-il résilier ?", "answer": "Non, sauf manquement grave."}]'::jsonb,
    '["Pièce d''identité", "Titre de propriété", "RIB", "Plan cadastral"]'::jsonb,
    '["💡 Vérifiez le propriétaire légal", "💡 En indivision, tous doivent signer"]'::jsonb,
    '[{"role": "Service juridique", "info": "juridique@locasun.fr"}]'::jsonb
  )
ON CONFLICT (module_id, organization_id) DO NOTHING;
```

---

## 2. Logs IA / Historique des questions

### Besoin

Tracer les questions posées par les utilisateurs à l'IA pour :
- Améliorer les réponses
- Identifier les questions sans réponse
- Analytics

### Option A : Sans DB (Phase 1) ✅

- Logs console uniquement (`logV2()`)
- Pas de persistence

### Option B : Avec DB (Phase 2+)

**Table:** `ai_interaction_logs`

---

### Migration SQL : `ai_interaction_logs`

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION: Créer table ai_interaction_logs
-- Workflow V2 - Historique des interactions IA
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ai_interaction_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Contexte
  prospect_id UUID REFERENCES prospects(id) ON DELETE SET NULL,
  project_type TEXT,
  module_id TEXT,
  step_index INTEGER,
  
  -- Interaction
  user_query TEXT NOT NULL,
  ai_response_type TEXT,  -- 'answer', 'clarification', 'checklist', etc.
  ai_response TEXT,
  was_helpful BOOLEAN,    -- Feedback utilisateur (optionnel)
  
  -- Métadonnées
  user_id UUID REFERENCES auth.users(id),
  organization_id UUID REFERENCES organizations(id),
  session_id TEXT,        -- Pour grouper les interactions
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour analytics
CREATE INDEX IF NOT EXISTS idx_ai_logs_module_id ON ai_interaction_logs(module_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_response_type ON ai_interaction_logs(ai_response_type);
CREATE INDEX IF NOT EXISTS idx_ai_logs_created_at ON ai_interaction_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_logs_was_helpful ON ai_interaction_logs(was_helpful);

-- RLS
ALTER TABLE ai_interaction_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_logs_insert_policy" ON ai_interaction_logs
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "ai_logs_select_policy" ON ai_interaction_logs
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE user_id = auth.uid() 
      AND role IN ('Global Admin', 'Manager')
    )
  );
```

### Rollback SQL

```sql
DROP POLICY IF EXISTS "ai_logs_insert_policy" ON ai_interaction_logs;
DROP POLICY IF EXISTS "ai_logs_select_policy" ON ai_interaction_logs;
DROP TABLE IF EXISTS ai_interaction_logs;
```

---

## 3. Résumé des migrations

| Table | Priorité | Phase | Impact | Risque |
|-------|----------|-------|--------|--------|
| `module_info_base` | 🔴 Haute | 2 | Mémoire IA enrichissable | Faible |
| `ai_interaction_logs` | 🟡 Moyenne | 2+ | Analytics + amélioration IA | Aucun |

---

## 4. Instructions d'exécution pour Jack

### Prérequis

1. Accès au Supabase Dashboard
2. Être en environnement de **staging** d'abord (si disponible)

### Étapes

1. **Backup** : Faire un backup de la base avant migration
   ```
   Supabase Dashboard > Settings > Database > Backups
   ```

2. **Exécuter la migration** :
   ```
   Supabase Dashboard > SQL Editor > New Query
   Coller le SQL > Run
   ```

3. **Vérifier** :
   ```sql
   SELECT * FROM module_info_base LIMIT 5;
   ```

4. **Tester le hook** :
   - Modifier `useWorkflowV2.js` pour charger depuis Supabase
   - Tester sur un prospect

### Ordre d'exécution

```
1. module_info_base (table + RLS + trigger)
2. Seed data (optionnel)
3. ai_interaction_logs (peut attendre)
```

---

## 5. Impact sur le code

### Fichiers à modifier après migration

| Fichier | Modification |
|---------|--------------|
| `src/lib/moduleInfoBase.js` | Ajouter fallback sur données locales si DB vide |
| `src/hooks/useWorkflowV2.js` | Charger depuis Supabase au lieu de JSON local |
| `src/lib/aiStubModule.js` | Logger les interactions dans `ai_interaction_logs` |

### Exemple de hook modifié

```javascript
// src/hooks/useModuleInfoBase.js (nouveau fichier)
import { supabase } from '@/lib/supabase';
import { MODULE_INFO_BASE } from '@/lib/moduleInfoBase'; // Fallback

export function useModuleInfoBase(moduleId) {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInfo() {
      const { data, error } = await supabase
        .from('module_info_base')
        .select('*')
        .eq('module_id', moduleId)
        .eq('is_active', true)
        .single();

      if (data) {
        setInfo(data);
      } else {
        // Fallback sur données locales
        setInfo(MODULE_INFO_BASE[moduleId] || null);
      }
      setLoading(false);
    }

    fetchInfo();
  }, [moduleId]);

  return { info, loading };
}
```

---

## 6. Checklist avant exécution

- [ ] Backup de la base effectué
- [ ] Migration testée en staging (si dispo)
- [ ] Code de fallback prêt (`MODULE_INFO_BASE` local)
- [ ] RLS policies validées
- [ ] Hook de chargement prêt
- [ ] Tests manuels planifiés

---

## 7. Notes

- **pgvector** : La colonne `ai_embeddings VECTOR(1536)` nécessite l'extension `pgvector`. Si pas installée, commenter cette colonne.
- **Multi-tenant** : `organization_id` permet d'avoir des bases différentes par organisation.
- **Versioning** : Le trigger incrémente `version` à chaque update pour audit.
