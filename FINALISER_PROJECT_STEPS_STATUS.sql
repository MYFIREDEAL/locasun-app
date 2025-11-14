-- =====================================================
-- FINALISER project_steps_status POUR SUPABASE
-- =====================================================
-- Date: 14 novembre 2025
-- Objectif: Activer real-time + RLS policies

-- =====================================================
-- 1. ACTIVER LE REAL-TIME
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE project_steps_status;

-- =====================================================
-- 2. RLS POLICIES
-- =====================================================

-- Policy pour les Admins (peuvent tout voir et modifier)
CREATE POLICY "Admins can manage all project steps"
  ON public.project_steps_status
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
      AND users.role IN ('Global Admin', 'Manager', 'Commercial')
    )
  );

-- Policy pour les Clients (peuvent voir UNIQUEMENT leurs propres steps)
CREATE POLICY "Clients can view their own project steps"
  ON public.project_steps_status
  FOR SELECT
  USING (
    prospect_id IN (
      SELECT id FROM public.prospects
      WHERE prospects.user_id = auth.uid()
    )
  );

-- Policy pour les Clients (peuvent modifier UNIQUEMENT leurs propres steps)
CREATE POLICY "Clients can update their own project steps"
  ON public.project_steps_status
  FOR UPDATE
  USING (
    prospect_id IN (
      SELECT id FROM public.prospects
      WHERE prospects.user_id = auth.uid()
    )
  );

-- =====================================================
-- 3. VÉRIFICATION
-- =====================================================
SELECT 'Real-time activé ✅' as status
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' 
  AND tablename = 'project_steps_status';

SELECT policyname, cmd FROM pg_policies WHERE tablename = 'project_steps_status';
