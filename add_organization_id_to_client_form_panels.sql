-- ═══════════════════════════════════════════════════════════════
-- 🔥 AJOUT ORGANIZATION_ID À CLIENT_FORM_PANELS (MULTI-TENANT)
-- ═══════════════════════════════════════════════════════════════
-- Date: 18 février 2026
-- Problème: client_form_panels n'a pas de colonne organization_id
--          → Real-time filter par organization_id impossible
--          → Tâches de vérification ne se créent pas sur nouvelles orgs
-- Solution: Ajouter organization_id + trigger auto-fill + RLS policies
-- ═══════════════════════════════════════════════════════════════

-- 1️⃣ AJOUTER LA COLONNE organization_id
ALTER TABLE public.client_form_panels
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 2️⃣ REMPLIR LES DONNÉES EXISTANTES (backfill)
UPDATE public.client_form_panels cfp
SET organization_id = p.organization_id
FROM public.prospects p
WHERE cfp.prospect_id = p.id
  AND cfp.organization_id IS NULL;

-- 3️⃣ RENDRE LA COLONNE NOT NULL (après backfill)
ALTER TABLE public.client_form_panels
ALTER COLUMN organization_id SET NOT NULL;

-- 4️⃣ AJOUTER INDEX pour performance
CREATE INDEX IF NOT EXISTS idx_client_form_panels_organization_id 
ON public.client_form_panels(organization_id);

-- 5️⃣ TRIGGER AUTO-FILL organization_id depuis prospects
-- Déclenché AVANT INSERT pour auto-remplir organization_id
CREATE OR REPLACE FUNCTION auto_fill_client_form_panels_organization_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Récupérer organization_id depuis prospects
  SELECT organization_id INTO NEW.organization_id
  FROM public.prospects
  WHERE id = NEW.prospect_id;

  -- Si pas trouvé, erreur (ne devrait jamais arriver avec FK)
  IF NEW.organization_id IS NULL THEN
    RAISE EXCEPTION 'Cannot find organization_id for prospect_id %', NEW.prospect_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_fill_client_form_panels_organization_id ON public.client_form_panels;
CREATE TRIGGER trigger_auto_fill_client_form_panels_organization_id
  BEFORE INSERT ON public.client_form_panels
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_client_form_panels_organization_id();

-- 6️⃣ METTRE À JOUR LES RLS POLICIES (MULTI-TENANT)
-- Supprimer les anciennes policies
DROP POLICY IF EXISTS "admin_all_client_form_panels" ON public.client_form_panels;
DROP POLICY IF EXISTS "client_select_own_form_panels" ON public.client_form_panels;
DROP POLICY IF EXISTS "client_update_own_form_panels" ON public.client_form_panels;

-- ✅ ADMIN: Peut tout voir/modifier dans SON organisation
CREATE POLICY "admin_all_client_form_panels_multi_tenant"
ON public.client_form_panels
FOR ALL
TO authenticated
USING (
    -- Vérifier que l'admin appartient à la même org que le form panel
    organization_id IN (
        SELECT organization_id 
        FROM public.users 
        WHERE user_id = auth.uid() 
          AND role IN ('Global Admin', 'Manager', 'Commercial')
    )
);

-- ✅ CLIENT: Peut lire SES propres formulaires (même org via prospect_id)
CREATE POLICY "client_select_own_form_panels_multi_tenant"
ON public.client_form_panels
FOR SELECT
TO authenticated
USING (
    prospect_id IN (
        SELECT id 
        FROM public.prospects 
        WHERE user_id = auth.uid()
          AND organization_id = client_form_panels.organization_id  -- Double check org
    )
);

-- ✅ CLIENT: Peut modifier le statut de SES formulaires (soumission)
CREATE POLICY "client_update_own_form_panels_multi_tenant"
ON public.client_form_panels
FOR UPDATE
TO authenticated
USING (
    prospect_id IN (
        SELECT id 
        FROM public.prospects 
        WHERE user_id = auth.uid()
          AND organization_id = client_form_panels.organization_id
    )
)
WITH CHECK (
    prospect_id IN (
        SELECT id 
        FROM public.prospects 
        WHERE user_id = auth.uid()
          AND organization_id = client_form_panels.organization_id
    )
);

-- 7️⃣ VÉRIFICATION
DO $$
DECLARE
  col_exists BOOLEAN;
  trigger_exists BOOLEAN;
  policy_count INTEGER;
BEGIN
  -- Vérifier colonne
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'client_form_panels'
      AND column_name = 'organization_id'
  ) INTO col_exists;

  -- Vérifier trigger
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trigger_auto_fill_client_form_panels_organization_id'
  ) INTO trigger_exists;

  -- Compter policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'client_form_panels';

  RAISE NOTICE '✅ Colonne organization_id existe: %', col_exists;
  RAISE NOTICE '✅ Trigger auto-fill existe: %', trigger_exists;
  RAISE NOTICE '✅ Nombre de policies RLS: %', policy_count;
END $$;
