-- =====================================================
-- 🔧 MULTI-TENANT: Ajouter organization_id à project_templates
-- =====================================================
-- Auteur : Dev VS Code (équipe EVATIME)
-- Date : 2026-01-20
-- Validation requise : ChatGPT (architecte) + Jack (PO)
-- =====================================================
-- OBJECTIF : Rendre project_templates multi-tenant pour que chaque
--            organization puisse avoir ses propres modèles de projets.
-- 
-- ⚠️ CE SCRIPT EST IDEMPOTENT (peut être exécuté plusieurs fois)
-- ⚠️ LES PROJETS EXISTANTS RESTENT ACCESSIBLES (nullable)
-- =====================================================

-- Étape 1 : Ajouter la colonne organization_id (nullable pour migration progressive)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'project_templates' 
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.project_templates 
    ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
    
    -- Index pour optimiser les requêtes filtrées par organization
    CREATE INDEX idx_project_templates_organization_id 
    ON public.project_templates(organization_id);
    
    RAISE NOTICE '✅ Colonne organization_id ajoutée à project_templates';
  ELSE
    RAISE NOTICE '⚠️ Colonne organization_id existe déjà sur project_templates - skip';
  END IF;
END $$;

-- =====================================================
-- 📋 COMMENTAIRE DE DOCUMENTATION
-- =====================================================
COMMENT ON COLUMN public.project_templates.organization_id IS 
'ID de l''organization propriétaire du modèle de projet.
NULL = Modèle global visible par toutes les organizations.
UUID = Modèle spécifique à une organization (filtré par RLS).';

-- =====================================================
-- 🔒 RLS POLICY : Permettre la lecture des templates globaux OU de son org
-- =====================================================
-- Note : Cette policy permet de voir :
-- 1. Les templates SANS organization_id (globaux = plateforme)
-- 2. Les templates de sa propre organization

-- Supprimer l'ancienne policy si elle existe
DROP POLICY IF EXISTS "project_templates_select_public_or_org" ON public.project_templates;

-- Créer la nouvelle policy
CREATE POLICY "project_templates_select_public_or_org"
  ON public.project_templates
  FOR SELECT
  USING (
    -- Templates globaux (sans organization_id)
    (organization_id IS NULL)
    OR
    -- Templates de mon organization (pour les admins)
    (organization_id = (
      SELECT organization_id FROM public.users WHERE user_id = auth.uid() LIMIT 1
    ))
    OR
    -- Templates de mon organization (pour les prospects/clients)
    (organization_id = (
      SELECT organization_id FROM public.prospects WHERE user_id = auth.uid() LIMIT 1
    ))
  );

COMMENT ON POLICY "project_templates_select_public_or_org" 
ON public.project_templates IS 
'Les utilisateurs peuvent voir les templates globaux (organization_id NULL) 
ou les templates de leur propre organization.';
