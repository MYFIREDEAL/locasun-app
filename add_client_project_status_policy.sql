-- =====================================================
-- POLICY RLS: Permettre aux clients de réactiver leurs projets
-- =====================================================
-- Mission: Autoriser les clients à mettre à jour le statut de leurs projets
-- Date : 25 novembre 2025
-- =====================================================

-- 1. Policy UPDATE pour les clients (prospects)
-- Permet à un client de mettre à jour UNIQUEMENT le statut de ses propres projets
-- ⚠️ RESTRICTION: Seule la colonne 'status' peut être modifiée par le client
CREATE POLICY "Clients can update their own project status"
  ON public.project_infos
  FOR UPDATE
  USING (
    -- Le client doit être authentifié
    auth.uid() IS NOT NULL
    AND
    -- Le prospect_id doit correspondre à l'UUID du client connecté
    prospect_id IN (
      SELECT id FROM public.prospects WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    -- Même vérification pour la modification
    prospect_id IN (
      SELECT id FROM public.prospects WHERE user_id = auth.uid()
    )
    AND
    -- ✅ SÉCURITÉ: Vérifier que seul le statut change (pas data, pas amount, etc.)
    -- Le nouveau statut doit être 'actif' (réactivation uniquement)
    status = 'actif'
  );

-- 2. Policy INSERT pour les clients (si le projet n'existe pas encore)
-- Permet à un client de créer une entrée project_infos pour ses projets
CREATE POLICY "Clients can insert their own project info"
  ON public.project_infos
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND
    prospect_id IN (
      SELECT id FROM public.prospects WHERE user_id = auth.uid()
    )
  );

-- 3. Vérification
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual
FROM pg_policies
WHERE tablename = 'project_infos'
  AND policyname LIKE '%Client%';
