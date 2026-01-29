-- ═══════════════════════════════════════════════════════════════════════════
-- WORKFLOW V2 — Table workflow_module_templates
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- Stocke la configuration IA par module pour Workflow V2
-- Clé unique : (org_id, project_type, module_id)
-- 
-- PROMPT 9 — Persistance DB Configuration
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.workflow_module_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_type text NOT NULL,
  module_id text NOT NULL,
  config_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Contrainte d'unicité : une seule config par (org, project_type, module)
  CONSTRAINT workflow_module_templates_unique_key 
    UNIQUE (org_id, project_type, module_id)
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_workflow_module_templates_org_project 
  ON public.workflow_module_templates(org_id, project_type);

CREATE INDEX IF NOT EXISTS idx_workflow_module_templates_module 
  ON public.workflow_module_templates(module_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGER AUTO-UPDATE updated_at
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_workflow_module_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_workflow_module_templates_updated_at 
  ON public.workflow_module_templates;

CREATE TRIGGER trigger_workflow_module_templates_updated_at
  BEFORE UPDATE ON public.workflow_module_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_workflow_module_templates_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS POLICIES
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.workflow_module_templates ENABLE ROW LEVEL SECURITY;

-- Policy SELECT : Admins de l'org peuvent lire
DROP POLICY IF EXISTS "workflow_module_templates_select_policy" 
  ON public.workflow_module_templates;

CREATE POLICY "workflow_module_templates_select_policy"
  ON public.workflow_module_templates
  FOR SELECT
  USING (
    org_id IN (
      SELECT organization_id FROM public.users 
      WHERE user_id = auth.uid()
    )
  );

-- Policy INSERT : Admins de l'org peuvent insérer
DROP POLICY IF EXISTS "workflow_module_templates_insert_policy" 
  ON public.workflow_module_templates;

CREATE POLICY "workflow_module_templates_insert_policy"
  ON public.workflow_module_templates
  FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT organization_id FROM public.users 
      WHERE user_id = auth.uid()
    )
  );

-- Policy UPDATE : Admins de l'org peuvent modifier
DROP POLICY IF EXISTS "workflow_module_templates_update_policy" 
  ON public.workflow_module_templates;

CREATE POLICY "workflow_module_templates_update_policy"
  ON public.workflow_module_templates
  FOR UPDATE
  USING (
    org_id IN (
      SELECT organization_id FROM public.users 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT organization_id FROM public.users 
      WHERE user_id = auth.uid()
    )
  );

-- Policy DELETE : Admins de l'org peuvent supprimer
DROP POLICY IF EXISTS "workflow_module_templates_delete_policy" 
  ON public.workflow_module_templates;

CREATE POLICY "workflow_module_templates_delete_policy"
  ON public.workflow_module_templates
  FOR DELETE
  USING (
    org_id IN (
      SELECT organization_id FROM public.users 
      WHERE user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- COMMENTAIRES
-- ─────────────────────────────────────────────────────────────────────────────

COMMENT ON TABLE public.workflow_module_templates IS 
  'Configuration IA par module pour Workflow V2 (PROMPT 9)';

COMMENT ON COLUMN public.workflow_module_templates.org_id IS 
  'UUID de l''organisation (multi-tenant)';

COMMENT ON COLUMN public.workflow_module_templates.project_type IS 
  'Type de projet (ACC, Centrale, PDB, etc.)';

COMMENT ON COLUMN public.workflow_module_templates.module_id IS 
  'ID du module (inscription, pdb, etude-technique, etc.)';

COMMENT ON COLUMN public.workflow_module_templates.config_json IS 
  'Configuration complète en JSON (moduleAIConfig + actionConfig)';

-- ═══════════════════════════════════════════════════════════════════════════
-- FIN MIGRATION
-- ═══════════════════════════════════════════════════════════════════════════
