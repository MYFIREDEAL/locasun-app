-- =====================================================
-- 🔒 RLS MULTI-TENANT - ORGANIZATION_SETTINGS (company_settings)
-- =====================================================
-- Phase 2 : Mise en conformité de la table company_settings
-- Auteur : Dev VS Code (équipe EVATIME)
-- Date : 2026-01-19
-- Validation requise : ChatGPT + Jack (PO)
-- =====================================================

-- =====================================================
-- ÉTAPE 1 : AJOUTER LA COLONNE organization_id
-- =====================================================

-- Vérifier que la colonne n'existe pas déjà
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'company_settings' 
    AND column_name = 'organization_id'
  ) THEN
    -- Ajouter la colonne (NOT NULL nécessaire pour multi-tenant)
    ALTER TABLE public.company_settings 
    ADD COLUMN organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE;
    
    -- Créer un index pour optimiser les requêtes filtrées
    CREATE INDEX idx_company_settings_organization_id 
    ON public.company_settings(organization_id);
    
    RAISE NOTICE '✅ Colonne organization_id ajoutée avec succès';
  ELSE
    RAISE NOTICE '⚠️  Colonne organization_id existe déjà - skip';
  END IF;
END $$;

-- =====================================================
-- ÉTAPE 2 : DROP POLICIES EXISTANTES
-- =====================================================

-- Supprimer l'ancienne policy Global Admin (non multi-tenant)
DROP POLICY IF EXISTS "Global Admin can manage company settings" ON public.company_settings;

RAISE NOTICE '🗑️  Anciennes policies supprimées';

-- =====================================================
-- ÉTAPE 3 : RLS DÉJÀ ACTIVÉ (vérification)
-- =====================================================

-- RLS déjà activé à la ligne 841 de schema.sql
-- ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
-- (pas besoin de ré-exécuter)

-- =====================================================
-- ÉTAPE 4 : CRÉER NOUVELLES POLICIES MULTI-TENANT
-- =====================================================

-- -----------------------------------------------------
-- 🔐 POLICY SELECT : Lecture des settings de l'org
-- -----------------------------------------------------

CREATE POLICY "company_settings_select_org_or_platform_admin"
  ON public.company_settings
  FOR SELECT
  USING (
    -- Utilisateur authentifié ET (son org OU platform_admin)
    (auth.uid() IS NOT NULL)
    AND (
      -- Settings de mon organisation
      (organization_id = (auth.jwt()->>'organization_id')::uuid)
      OR
      -- OU je suis platform_admin (organization_id = NULL dans JWT)
      ((auth.jwt()->>'role') = 'platform_admin')
    )
  );

COMMENT ON POLICY "company_settings_select_org_or_platform_admin" 
ON public.company_settings IS 
'Lecture des company_settings de sa propre organisation uniquement. Platform admins peuvent tout lire.';

-- -----------------------------------------------------
-- ✏️ POLICY UPDATE : Modification par admin/manager
-- -----------------------------------------------------

CREATE POLICY "company_settings_update_admin_manager"
  ON public.company_settings
  FOR UPDATE
  USING (
    -- Utilisateur authentifié
    (auth.uid() IS NOT NULL)
    AND
    -- Settings de mon organisation
    (organization_id = (auth.jwt()->>'organization_id')::uuid)
    AND (
      -- ET je suis admin OU manager
      EXISTS (
        SELECT 1 FROM public.users
        WHERE user_id = auth.uid()
        AND role IN ('Global Admin', 'Manager')
        AND organization_id = (auth.jwt()->>'organization_id')::uuid
      )
      OR
      -- OU je suis platform_admin
      ((auth.jwt()->>'role') = 'platform_admin')
    )
  );

COMMENT ON POLICY "company_settings_update_admin_manager" 
ON public.company_settings IS 
'Seuls les Global Admin et Manager peuvent modifier les company_settings de leur organisation.';

-- -----------------------------------------------------
-- ➕ POLICY INSERT : Interdit via PostgREST
-- -----------------------------------------------------

-- ❌ AUCUNE policy INSERT
-- Les company_settings doivent être créés UNIQUEMENT via :
-- - Edge Functions (service_role_key)
-- - Scripts d'initialisation organisation

-- Si besoin futur : utiliser une policy avec EXISTS sur service_role
-- Mais pour l'instant : INSERT bloqué pour tous les users

COMMENT ON TABLE public.company_settings IS 
'Settings de branding par organisation. INSERT via Edge Functions uniquement.';

-- -----------------------------------------------------
-- 🗑️ POLICY DELETE : Interdit (sauf platform_admin)
-- -----------------------------------------------------

CREATE POLICY "company_settings_delete_platform_admin_only"
  ON public.company_settings
  FOR DELETE
  USING (
    -- Seul platform_admin peut supprimer
    ((auth.jwt()->>'role') = 'platform_admin')
  );

COMMENT ON POLICY "company_settings_delete_platform_admin_only" 
ON public.company_settings IS 
'Suppression réservée aux platform admins uniquement.';

-- =====================================================
-- ✅ RÉCAPITULATIF POLICIES CRÉÉES
-- =====================================================

-- SELECT : ✅ Lecture si organization_id match OU platform_admin
-- UPDATE : ✅ Modification si admin/manager de l'org (ou platform_admin)
-- INSERT : ❌ Bloqué (Edge Functions uniquement)
-- DELETE : ✅ Platform admin uniquement

RAISE NOTICE '✅ RLS multi-tenant configuré sur company_settings';

-- =====================================================
-- 🧪 CHECKLIST DE TESTS (à exécuter après ce script)
-- =====================================================

-- TEST 1 : Admin de l'org A peut lire ses settings
-- Connecté comme admin org A :
-- SELECT * FROM company_settings WHERE organization_id = '<org_a_uuid>';
-- ✅ Attendu : Retourne les settings de org A uniquement

-- TEST 2 : Admin de l'org A NE PEUT PAS lire org B
-- Connecté comme admin org A :
-- SELECT * FROM company_settings WHERE organization_id = '<org_b_uuid>';
-- ❌ Attendu : Aucune ligne (bloqué par RLS)

-- TEST 3 : Client de l'org A peut lire (lecture seule)
-- Connecté comme client org A :
-- SELECT * FROM company_settings WHERE organization_id = '<org_a_uuid>';
-- ✅ Attendu : Retourne les settings (pour affichage logo/branding)

-- TEST 4 : Commercial NE PEUT PAS modifier les settings
-- Connecté comme commercial org A :
-- UPDATE company_settings SET company_name = 'Hack' WHERE organization_id = '<org_a_uuid>';
-- ❌ Attendu : Erreur permission denied (seul admin/manager)

-- TEST 5 : Manager PEUT modifier les settings de son org
-- Connecté comme manager org A :
-- UPDATE company_settings SET logo_url = 'new-logo.png' WHERE organization_id = '<org_a_uuid>';
-- ✅ Attendu : Succès

-- TEST 6 : Platform admin peut tout lire/modifier/supprimer
-- Connecté comme platform_admin :
-- SELECT * FROM company_settings; -- Toutes les orgs
-- UPDATE company_settings SET ... WHERE organization_id = '<any_org>';
-- DELETE FROM company_settings WHERE organization_id = '<any_org>';
-- ✅ Attendu : Succès pour toutes les opérations

-- TEST 7 : INSERT direct est bloqué
-- Connecté comme n'importe quel user :
-- INSERT INTO company_settings (organization_id, company_name) VALUES ('<org_uuid>', 'Test');
-- ❌ Attendu : Erreur permission denied (pas de policy INSERT)

-- =====================================================
-- 🚨 NOTES IMPORTANTES
-- =====================================================

-- 1. MIGRATION DONNÉES EXISTANTES
--    Si des rows existent sans organization_id, il faudra :
--    - Les assigner à une org par défaut
--    - OU les supprimer avant d'exécuter ce script
--    Commande diagnostic :
--    SELECT id, company_name, organization_id FROM company_settings WHERE organization_id IS NULL;

-- 2. HOOK FRONTEND (useSupabaseCompanySettings.js)
--    ⚠️ ACTUELLEMENT UTILISE UN SINGLETON (ID fixe)
--    Après ce script, le hook DEVRA :
--    - Filtrer par organization_id de activeAdminUser
--    - Retirer le filtre .eq('id', COMPANY_SETTINGS_ID)
--    Exemple :
--    .select('*')
--    .eq('organization_id', activeAdminUser.organization_id)
--    .single()

-- 3. EDGE FUNCTIONS
--    Les Edge Functions qui créent des orgs devront aussi créer
--    une ligne company_settings avec :
--    - organization_id : UUID de la nouvelle org
--    - Valeurs par défaut (logo, nom, etc.)

-- 4. RLS vs SERVICE_ROLE_KEY
--    Ces policies s'appliquent uniquement avec anon/authenticated keys.
--    Les Edge Functions avec service_role_key bypassent RLS.

-- =====================================================
-- FIN DU SCRIPT
-- =====================================================
