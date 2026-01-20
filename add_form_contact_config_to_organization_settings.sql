-- =====================================================
-- 🔧 PHASE 2 - ÉTAPE 2 : PRÉPARATION MIGRATION form_contact_config
-- =====================================================
-- Auteur : Dev VS Code (équipe EVATIME)
-- Date : 2026-01-20
-- Validation requise : ChatGPT (architecte) + Jack (PO)
-- =====================================================
-- OBJECTIF : Ajouter la colonne form_contact_config dans organization_settings
--            pour préparer la future migration multi-tenant.
-- 
-- ⚠️ CE SCRIPT NE MIGRE AUCUNE DONNÉE
-- ⚠️ CE SCRIPT N'IMPACTE AUCUN COMPORTEMENT EXISTANT
-- ⚠️ LA SOURCE DE VÉRITÉ RESTE company_settings.settings.form_contact_config
-- =====================================================

-- Vérifier que la colonne n'existe pas déjà avant ajout
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'organization_settings' 
    AND column_name = 'form_contact_config'
  ) THEN
    -- Ajouter la colonne (nullable, pas de valeur par défaut)
    ALTER TABLE public.organization_settings 
    ADD COLUMN form_contact_config JSONB DEFAULT NULL;
    
    RAISE NOTICE '✅ Colonne form_contact_config ajoutée à organization_settings';
  ELSE
    RAISE NOTICE '⚠️ Colonne form_contact_config existe déjà - skip';
  END IF;
END $$;

-- =====================================================
-- 📋 COMMENTAIRE DE DOCUMENTATION
-- =====================================================
COMMENT ON COLUMN public.organization_settings.form_contact_config IS 
'Configuration du formulaire de contact public (champs dynamiques).
Structure attendue: [{id, name, type, placeholder, required}, ...]
⚠️ NON UTILISÉ ACTUELLEMENT - Préparation migration depuis company_settings.settings.form_contact_config';
