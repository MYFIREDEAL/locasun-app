-- =====================================================
-- FIX RLS MULTI-TENANT STRICT — PARTNERS & MISSIONS
-- =====================================================
-- Date: 23 janvier 2026
-- Objectif: Verrouiller RLS pour empêcher tout cross-tenant
--
-- AVANT: Les policies admin ne filtraient pas par organization_id
-- APRÈS: Chaque admin ne voit que les partenaires/missions de SON tenant
-- =====================================================

-- =====================================================
-- ÉTAPE 1: SUPPRIMER LES ANCIENNES POLICIES (partners)
-- =====================================================

DROP POLICY IF EXISTS "Admins can view all partners in their org" ON public.partners;
DROP POLICY IF EXISTS "Admins can insert partners" ON public.partners;
DROP POLICY IF EXISTS "Admins can update all partners in their org" ON public.partners;
DROP POLICY IF EXISTS "Admins can delete partners" ON public.partners;

-- =====================================================
-- ÉTAPE 2: NOUVELLES POLICIES MULTI-TENANT (partners)
-- =====================================================

-- Policy: Admins voient uniquement les partenaires de LEUR organisation
CREATE POLICY "Admins can view partners in their own org only"
  ON public.partners
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
      AND users.role IN ('Global Admin', 'Manager')
      AND users.organization_id = partners.organization_id
    )
  );

-- Policy: Admins créent des partenaires uniquement dans LEUR organisation
CREATE POLICY "Admins can insert partners in their own org only"
  ON public.partners
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
      AND users.role IN ('Global Admin', 'Manager')
      AND users.organization_id = partners.organization_id
    )
  );

-- Policy: Admins modifient les partenaires uniquement dans LEUR organisation
CREATE POLICY "Admins can update partners in their own org only"
  ON public.partners
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
      AND users.role IN ('Global Admin', 'Manager')
      AND users.organization_id = partners.organization_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
      AND users.role IN ('Global Admin', 'Manager')
      AND users.organization_id = partners.organization_id
    )
  );

-- Policy: Admins suppriment les partenaires uniquement dans LEUR organisation
CREATE POLICY "Admins can delete partners in their own org only"
  ON public.partners
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
      AND users.role IN ('Global Admin', 'Manager')
      AND users.organization_id = partners.organization_id
    )
  );

-- =====================================================
-- ÉTAPE 3: SUPPRIMER LES ANCIENNES POLICIES (missions)
-- =====================================================

DROP POLICY IF EXISTS "Admins can view all missions in their org" ON public.missions;
DROP POLICY IF EXISTS "Admins can insert missions" ON public.missions;
DROP POLICY IF EXISTS "Admins can update all missions" ON public.missions;
DROP POLICY IF EXISTS "Admins can delete missions" ON public.missions;

-- =====================================================
-- ÉTAPE 4: NOUVELLES POLICIES MULTI-TENANT (missions)
-- =====================================================

-- Policy: Admins voient uniquement les missions de LEUR organisation
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

-- Policy: Admins créent des missions uniquement dans LEUR organisation
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

-- Policy: Admins modifient les missions uniquement dans LEUR organisation
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

-- Policy: Admins suppriment les missions uniquement dans LEUR organisation
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

-- =====================================================
-- VÉRIFICATION: Les policies partenaires restent intactes
-- =====================================================
-- ✅ "Partners can view own profile" : user_id = auth.uid() (OK)
-- ✅ "Partners can update own profile" : user_id = auth.uid() (OK)
-- ✅ "Partners can view their own missions" : via partner_id → user_id (OK)
-- ✅ "Partners can update their missions status and notes" : via partner_id → user_id (OK)

-- =====================================================
-- RÉSUMÉ RLS FINAL
-- =====================================================
-- 
-- TABLE: partners
-- ├── Partner : voit/modifie uniquement SON profil
-- └── Admin : voit/modifie uniquement les partners de SON organization_id
--
-- TABLE: missions
-- ├── Partner : voit/modifie uniquement SES missions (via partner_id)
-- └── Admin : voit/modifie uniquement les missions de SON organization_id
--
-- ISOLATION GARANTIE:
-- ✅ Partner A ne peut pas voir Partner B
-- ✅ Partner A ne peut pas voir missions de Partner B
-- ✅ Admin Org1 ne peut pas voir partners/missions de Org2
-- ✅ Aucun accès aux prospects depuis partners (pas de policy)
-- =====================================================
