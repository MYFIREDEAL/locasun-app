-- =====================================================
-- FIX RLS : Admins bypass RLS, Clients gardent RLS
-- =====================================================
-- Contexte: Les admins utilisent des RPC SECURITY DEFINER qui gèrent les permissions
--           Les RLS causent des problèmes avec real-time pour les admins
--           Les clients doivent garder les RLS pour sécurité

-- =====================================================
-- PROSPECTS : Admins bypass, Clients protégés
-- =====================================================

-- 1. Supprimer les anciennes policies admin
DROP POLICY IF EXISTS "Users can view their own and authorized prospects" ON public.prospects;
DROP POLICY IF EXISTS "Users can insert prospects" ON public.prospects;
DROP POLICY IF EXISTS "Users can delete their own prospects" ON public.prospects;

-- 2. Policy ADMIN : Bypass complet pour Global Admin, Manager, Commercial
--    Ils utilisent les RPC (get_prospects_safe, update_prospect_safe) qui gèrent la sécurité
CREATE POLICY "Admin users bypass RLS for prospects"
  ON public.prospects
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE user_id = auth.uid() 
      AND role IN ('Global Admin', 'Manager', 'Commercial')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE user_id = auth.uid() 
      AND role IN ('Global Admin', 'Manager', 'Commercial')
    )
  );

-- 3. Policy CLIENT : SELECT + UPDATE uniquement leurs propres données
--    (Policies existantes conservées)
-- Déjà présent: "Clients can view their own data"
-- Déjà présent: "Clients can update their own data"

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Lister toutes les policies sur prospects
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'prospects'
ORDER BY policyname;

-- Tester si auth.uid() fonctionne
SELECT 
  auth.uid() as current_auth_uid,
  current_user as current_db_user;

COMMENT ON POLICY "Admin users bypass RLS for prospects" ON public.prospects IS 
'Admins (Global Admin, Manager, Commercial) ont accès complet. La sécurité est gérée par les RPC SECURITY DEFINER (get_prospects_safe, update_prospect_safe) qui implémentent le modèle PRO avec access_rights.';
