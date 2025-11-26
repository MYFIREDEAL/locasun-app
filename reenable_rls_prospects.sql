-- 🔐 RÉACTIVER RLS sur la table prospects
-- Restaure la sécurité Row Level Security

-- 1. Réactiver RLS
ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;

-- 2. Supprimer toutes les anciennes politiques (si elles existent)
DROP POLICY IF EXISTS "prospects_select_policy" ON public.prospects;
DROP POLICY IF EXISTS "prospects_insert_policy" ON public.prospects;
DROP POLICY IF EXISTS "prospects_update_policy" ON public.prospects;
DROP POLICY IF EXISTS "prospects_delete_policy" ON public.prospects;

-- 3. Politique SELECT : Lecture des prospects
-- Global Admin : voir TOUS les prospects
-- Manager : voir ses prospects + ceux de son équipe (via access_rights.users)
-- Commercial : voir UNIQUEMENT ses prospects
CREATE POLICY "prospects_select_policy" ON public.prospects
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.user_id = auth.uid()
    AND (
      -- Global Admin voit tout
      users.role = 'Global Admin'
      -- Manager/Commercial voit ses prospects
      OR prospects.owner_id = users.user_id
      -- Manager voit les prospects de son équipe
      OR (
        users.role = 'Manager' 
        AND prospects.owner_id = ANY(
          SELECT jsonb_array_elements_text(users.access_rights->'users')::uuid
        )
      )
    )
  )
);

-- 4. Politique INSERT : Création de prospects
-- Tous les utilisateurs authentifiés peuvent créer des prospects
CREATE POLICY "prospects_insert_policy" ON public.prospects
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.user_id = auth.uid()
  )
);

-- 5. Politique UPDATE : Modification de prospects
-- Global Admin : modifier TOUS les prospects
-- Manager : modifier ses prospects + ceux de son équipe
-- Commercial : modifier UNIQUEMENT ses prospects
CREATE POLICY "prospects_update_policy" ON public.prospects
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.user_id = auth.uid()
    AND (
      -- Global Admin modifie tout
      users.role = 'Global Admin'
      -- Manager/Commercial modifie ses prospects
      OR prospects.owner_id = users.user_id
      -- Manager modifie les prospects de son équipe
      OR (
        users.role = 'Manager' 
        AND prospects.owner_id = ANY(
          SELECT jsonb_array_elements_text(users.access_rights->'users')::uuid
        )
      )
    )
  )
);

-- 6. Politique DELETE : Suppression de prospects
-- Global Admin : supprimer TOUS les prospects
-- Manager : supprimer ses prospects + ceux de son équipe
-- Commercial : supprimer UNIQUEMENT ses prospects
CREATE POLICY "prospects_delete_policy" ON public.prospects
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.user_id = auth.uid()
    AND (
      -- Global Admin supprime tout
      users.role = 'Global Admin'
      -- Manager/Commercial supprime ses prospects
      OR prospects.owner_id = users.user_id
      -- Manager supprime les prospects de son équipe
      OR (
        users.role = 'Manager' 
        AND prospects.owner_id = ANY(
          SELECT jsonb_array_elements_text(users.access_rights->'users')::uuid
        )
      )
    )
  )
);

-- 7. Vérification : Afficher les politiques actives
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'prospects'
ORDER BY policyname;

-- ✅ Résultat attendu : 4 politiques actives
-- prospects_select_policy
-- prospects_insert_policy
-- prospects_update_policy
-- prospects_delete_policy

-- ℹ️ Notes importantes :
-- - Les RPC functions (get_prospects_safe, update_prospect_safe) CONTOURNENT le RLS
-- - Elles utilisent SECURITY DEFINER pour exécuter avec les permissions du créateur
-- - Le real-time devrait continuer de fonctionner car il utilise les RPC
-- - Si auth.uid() retourne NULL, les RPC resteront fonctionnels
