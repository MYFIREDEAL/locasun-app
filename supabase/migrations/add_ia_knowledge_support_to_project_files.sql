-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION: Support documents IA Knowledge dans project_files
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- UX-4: Permet d'uploader des documents de connaissance IA par étape
-- Ces documents sont globaux (prospect_id = NULL) et identifiés par field_label
--
-- À exécuter dans Supabase Dashboard > SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- 1️⃣ Rendre prospect_id nullable (si pas déjà fait)
-- Les documents IA n'ont pas de prospect associé
ALTER TABLE public.project_files 
ALTER COLUMN prospect_id DROP NOT NULL;

-- 2️⃣ Ajouter organization_id si n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'project_files' 
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.project_files 
    ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Colonne organization_id ajoutée à project_files';
  ELSE
    RAISE NOTICE 'Colonne organization_id existe déjà';
  END IF;
END $$;

-- 3️⃣ Ajouter field_label si n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'project_files' 
    AND column_name = 'field_label'
  ) THEN
    ALTER TABLE public.project_files 
    ADD COLUMN field_label TEXT;
    
    RAISE NOTICE 'Colonne field_label ajoutée à project_files';
  ELSE
    RAISE NOTICE 'Colonne field_label existe déjà';
  END IF;
END $$;

-- 4️⃣ Index pour requêtes IA knowledge (documents sans prospect)
CREATE INDEX IF NOT EXISTS idx_project_files_ia_knowledge 
ON public.project_files (organization_id, field_label) 
WHERE prospect_id IS NULL;

-- 5️⃣ Index pour field_label pattern matching
CREATE INDEX IF NOT EXISTS idx_project_files_field_label 
ON public.project_files (field_label) 
WHERE field_label LIKE 'ia-knowledge:%';

-- 6️⃣ Vérification finale
DO $$
DECLARE
  v_prospect_nullable BOOLEAN;
  v_has_org_id BOOLEAN;
  v_has_field_label BOOLEAN;
BEGIN
  -- Check prospect_id nullable
  SELECT is_nullable = 'YES' INTO v_prospect_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public' 
  AND table_name = 'project_files' 
  AND column_name = 'prospect_id';
  
  -- Check organization_id exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'project_files' 
    AND column_name = 'organization_id'
  ) INTO v_has_org_id;
  
  -- Check field_label exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'project_files' 
    AND column_name = 'field_label'
  ) INTO v_has_field_label;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ MIGRATION IA KNOWLEDGE - RÉSUMÉ';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE 'prospect_id nullable: %', v_prospect_nullable;
  RAISE NOTICE 'organization_id existe: %', v_has_org_id;
  RAISE NOTICE 'field_label existe: %', v_has_field_label;
  
  IF v_prospect_nullable AND v_has_org_id AND v_has_field_label THEN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 Table project_files prête pour documents IA Knowledge!';
    RAISE NOTICE '';
    RAISE NOTICE 'Usage: INSERT INTO project_files (';
    RAISE NOTICE '  prospect_id,        -- NULL pour docs IA';
    RAISE NOTICE '  organization_id,    -- UUID de l''org';
    RAISE NOTICE '  field_label,        -- ia-knowledge:{projectType}:{moduleId}';
    RAISE NOTICE '  ...';
    RAISE NOTICE ')';
  ELSE
    RAISE EXCEPTION 'Migration incomplète - vérifiez les erreurs ci-dessus';
  END IF;
END $$;
